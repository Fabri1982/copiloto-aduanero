import * as path from 'path'
import * as fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    line = line.trim().replace(/\r/g, '')
    if (line && !line.startsWith('#')) {
      const eqIndex = line.indexOf('=')
      if (eqIndex > 0) {
        process.env[line.substring(0, eqIndex).trim()] = line.substring(eqIndex + 1).trim()
      }
    }
  })
}

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
const BASE_URL = 'https://copiloto-aduanero.vercel.app'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const C = { reset: '\x1b[0m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', gray: '\x1b[90m' }

function log(msg: string, color = '') { console.log(`${color}${C.bold}[E2E-PROD]${C.reset} ${color}${msg}${C.reset}`) }
function section(msg: string) { console.log(`\n${C.cyan}${'═'.repeat(60)}${C.reset}\n${C.cyan}${C.bold}  ${msg}${C.reset}\n${C.cyan}${'═'.repeat(60)}${C.reset}`) }

function createMinimalPDF(): Buffer {
  const c = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 300 >> stream
BT /F1 18 Tf 50 700 Td (FACTURA COMERCIAL) Tj /F1 12 Tf
50 660 Td (Numero de Factura: INV-2024-0042) Tj
50 640 Td (Fecha: 15 de Marzo 2024) Tj
50 600 Td (Proveedor: Shanghai Electronics Co. Ltd) Tj
50 580 Td (Consignatario: Importadora Chile SpA) Tj
50 560 Td (Incoterm: FOB Shanghai) Tj
50 540 Td (Moneda: USD) Tj
50 500 Td (ITEM | DESCRIPCION | CANT | PRECIO UNIT | TOTAL) Tj
50 480 Td (1 | Cable USB Tipo C 3.0 2m | 500 | 2.50 | 1250.00) Tj
50 460 Td (2 | Adaptador HDMI a VGA | 200 | 5.00 | 1000.00) Tj
50 440 Td (3 | Mouse Inalambrico Ergonomico | 300 | 8.00 | 2400.00) Tj
50 420 Td (4 | Teclado Mecanico RGB | 150 | 25.00 | 3750.00) Tj
50 380 Td (Peso Bruto: 85.5 kg) Tj
50 360 Td (Peso Neto: 78.2 kg) Tj
50 340 Td (Bultos: 12 cajas) Tj
50 300 Td (TOTAL: USD 8,400.00) Tj
ET endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref 0 6 0000000000 65535 f 0000000009 00000 n 0000000058 00000 n 0000000115 00000 n 0000000266 00000 n 0000000618 00000 n
trailer << /Size 6 /Root 1 0 R >> startxref 690 %%EOF`
  return Buffer.from(c)
}

async function cleanup(agencyId: string, caseId: string, documentId: string, extractionId: string | null, filePath: string) {
  log('Cleaning up test data...', C.gray)
  try {
    if (extractionId) await supabase.from('document_extractions').delete().eq('id', extractionId)
    await supabase.from('extracted_fields').delete().eq('case_id', caseId)
    await supabase.from('case_items').delete().eq('case_id', caseId)
    await supabase.from('tariff_classifications').delete().eq('case_id', caseId)
    await supabase.from('audit_events').delete().eq('case_id', caseId)
    await supabase.from('case_documents').delete().eq('id', documentId)
    await supabase.from('operation_cases').delete().eq('id', caseId)
    try { await supabase.storage.from('case-documents').remove([filePath]) } catch { /* */ }
    log('Cleanup complete', C.green)
  } catch (e) {
    log(`Cleanup error: ${e}`, C.yellow)
  }
}

async function runTest() {
  let caseId = '', documentId = '', agencyId = ''
  let extractionId: string | null = null, storagePath = ''
  let passed = 0, failed = 0
  const startTime = Date.now()

  try {
    section('E2E Production Test - copiloto-aduanero.vercel.app')
    log(`Started: ${new Date().toISOString()}`)
    log(`Target: ${BASE_URL}`)
    log(`Supabase: ${SUPABASE_URL}`)

    section('Step 1: Get or create test agency')
    const { data: existingAgency } = await supabase.from('agencies').select('id').limit(1).single()
    if (!existingAgency) {
      const { data: agency, error: agencyError } = await supabase.from('agencies').insert({ name: `Test Agency ${Date.now()}` }).select().single()
      if (agencyError) throw new Error(`Cannot create agency: ${agencyError.message}`)
      agencyId = agency.id
      log(`Created agency: ${agencyId}`, C.green)
    } else {
      agencyId = existingAgency.id
      log(`Using existing agency: ${agencyId}`, C.green)
    }
    passed++

    section('Step 2: Create test case')
    const { data: caseData, error: caseError } = await supabase.from('operation_cases').insert({
      agency_id: agencyId,
      status: 'draft',
      reference_code: `E2E-${Date.now()}`,
      client_name: 'Test Client',
    }).select().single()
    if (caseError) throw new Error(`Case error: ${caseError.message}`)
    caseId = caseData.id
    log(`Case ID: ${caseId}`, C.green)
    passed++

    section('Step 3: Upload test PDF to storage')
    const pdfBuffer = createMinimalPDF()
    storagePath = `${agencyId}/${caseId}/test-invoice-${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage.from('case-documents').upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })
    if (uploadError) throw new Error(`Upload error: ${uploadError.message}`)
    log(`Uploaded: ${uploadData.path} (${pdfBuffer.length} bytes)`, C.green)
    passed++

    section('Step 4: Create document record in DB')
    const { data: docData, error: docError } = await supabase.from('case_documents').insert({
      case_id: caseId,
      file_name: 'test-invoice.pdf',
      file_path: storagePath,
      document_type: 'unknown',
      version: 1,
    }).select().single()
    if (docError) throw new Error(`Doc error: ${docError.message}`)
    documentId = docData.id
    log(`Document ID: ${documentId}`, C.green)
    passed++

    section('Step 5: Call /api/documents/process (synchronous)')
    log('Sending request to production...', C.yellow)
    const apiStart = Date.now()
    const response = await fetch(`${BASE_URL}/api/documents/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        caseId,
        filePath: storagePath,
        fileName: 'test-invoice.pdf',
        mimeType: 'application/pdf',
        agencyId,
      }),
    })
    const apiDuration = Date.now() - apiStart
    log(`HTTP ${response.status} in ${(apiDuration / 1000).toFixed(1)}s`, response.ok ? C.green : C.red)
    const responseText = await response.text()
    let result: any
    try { result = JSON.parse(responseText) } catch { result = { raw: responseText } }

    if (responseText.length > 0) {
      console.log(`${C.gray}${JSON.stringify(result, null, 2).substring(0, 800)}${C.reset}\n`)
    }

    // If process fails, try process-direct as fallback
    if (!response.ok) {
      failed++
      log(`API error: ${result.error || result.details || result.raw}`, C.red)
      log('Falling back to process-direct for testing...', C.yellow)
      const fallbackResponse = await fetch(`${BASE_URL}/api/documents/process-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          caseId,
          filePath: storagePath,
          fileName: 'test-invoice.pdf',
          mimeType: 'application/pdf',
          agencyId,
        }),
      })
      const fallbackResult = await fallbackResponse.json()
      log(`Fallback HTTP ${fallbackResponse.status}`, fallbackResponse.ok ? C.green : C.red)
      console.log(`${C.gray}${JSON.stringify(fallbackResult, null, 2)}${C.reset}\n`)
      if (!fallbackResponse.ok) {
        log(`Fallback also failed: ${fallbackResult.error}`, C.red)
        failed++
      } else {
        passed++
        log(`Fallback succeeded: ${fallbackResult.documentType || 'unknown'}`, C.green)
      }
    } else {
      passed++
      log(`Inngest event sent: method=${result.method}`, C.green)
    }

    section('Step 6: Verify extraction results')
    // Since processing is now synchronous, results should be immediate
    log('Checking for extraction results...', C.yellow)
    let extraction: any = null

    // Try up to 3 times with 2s delay (for edge cases)
    for (let i = 0; i < 3; i++) {
      const { data: ext, error: extError } = await supabase
        .from('document_extractions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!extError && ext) {
        extraction = ext
        extractionId = ext.id
        const statusColor = ext.status === 'completed' ? C.green : ext.status === 'failed' ? C.red : C.yellow
        log(`Status: ${ext.status}`, statusColor)

        if (ext.status === 'completed' || ext.status === 'failed') break
      }

      if (i < 2) {
        log(`Waiting 2s before retry...`, C.gray)
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    if (!extraction) {
      failed++
      log('No extraction record found after 120s', C.red)
      log('Inngest function likely never executed', C.red)
    } else if (extraction.status === 'failed') {
      failed++
      log(`Extraction failed: ${extraction.error_message || extraction.raw_text}`, C.red)
      log('Check Inngest dashboard for full error logs', C.yellow)
    } else if (extraction.status === 'completed') {
      passed++
      log(`Extraction completed!`, C.green)
      log(`Raw text: ${(extraction.raw_text?.length || 0)} chars`, C.blue)
      if (extraction.extraction_json) {
        const json = typeof extraction.extraction_json === 'string' ? JSON.parse(extraction.extraction_json) : extraction.extraction_json
        log(`Doc type: ${json.document_type || 'unknown'}`, C.blue)
        log(`Fields: ${json.fields?.length || 0}, Items: ${json.items?.length || 0}`, C.blue)
        if (json.fields?.length > 0) {
          log('Sample fields:', C.blue)
          json.fields.slice(0, 5).forEach((f: any) => log(`  ${f.name}: ${f.value} (conf: ${f.confidence})`, C.gray))
        }
        if (json.items?.length > 0) {
          log('Items:', C.blue)
          json.items.forEach((item: any) => log(`  ${item.description} - Qty: ${item.quantity}, Price: ${item.unit_price}`, C.gray))
        }
      }
    } else {
      failed++
      log(`Extraction still in "${extraction.status}" after 120s`, C.yellow)
    }

    section('Step 7: Verify extracted fields in DB')
    const { data: fields, error: fieldsError } = await supabase.from('extracted_fields').select('*').eq('document_id', documentId)
    if (fieldsError) { log(`Fields error: ${fieldsError.message}`, C.red); failed++ }
    else {
      log(`Extracted fields: ${fields?.length || 0}`, fields?.length ? C.green : C.yellow)
      fields?.length ? passed++ : failed++
      fields?.slice(0, 5).forEach((f: any) => log(`  ${f.field_label}: ${f.extracted_value} (${f.confidence})`, C.gray))
    }

    section('Step 8: Verify case items in DB')
    const { data: items, error: itemsError } = await supabase.from('case_items').select('*').eq('source_document_id', documentId)
    if (itemsError) { log(`Items error: ${itemsError.message}`, C.red); failed++ }
    else {
      log(`Case items: ${items?.length || 0}`, items?.length ? C.green : C.yellow)
      items?.length ? passed++ : failed++
      items?.forEach((item: any) => log(`  ${item.description} | Qty: ${item.quantity} | Unit: ${item.unit_price} | Total: ${item.total_price}`, C.gray))
    }

    section('Step 9: Verify tariff classifications')
    const { data: tariffs, error: tariffError } = await supabase.from('tariff_classifications').select('*').eq('case_id', caseId)
    if (tariffError) { log(`Tariff error: ${tariffError.message}`, C.red); failed++ }
    else {
      log(`Tariff classifications: ${tariffs?.length || 0}`, tariffs?.length ? C.green : C.yellow)
      tariffs?.forEach((t: any) => log(`  ${t.original_description} -> HS: ${t.chile_hs_code_8} (conf: ${t.confidence})`, C.gray))
      tariffs?.length ? passed++ : failed++
    }

    section('Step 10: Audit events')
    const { data: audits, error: auditError } = await supabase.from('audit_events').select('*').eq('case_id', caseId).order('created_at', { ascending: false }).limit(10)
    if (auditError) { log(`Audit error: ${auditError.message}`, C.red); failed++ }
    else {
      log(`Audit events: ${audits?.length || 0}`, C.blue)
      audits?.forEach((a: any) => log(`  ${a.event_name} (${a.actor_type})`, C.gray))
      passed++
    }

    section('Step 11: Check case status')
    const { data: caseStatus, error: caseStatusError } = await supabase.from('operation_cases').select('status').eq('id', caseId).single()
    if (caseStatusError) { log(`Case status error: ${caseStatusError.message}`, C.red); failed++ }
    else {
      log(`Case status: ${caseStatus.status}`, C.green)
      passed++
    }

    section('TEST SUMMARY')
    const total = Date.now() - startTime
    log(`Total time: ${(total / 1000).toFixed(1)}s`, C.blue)
    log(`Passed: ${passed}`, C.green)
    log(`Failed: ${failed}`, failed > 0 ? C.red : C.green)
    const totalTests = passed + failed
    log(`Rate: ${((passed / totalTests) * 100).toFixed(0)}%`, passed === totalTests ? C.green : C.yellow)
    if (failed === 0) log('\n  ALL TESTS PASSED', C.green)
    else log(`\n  ${failed} TEST(S) FAILED`, C.red)

    log(`\nPro tip: Check Inngest dashboard at https://app.inngest.com for function logs`, C.cyan)
  } catch (error: any) {
    log(`FATAL: ${error.message}`, C.red)
    console.error(error)
  } finally {
    try { await cleanup(agencyId, caseId, documentId, extractionId, storagePath) } catch { /* */ }
  }
}

runTest().then(() => process.exit(0))
