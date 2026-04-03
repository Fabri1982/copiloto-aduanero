import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractTextFromDocument } from '@/lib/ocr/document-ai'
import { classifyAndExtract } from '@/lib/agents/document-agent'
import { normalizeToChileanTariff } from '@/lib/agents/tariff-normalizer'

export const maxDuration = 300 // 5 minutes

const safeParseFloat = (val: string | null | undefined): number | null => {
  if (!val) return null
  let cleaned = val.trim().replace(/[^\d.,-]/g, '')
  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')
  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
      cleaned = cleaned.replace(/,/g, '')
    } else {
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.')
    }
  } else if (hasComma) {
    cleaned = cleaned.replace(/,/g, '.')
  }
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { documentId, caseId, filePath, fileName, mimeType, agencyId } = body

    if (!documentId || !caseId || !filePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const steps: string[] = []

    // Step 1: Create extraction record
    steps.push('Creando registro...')
    const { data: extraction, error: extractError } = await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        status: 'processing',
        model_name: 'gemini-2.5-flash-lite',
      })
      .select()
      .single()

    if (extractError || !extraction) {
      console.error('[process-direct] Failed to create extraction:', extractError)
      return NextResponse.json({ error: 'Failed to create extraction', details: extractError?.message }, { status: 500 })
    }

    // Step 2: Download file
    steps.push('Descargando documento...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
    const downloadUrl = `${supabaseUrl}/storage/v1/object/auth/${encodedPath}`

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
    }
    const downloadResponse = await fetch(downloadUrl, { headers })

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text()
      return NextResponse.json({ error: `Failed to download file (${downloadResponse.status}): ${errorText}` }, { status: 500 })
    }

    const arrayBuffer = await downloadResponse.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Step 3: OCR
    steps.push('Extrayendo texto con IA...')
    const detectedMimeType = mimeType || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
    const ocrResult = await extractTextFromDocument(fileBuffer, detectedMimeType)

    if (ocrResult.status === 'error') {
      await supabase
        .from('document_extractions')
        .update({ status: 'failed', raw_text: ocrResult.error })
        .eq('id', extraction.id)

      return NextResponse.json(
        { error: 'OCR failed', details: ocrResult.error, steps },
        { status: 500 }
      )
    }

    // Step 4: Classify and extract
    steps.push('Clasificando documento y extrayendo campos...')
    let extractionResult
    try {
      extractionResult = await classifyAndExtract(ocrResult.rawText, caseId)
    } catch (error: any) {
      console.error('[process-direct] Classification failed:', error)
      extractionResult = {
        document_type: 'unknown',
        fields: [],
        items: [],
        warnings: [`Classification failed: ${error?.message || 'Unknown error'}`],
      }
    }

    // Step 5: Save results
    steps.push('Guardando resultados...')
    const { error: updateError } = await supabase
      .from('document_extractions')
      .update({
        status: 'completed',
        raw_text: ocrResult.rawText,
        extraction_json: extractionResult as unknown as Record<string, unknown>,
      })
      .eq('id', extraction.id)

    if (updateError) {
      console.error('[process-direct] Failed to update extraction:', updateError)
    }

    // Update document type
    if (extractionResult.document_type !== 'unknown') {
      const validTypes = ['commercial_invoice', 'packing_list', 'bl', 'awb', 'payment_receipt', 'unknown']
      let normalizedType = extractionResult.document_type as string
      if (normalizedType === 'invoice') normalizedType = 'commercial_invoice'
      if (validTypes.includes(normalizedType)) {
        await supabase
          .from('case_documents')
          .update({ document_type: normalizedType })
          .eq('id', documentId)
      }
    }

    // Save extracted fields
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
        case_id: caseId,
        document_id: documentId,
        field_name: f.name,
        field_label: fieldLabels[f.name] || f.name,
        extracted_value: f.value,
        confidence: f.confidence,
        evidence_text: f.evidence,
      }))
      await supabase.from('extracted_fields').insert(fieldsToInsert)
    }

    // Save items
    if (extractionResult.items && extractionResult.items.length > 0) {
      const itemsToInsert = extractionResult.items.map(item => ({
        case_id: caseId,
        description: item.description,
        quantity: safeParseFloat(item.quantity),
        unit_price: safeParseFloat(item.unit_price),
        total_price: safeParseFloat(item.total_price),
        source_document_id: documentId,
        confidence: item.confidence,
      }))
      await supabase.from('case_items').insert(itemsToInsert)
    }

    // Audit event
    await supabase.from('audit_events').insert({
      agency_id: agencyId,
      case_id: caseId,
      actor_type: 'agent',
      actor_id: 'document-agent',
      event_name: 'document_processed',
      event_payload_json: {
        document_id: documentId,
        document_type: extractionResult.document_type,
        fields_count: extractionResult.fields?.length || 0,
        items_count: extractionResult.items?.length || 0,
        warnings: extractionResult.warnings,
      },
    })

    // Update case status
    await supabase
      .from('operation_cases')
      .update({ status: 'processing' })
      .eq('id', caseId)

    steps.push('¡Completado!')

    return NextResponse.json({
      success: true,
      documentType: extractionResult.document_type,
      fieldsCount: extractionResult.fields?.length || 0,
      itemsCount: extractionResult.items?.length || 0,
      warnings: extractionResult.warnings,
      steps,
    })
  } catch (error: any) {
    console.error('[process-direct] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Processing failed', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
