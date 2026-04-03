import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { extractTextFromDocument } from './src/lib/ocr/document-ai'
import { classifyAndExtract } from './src/lib/agents/document-agent'
import { normalizeToChileanTariff } from './src/lib/agents/tariff-normalizer'
import { consolidateCase } from './src/lib/agents/structurer-agent'
import { validateCase } from './src/lib/agents/validator-agent'
import { decideEscalation } from './src/lib/agents/escalation-agent'
import { generateProvisionDraft, type CaseData } from './src/lib/agents/provision-agent'
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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runTest() {
  console.log(`\n${COLORS.bold}═══════════════════════════════════════════${COLORS.reset}`)
  console.log(`${COLORS.bold}  COPILOTO ADUANERO — Pipeline Test${COLORS.reset}`)
  console.log(`${COLORS.bold}═══════════════════════════════════════════${COLORS.reset}\n`)

  // Check env
  log('Environment', 'info', `GOOGLE_AI_API_KEY: ${process.env.GOOGLE_AI_API_KEY ? 'SET' : 'MISSING'}`)
  if (!process.env.GOOGLE_AI_API_KEY) {
    log('GOOGLE_AI_API_KEY missing', 'fail')
    process.exit(1)
  }

  // Find test PDF
  const testPdfPath = path.join(process.cwd(), 'test-document.pdf')
  if (!fs.existsSync(testPdfPath)) {
    log('Test PDF not found', 'fail', `Place a PDF at: ${testPdfPath}`)
    process.exit(1)
  }

  const fileBuffer = fs.readFileSync(testPdfPath)
  log('Test PDF loaded', 'pass', `${(fileBuffer.length / 1024).toFixed(1)} KB`)

  let allPassed = true
  const timings: Record<string, number> = {}

  // Step 1: OCR
  log('Step 1: OCR — Extract text from document', 'step')
  const t0 = Date.now()
  try {
    const ocrResult = await extractTextFromDocument(fileBuffer, 'application/pdf')
    timings.ocr = Date.now() - t0
    if (ocrResult.status === 'success' && ocrResult.rawText.length > 0) {
      log('OCR completed', 'pass', `${ocrResult.rawText.length} chars extracted in ${(timings.ocr / 1000).toFixed(1)}s`)
    } else {
      log('OCR failed', 'fail', ocrResult.error || 'Empty result')
      allPassed = false
    }
  } catch (e: any) {
    timings.ocr = Date.now() - t0
    log('OCR crashed', 'fail', e.message)
    allPassed = false
  }

  // Step 2: Classify & Extract
  log('Step 2: Document Agent — Classify & extract fields', 'step')
  const t1 = Date.now()
  try {
    const extractionResult = await classifyAndExtract('test-text', 'TEST-001')
    timings.classify = Date.now() - t1
    log('Classification completed', 'pass', `Type: ${extractionResult.document_type}, Fields: ${extractionResult.fields?.length || 0}, Items: ${extractionResult.items?.length || 0} in ${(timings.classify / 1000).toFixed(1)}s`)
    if (extractionResult.warnings?.length > 0) {
      log('Warnings', 'info', extractionResult.warnings.join(', '))
    }
  } catch (e: any) {
    timings.classify = Date.now() - t1
    log('Classification crashed', 'fail', e.message)
    allPassed = false
  }

  // Step 3: Tariff Normalization
  log('Step 3: Tariff Normalizer — Classify HS code', 'step')
  const t2 = Date.now()
  try {
    const tariffResult = await normalizeToChileanTariff({
      productName: 'Camiseta de algodón',
      description: 'Camiseta de algodón 100% para hombre, talla L',
      caseId: 'TEST-001',
    })
    timings.tariff = Date.now() - t2
    log('Tariff classification completed', 'pass', `HS: ${tariffResult.chile_hs_code_8}, Confidence: ${tariffResult.confidence} in ${(timings.tariff / 1000).toFixed(1)}s`)
    if (tariffResult.needs_human_review) {
      log('Needs human review', 'info', tariffResult.classification_notes.join(', '))
    }
  } catch (e: any) {
    timings.tariff = Date.now() - t2
    log('Tariff classification crashed', 'fail', e.message)
    allPassed = false
  }

  // Step 4: Consolidate Case (simulated)
  log('Step 4: Structurer Agent — Consolidate case', 'step')
  const t3 = Date.now()
  try {
    const mockExtractions = [
      {
        documentId: 'doc-1',
        documentType: 'commercial_invoice',
        fields: [
          { name: 'invoice_number', value: 'INV-2024-001', confidence: 0.95, evidence: 'INV-2024-001' },
          { name: 'total_amount', value: '15000.00', confidence: 0.90, evidence: 'Total: $15,000.00' },
        ],
        items: [
          { description: 'Camiseta de algodón', quantity: '100', unit_price: '50.00', total_price: '5000.00', confidence: 0.85 },
        ],
      },
      {
        documentId: 'doc-2',
        documentType: 'packing_list',
        fields: [
          { name: 'gross_weight', value: '25.5', confidence: 0.88, evidence: 'Gross Weight: 25.5 kg' },
        ],
        items: [
          { description: 'Camiseta de algodón', quantity: '100', unit_price: null, total_price: null, confidence: 0.80 },
        ],
      },
    ]
    const structured = await consolidateCase(mockExtractions, 'TEST-001')
    timings.consolidate = Date.now() - t3
    log('Consolidation completed', 'pass', `Header: ${Object.keys(structured.header).length} fields, Items: ${structured.items?.length || 0}, Conflicts: ${structured.conflicts?.length || 0} in ${(timings.consolidate / 1000).toFixed(1)}s`)
  } catch (e: any) {
    timings.consolidate = Date.now() - t3
    log('Consolidation crashed', 'fail', e.message)
    allPassed = false
  }

  // Step 5: Validate Case
  log('Step 5: Validator Agent — Validate case', 'step')
  const t4 = Date.now()
  try {
    const validation = await validateCase(
      { invoice_number: { value: 'INV-2024-001', source_document: 'doc-1', confidence: 0.95 } },
      [],
      ['commercial_invoice', 'packing_list'],
      'TEST-001'
    )
    timings.validate = Date.now() - t4
    log('Validation completed', 'pass', `Status: ${validation.status}, Risk: ${validation.risk_score}, Alerts: ${validation.alerts?.length || 0} in ${(timings.validate / 1000).toFixed(1)}s`)
  } catch (e: any) {
    timings.validate = Date.now() - t4
    log('Validation crashed', 'fail', e.message)
    allPassed = false
  }

  // Step 6: Escalation
  log('Step 6: Escalation Agent — Decide next step', 'step')
  const t5 = Date.now()
  try {
    const escalation = await decideEscalation({
      validationStatus: 'approvable',
      riskScore: 0.2,
      criticalFieldConfidence: { invoice_number: 0.95, total_amount: 0.90 },
      missingDocuments: [],
      alertSummary: [],
      unresolvedConflicts: 0,
      caseId: 'TEST-001',
    })
    timings.escalation = Date.now() - t5
    log('Escalation completed', 'pass', `Decision: ${escalation.decision}, Priority: ${escalation.priority} in ${(timings.escalation / 1000).toFixed(1)}s`)
  } catch (e: any) {
    timings.escalation = Date.now() - t5
    log('Escalation crashed', 'fail', e.message)
    allPassed = false
  }

  // Step 7: Provision
  log('Step 7: Provision Agent — Generate provision', 'step')
  const t6 = Date.now()
  try {
    const mockCaseData: CaseData = {
      caseId: 'TEST-001',
      clientName: 'Test Client',
      referenceCode: 'REF-001',
      header: {
        invoice_number: { value: 'INV-2024-001', source_document: 'doc-1', confidence: 0.95 },
        total_amount: { value: '15000.00', source_document: 'doc-1', confidence: 0.90 },
        currency: { value: 'USD', source_document: 'doc-1', confidence: 0.95 },
        incoterm: { value: 'CIF', source_document: 'doc-1', confidence: 0.85 },
      },
      items: [
        {
          description: 'Camiseta de algodón',
          quantity: 100,
          unit_price: 50,
          total_price: 5000,
          source_document: 'doc-1',
          confidence: 0.85,
          tariff_classification: {
            hs_code: '61091000',
            description: 'Camisetas de algodón',
            duty_rate: 6,
            vat_rate: 19,
            confidence: 0.8,
          },
        },
      ],
    }
    const provision = await generateProvisionDraft(mockCaseData)
    timings.provision = Date.now() - t6
    log('Provision completed', 'pass', `Total: ${provision.total} ${provision.currency}, Items: ${provision.items?.length || 0} in ${(timings.provision / 1000).toFixed(1)}s`)
  } catch (e: any) {
    timings.provision = Date.now() - t6
    log('Provision crashed', 'fail', e.message)
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
