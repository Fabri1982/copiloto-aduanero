import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from './src/lib/supabase/admin'
import { extractTextFromDocument } from './src/lib/ocr/document-ai'
import { classifyAndExtract } from './src/lib/agents/document-agent'
import { normalizeToChileanTariff } from '@/lib/agents/tariff-normalizer'
import { consolidateCase } from '@/lib/agents/structurer-agent'
import { validateCase } from '@/lib/agents/validator-agent'
import { decideEscalation } from '@/lib/agents/escalation-agent'
import { generateProvisionDraft, type CaseData } from '@/lib/agents/provision-agent'
import fs from 'fs'
import path from 'path'

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
}

function log(step: string, status: 'pass' | 'fail' | 'info' | 'step', detail?: string) {
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : status === 'step' ? '▸' : 'ℹ'
  const color = status === 'pass' ? COLORS.green : status === 'fail' ? COLORS.red : status === 'step' ? COLORS.blue : COLORS.yellow
  console.log(`  ${color}${icon} ${COLORS.bold}${step}${COLORS.reset}${detail ? ` — ${detail}` : ''}`)
}

async function runTest() {
  console.log(`\n${COLORS.bold}═══════════════════════════════════════════${COLORS.reset}`)
  console.log(`${COLORS.bold}  COPILOTO ADUANERO — End-to-End Pipeline Test${COLORS.reset}`)
  console.log(`${COLORS.bold}═══════════════════════════════════════════${COLORS.reset}\n`)

  if (!process.env.GOOGLE_AI_API_KEY) {
    log('GOOGLE_AI_API_KEY missing', 'fail')
    process.exit(1)
  }

  const testPdfPath = path.join(process.cwd(), 'test-document.pdf')
  if (!fs.existsSync(testPdfPath)) {
    log('Test PDF not found', 'fail', `Place a PDF at: ${testPdfPath}`)
    process.exit(1)
  }

  const fileBuffer = fs.readFileSync(testPdfPath)
  log('Test PDF loaded', 'pass', `${(fileBuffer.length / 1024).toFixed(1)} KB`)

  const supabase = createAdminClient()
  const agencyId = 'a0000000-0000-0000-0000-000000000001'
  const caseId = `test-${Date.now()}`
  let allPassed = true
  const timings: Record<string, number> = {}

  // Step 1: Create test case
  log('Step 1: Create test case', 'step')
  const t0 = Date.now()
  try {
    const { data: newCase, error } = await supabase
      .from('operation_cases')
      .insert({
        agency_id: agencyId,
        client_name: 'Test Client',
        reference_code: `E2E-${Date.now()}`,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error
    timings.createCase = Date.now() - t0
    log('Case created', 'pass', `ID: ${newCase.id} in ${(timings.createCase / 1000).toFixed(1)}s`)

    // Step 2: Upload file to storage
    log('Step 2: Upload file to Supabase Storage', 'step')
    const t1 = Date.now()
    const fileName = 'test-invoice.pdf'
    const filePath = `${agencyId}/${newCase.id}/${Date.now()}_${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('case-documents')
      .upload(filePath, fileBuffer, { contentType: 'application/pdf' })

    if (uploadError) throw uploadError
    timings.upload = Date.now() - t1
    log('File uploaded', 'pass', `Path: ${uploadData.path} in ${(timings.upload / 1000).toFixed(1)}s`)

    // Step 3: Create document record
    log('Step 3: Create document record', 'step')
    const t2 = Date.now()
    const { data: doc, error: docError } = await supabase
      .from('case_documents')
      .insert({
        case_id: newCase.id,
        file_path: filePath,
        document_type: 'commercial_invoice',
        file_name: fileName,
      })
      .select()
      .single()

    if (docError) throw docError
    timings.createDoc = Date.now() - t2
    log('Document created', 'pass', `ID: ${doc.id} in ${(timings.createDoc / 1000).toFixed(1)}s`)

    // Step 4: OCR
    log('Step 4: OCR — Extract text', 'step')
    const t3 = Date.now()
    const ocrResult = await extractTextFromDocument(fileBuffer, 'application/pdf')
    timings.ocr = Date.now() - t3
    if (ocrResult.status === 'success' && ocrResult.rawText.length > 0) {
      log('OCR completed', 'pass', `${ocrResult.rawText.length} chars in ${(timings.ocr / 1000).toFixed(1)}s`)
    } else {
      log('OCR failed', 'fail', ocrResult.error || 'Empty result')
      allPassed = false
    }

    // Step 5: Classify & Extract
    log('Step 5: Document Agent — Classify & extract', 'step')
    const t4 = Date.now()
    const extractionResult = await classifyAndExtract(ocrResult.rawText, newCase.id)
    timings.classify = Date.now() - t4
    log('Classification completed', 'pass', `Type: ${extractionResult.document_type}, Fields: ${extractionResult.fields?.length || 0} in ${(timings.classify / 1000).toFixed(1)}s`)

    // Step 6: Save extraction record
    log('Step 6: Save extraction to DB', 'step')
    const t5 = Date.now()
    const { data: extraction, error: extError } = await supabase
      .from('document_extractions')
      .insert({
        document_id: doc.id,
        status: 'completed',
        model_name: 'gemini-2.5-flash-lite',
        raw_text: ocrResult.rawText,
        extraction_json: extractionResult,
      })
      .select()
      .single()

    if (extError) throw extError
    timings.saveExt = Date.now() - t5
    log('Extraction saved', 'pass', `ID: ${extraction.id} in ${(timings.saveExt / 1000).toFixed(1)}s`)

    // Step 7: Save extracted fields
    log('Step 7: Save extracted fields', 'step')
    const t6 = Date.now()
    if (extractionResult.fields && extractionResult.fields.length > 0) {
      const fieldLabels: Record<string, string> = {
        invoice_number: 'Número de factura',
        invoice_date: 'Fecha de factura',
        supplier_name: 'Nombre del proveedor',
        consignee_name: 'Nombre del consignatario',
        currency: 'Moneda',
        incoterm: 'Incoterm',
        total_amount: 'Monto total',
        gross_weight: 'Peso bruto',
        net_weight: 'Peso neto',
        package_count: 'Cantidad de bultos',
        transport_reference: 'Referencia de transporte',
      }
      const fieldsToInsert = extractionResult.fields.map(f => ({
        case_id: newCase.id,
        document_id: doc.id,
        field_name: f.name,
        field_label: fieldLabels[f.name] || f.name,
        extracted_value: f.value,
        confidence: f.confidence,
        evidence_text: f.evidence,
      }))
      const { error: fieldsError } = await supabase.from('extracted_fields').insert(fieldsToInsert)
      if (fieldsError) throw fieldsError
    }
    timings.saveFields = Date.now() - t6
    log('Fields saved', 'pass', `${extractionResult.fields?.length || 0} fields in ${(timings.saveFields / 1000).toFixed(1)}s`)

    // Step 8: Verify data in DB
    log('Step 8: Verify data in database', 'step')
    const { data: savedFields, error: verifyError } = await supabase
      .from('extracted_fields')
      .select('*')
      .eq('case_id', newCase.id)

    if (verifyError) throw verifyError
    if (savedFields && savedFields.length > 0) {
      log('Data verified', 'pass', `${savedFields.length} fields found in DB`)
    } else {
      log('No fields found in DB', 'fail')
      allPassed = false
    }

    // Cleanup
    log('Cleanup: Delete test case', 'step')
    await supabase.from('operation_cases').delete().eq('id', newCase.id)
    log('Test case deleted', 'info')

  } catch (e: any) {
    log('Test failed', 'fail', e.message)
    allPassed = false
  }

  // Summary
  console.log(`\n${COLORS.bold}═══════════════════════════════════════════${COLORS.reset}`)
  console.log(`${COLORS.bold}  TIMING SUMMARY${COLORS.reset}`)
  console.log(`${COLORS.bold}═══════════════════════════════════════════${COLORS.reset}`)
  for (const [step, ms] of Object.entries(timings)) {
    const color = ms > 30000 ? COLORS.red : ms > 15000 ? COLORS.yellow : COLORS.green
    console.log(`  ${color}${step.padEnd(15)} ${(ms / 1000).toFixed(1)}s${COLORS.reset}`)
  }
  const total = Object.values(timings).reduce((a, b) => a + b, 0)
  console.log(`  ${COLORS.bold}${'TOTAL'.padEnd(15)} ${(total / 1000).toFixed(1)}s${COLORS.reset}`)

  console.log(`\n${COLORS.bold}═══════════════════════════════════════════${COLORS.reset}`)
  if (allPassed) {
    console.log(`${COLORS.green}${COLORS.bold}  ALL TESTS PASSED ✓${COLORS.reset}`)
  } else {
    console.log(`${COLORS.red}${COLORS.bold}  SOME TESTS FAILED ✗${COLORS.reset}`)
  }
  console.log(`${COLORS.bold}═══════════════════════════════════════════${COLORS.reset}\n`)

  process.exit(allPassed ? 0 : 1)
}

runTest()
