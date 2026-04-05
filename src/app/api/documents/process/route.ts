import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

async function processDocumentDirect(
  documentId: string,
  caseId: string,
  filePath: string,
  fileName: string,
  mimeType: string,
  agencyId: string,
) {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const { extractTextFromDocument } = await import('@/lib/ocr/document-ai')
  const { classifyAndExtract } = await import('@/lib/agents/document-agent')
  const { normalizeToChileanTariff } = await import('@/lib/agents/tariff-normalizer')
  const { inngest } = await import('@/inngest/client')
  const supabase = createAdminClient()
  const steps: string[] = []

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

  try {
    steps.push('Iniciando procesamiento...')

    const { data: extraction, error: extractError } = await supabase
      .from('document_extractions')
      .insert({ document_id: documentId, status: 'processing', model_name: 'gemini-2.5-flash-lite' })
      .select()
      .single()

    if (extractError || !extraction) {
      throw new Error(`Failed to create extraction: ${extractError?.message}`)
    }

    steps.push('Descargando documento...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const bucket = 'case-documents'
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
    const downloadUrl = `${supabaseUrl}/storage/v1/object/auth/${bucket}/${encodedPath}`

    const downloadResponse = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey },
    })

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text()
      throw new Error(`Failed to download file (${downloadResponse.status}): ${errorText}`)
    }

    const fileBuffer = Buffer.from(await downloadResponse.arrayBuffer())
    steps.push(`Documento descargado (${fileBuffer.length} bytes)`)

    const detectedMimeType = mimeType || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
    steps.push('Extrayendo texto con IA...')
    const ocrResult = await extractTextFromDocument(fileBuffer, detectedMimeType)

    if (ocrResult.status === 'error') {
      throw new Error(`OCR failed: ${ocrResult.error}`)
    }

    steps.push('Clasificando documento y extrayendo campos...')
    let extractionResult
    try {
      extractionResult = await classifyAndExtract(ocrResult.rawText, caseId)
    } catch (error: any) {
      console.error('[process] Classification failed:', error)
      extractionResult = {
        document_type: 'unknown',
        fields: [],
        items: [],
        warnings: [`Classification failed: ${error?.message || 'Unknown error'}`],
      }
    }

    steps.push('Guardando resultados...')
    await supabase
      .from('document_extractions')
      .update({
        status: 'completed',
        raw_text: ocrResult.rawText,
        extraction_json: extractionResult as unknown as Record<string, unknown>,
      })
      .eq('id', extraction.id)

    if (extractionResult.document_type !== 'unknown') {
      const validTypes = ['commercial_invoice', 'packing_list', 'bl', 'awb', 'payment_receipt', 'unknown']
      let normalizedType = extractionResult.document_type as string
      if (normalizedType === 'invoice') normalizedType = 'commercial_invoice'
      if (validTypes.includes(normalizedType)) {
        await supabase.from('case_documents').update({ document_type: normalizedType }).eq('id', documentId)
      }
    }

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
      await supabase.from('extracted_fields').insert(
        extractionResult.fields.map(f => ({
          case_id: caseId,
          document_id: documentId,
          field_name: f.name,
          field_label: fieldLabels[f.name] || f.name,
          extracted_value: f.value,
          confidence: f.confidence,
          evidence_text: f.evidence,
        }))
      )
    }

    if (extractionResult.items && extractionResult.items.length > 0) {
      await supabase.from('case_items').insert(
        extractionResult.items.map(item => ({
          case_id: caseId,
          description: item.description,
          quantity: safeParseFloat(item.quantity),
          unit_price: safeParseFloat(item.unit_price),
          total_price: safeParseFloat(item.total_price),
          source_document_id: documentId,
          confidence: item.confidence,
        }))
      )
    }

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

    await supabase.from('operation_cases').update({ status: 'processing' }).eq('id', caseId)

    if (extractionResult.items && extractionResult.items.length > 0) {
      steps.push('Clasificando partidas arancelarias...')
      const { data: savedItems } = await supabase
        .from('case_items')
        .select('*')
        .eq('case_id', caseId)
        .eq('source_document_id', documentId)

      if (savedItems) {
        for (const item of savedItems) {
          if (!item.description) continue
          try {
            const tariffResult = await normalizeToChileanTariff({
              productName: item.description,
              description: item.description,
              caseId,
            })
            await supabase.from('tariff_classifications').insert({
              case_id: caseId,
              item_id: item.id,
              original_description: item.description,
              chile_hs_code_8: tariffResult.chile_hs_code_8,
              short_description: tariffResult.short_description,
              long_description: tariffResult.long_description,
              normalized_composition: tariffResult.normalized_composition,
              confidence: tariffResult.confidence,
              needs_human_review: tariffResult.needs_human_review,
            })
          } catch (e) {
            console.error(`Tariff classification failed for item ${item.id}:`, e)
          }
        }
      }
    }

    const { data: allDocs } = await supabase.from('case_documents').select('id').eq('case_id', caseId)
    const { data: completedExtractions } = await supabase
      .from('document_extractions')
      .select('document_id')
      .in('document_id', allDocs?.map(d => d.id) || [])
      .eq('status', 'completed')

    if (allDocs && completedExtractions && allDocs.length === completedExtractions.length && allDocs.length > 0) {
      try {
        await inngest.send({
          name: 'case/ready-for-orchestration',
          data: { caseId, agencyId },
        })
      } catch (e) {
        console.error('[process] Failed to trigger orchestration:', e)
      }
    }

    steps.push('¡Procesamiento completado!')

    return {
      success: true,
      documentType: extractionResult.document_type,
      fieldsCount: extractionResult.fields?.length || 0,
      itemsCount: extractionResult.items?.length || 0,
      warnings: extractionResult.warnings,
      steps,
    }
  } catch (error: any) {
    console.error('[process] Processing failed:', error)

    await supabase
      .from('document_extractions')
      .update({ status: 'failed', raw_text: error?.message || 'Processing failed' })
      .eq('document_id', documentId)
      .eq('status', 'processing')

    return {
      success: false,
      error: error?.message || 'Processing failed',
      steps,
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { documentId, caseId, filePath, fileName, mimeType, agencyId } = body

    if (!documentId || !caseId || !filePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await processDocumentDirect(documentId, caseId, filePath, fileName, mimeType, agencyId)

    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[process] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Processing failed', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
