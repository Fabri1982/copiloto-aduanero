import * as path from 'path'
import * as fs from 'fs'

// Load .env.local manually
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
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const C = { reset: '\x1b[0m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', gray: '\x1b[90m' }

function log(msg: string, color = '') { console.log(`${color}${C.bold}[TEST]${C.reset} ${color}${msg}${C.reset}`) }
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
  log('Cleaning up...', C.gray)
  if (extractionId) await supabase.from('document_extractions').delete().eq('id', extractionId)
  await supabase.from('extracted_fields').delete().eq('case_id', caseId)
  await supabase.from('case_items').delete().eq('case_id', caseId)
  await supabase.from('audit_events').delete().eq('case_id', caseId)
  await supabase.from('case_documents').delete().eq('id', documentId)
  await supabase.from('operation_cases').delete().eq('id', caseId)
  try { await supabase.storage.from('case-documents').remove([filePath]) } catch { /* */ }
}

async function runTest() {
  let caseId = '', documentId = '', agencyId = ''
  let extractionId: string | null = null, storagePath = ''
  let passed = 0, failed = 0
  const startTime = Date.now()

  try {
    section('E2E Document Processing Test')
    log(`Started: ${new Date().toISOString()}`)
    log(`API: ${BASE_URL}`)

    section('Step 1: Create test agency')
    const { data: agency, error: agencyError } = await supabase.from('agencies').insert({ name: `Test Agency ${Date.now()}` }).select().single()
    if (agencyError) {
      const { data: existing } = await supabase.from('agencies').select('id').limit(1).single()
      if (!existing) throw new Error('Cannot create/find agency')
      agencyId = existing.id
      log(`Existing agency: ${agencyId}`, C.yellow)
    } else {
      agencyId = agency.id
      log(`Created agency: ${agencyId}`, C.green)
    }
    passed++

    section('Step 2: Create test case')
    const { data: caseData, error: caseError } = await supabase.from('operation_cases').insert({ agency_id: agencyId, status: 'pending', reference: `TEST-${Date.now()}` }).select().single()
    if (caseError) throw new Error(`Case error: ${caseError.message}`)
    caseId = caseData.id
    log(`Case ID: ${caseId}`, C.green)
    passed++

    section('Step 3: Upload test PDF')
    const pdfBuffer = createMinimalPDF()
    storagePath = `test/${caseId}/test-invoice-${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage.from('case-documents').upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })
    if (uploadError) throw new Error(`Upload error: ${uploadError.message}`)
    log(`Uploaded: ${uploadData.path} (${pdfBuffer.length} bytes)`, C.green)
    passed++

    section('Step 4: Create document record')
    const { data: docData, error: docError } = await supabase.from('case_documents').insert({ case_id: caseId, file_name: 'test-invoice.pdf', file_path: storagePath, document_type: 'unknown', mime_type: 'application/pdf', file_size_bytes: pdfBuffer.length }).select().single()
    if (docError) throw new Error(`Doc error: ${docError.message}`)
    documentId = docData.id
    log(`Document ID: ${documentId}`, C.green)
    passed++

    section('Step 5: Call process-direct API')
    log('Sending request...', C.yellow)
    const apiStart = Date.now()
    const response = await fetch(`${BASE_URL}/api/documents/process-direct`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, caseId, filePath: storagePath, fileName: 'test-invoice.pdf', mimeType: 'application/pdf', agencyId })
    })
    const apiDuration = Date.now() - apiStart
    log(`Response: ${response.status} in ${(apiDuration / 1000).toFixed(1)}s`, C.blue)
    const result = await response.json()
    console.log(`\n${C.gray}${JSON.stringify(result, null, 2)}${C.reset}\n`)

    if (!response.ok) { failed++; log(`API error: ${result.error || result.message}`, C.red) }
    else {
      passed++
      log(`Success: ${result.documentType}`, C.green)
      log(`Fields: ${result.fieldsCount}, Items: ${result.itemsCount}`, C.blue)
      if (result.steps) { log('Steps:', C.blue); result.steps.forEach((s: string) => log(`  -> ${s}`, C.gray)) }
    }

    section('Step 6: Verify DB records')
    const { data: extraction, error: extError } = await supabase.from('document_extractions').select('*').eq('document_id', documentId).order('created_at', { ascending: false }).limit(1).single()
    if (extError) { log(`No extraction: ${extError.message}`, C.red); failed++ }
    else {
      extractionId = extraction.id
      const sc = extraction.status === 'completed' ? C.green : extraction.status === 'failed' ? C.red : C.yellow
      log(`Status: ${extraction.status}`, sc)
      log(`Raw text: ${(extraction.raw_text?.length || 0)} chars`, C.blue)
      if (extraction.extraction_json) {
        const json = typeof extraction.extraction_json === 'string' ? JSON.parse(extraction.extraction_json) : extraction.extraction_json
        log(`Doc type: ${json.document_type || 'unknown'}`, C.blue)
        log(`Fields: ${json.fields?.length || 0}, Items: ${json.items?.length || 0}`, C.blue)
        if (json.fields?.length > 0) { log('Sample fields:', C.blue); json.fields.slice(0, 3).forEach((f: any) => log(`  ${f.name}: ${f.value} (${f.confidence})`, C.gray)) }
      }
      passed++
    }

    const { data: fields, error: fieldsError } = await supabase.from('extracted_fields').select('*').eq('document_id', documentId)
    if (fieldsError) { log(`Fields error: ${fieldsError.message}`, C.red); failed++ }
    else { log(`Fields in DB: ${fields?.length || 0}`, fields?.length ? C.green : C.yellow); fields?.length ? passed++ : failed++ }

    const { data: items, error: itemsError } = await supabase.from('case_items').select('*').eq('source_document_id', documentId)
    if (itemsError) { log(`Items error: ${itemsError.message}`, C.red); failed++ }
    else { log(`Items in DB: ${items?.length || 0}`, items?.length ? C.green : C.yellow); items?.length ? passed++ : failed++; items?.forEach((item: any) => log(`  ${item.description} - Qty: ${item.quantity}`, C.gray)) }

    section('Step 7: Audit events')
    const { data: audits, error: auditError } = await supabase.from('audit_events').select('*').eq('case_id', caseId).order('created_at', { ascending: false }).limit(5)
    if (auditError) { log(`Audit error: ${auditError.message}`, C.red); failed++ }
    else { log(`Events: ${audits?.length || 0}`, C.blue); audits?.forEach((a: any) => log(`  ${a.event_name}`, C.gray)); passed++ }

    section('TEST SUMMARY')
    const total = Date.now() - startTime
    log(`Time: ${(total / 1000).toFixed(1)}s`, C.blue)
    log(`Passed: ${passed}`, C.green)
    log(`Failed: ${failed}`, failed > 0 ? C.red : C.green)
    log(`Rate: ${((passed / (passed + failed)) * 100).toFixed(0)}%`, passed === (passed + failed) ? C.green : C.yellow)
    if (failed === 0) log('\n✅ ALL TESTS PASSED', C.green)
    else log(`\n❌ ${failed} TEST(S) FAILED`, C.red)
  } catch (error: any) {
    log(`\n❌ FATAL: ${error.message}`, C.red)
    console.error(error)
  } finally {
    try { await cleanup(agencyId, caseId, documentId, extractionId, storagePath) } catch { /* */ }
  }
}

runTest().then(() => process.exit(0))
