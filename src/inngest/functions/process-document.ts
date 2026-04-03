import { inngest } from '../client'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractTextFromDocument } from '@/lib/ocr/document-ai'
import { classifyAndExtract } from '@/lib/agents/document-agent'
import { normalizeToChileanTariff } from '@/lib/agents/tariff-normalizer'

// Helper for safe numeric parsing from AI strings
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

export const processDocument = inngest.createFunction(
  { 
    id: 'process-uploaded-document', 
    retries: 3,
    throttle: {
      limit: 10,
      period: '1m',
    },
    concurrency: 2,
    triggers: [{ event: 'document/uploaded' }] 
  },
  async ({ event, step }) => {
    console.log('🚀🚀🚀 [PROCESS-DOCUMENT] FUNCTION TRIGGERED! 🚀🚀🚀')
    console.log('🚀 Event ID:', event.id)
    console.log('🚀 Document ID:', event.data?.documentId)
    console.log('🚀 Case ID:', event.data?.caseId)
    console.log('🚀 Timestamp:', new Date().toISOString())
    console.log('Full event:', JSON.stringify(event, null, 2))
    
    if (!event.data || !event.data.documentId) {
      console.error('[process-document] Invalid event data received:', event)
      throw new Error('Invalid event data: missing documentId')
    }
    
    const startTime = Date.now()
    console.log(`[process-document] Starting processing at ${new Date().toISOString()}`)

    const { documentId, caseId, filePath, fileName, mimeType } = event.data
    const agencyId = event.data.agencyId
    const supabase = createAdminClient()

    // Step 1: Create extraction record
    const extraction = await step.run('create-extraction-record', async () => {
      console.log('[process-document] Creating extraction record for document:', documentId)
      
      const { data, error } = await supabase
        .from('document_extractions')
        .insert({
          document_id: documentId,
          status: 'processing',
          model_name: 'gemini-2.5-flash-lite',
        })
        .select()
        .single()
      
      if (error) {
        console.error('[process-document] Failed to create extraction:', error)
        throw new Error(`Failed to create extraction: ${error.message}`)
      }
      
      console.log('[process-document] Extraction created successfully:', data.id)
      return data
    })

    // Step 2: Download file from storage using direct fetch (more reliable in serverless)
    const fileBuffer = await step.run('download-file', async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      }
      const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
      const url = `${supabaseUrl}/storage/v1/object/auth/${encodedPath}`
      
      console.log('[process-document] Downloading file from:', url)
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      }
      
      const response = await fetch(url, { headers })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to download file (${response.status}): ${errorText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      console.log(`[process-document] Downloaded ${buffer.length} bytes`)
      return buffer.toString('base64')
    })

    // Step 3: OCR - Extract text (with retry for rate limits)
    const ocrResult = await step.run('ocr-extract-text', async () => {
      const buffer = Buffer.from(fileBuffer, 'base64')
      const detectedMimeType = mimeType || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
      
      try {
        return await extractTextFromDocument(buffer, detectedMimeType)
      } catch (error: any) {
        if (error?.message?.includes('429') || error?.message?.includes('Quota exceeded')) {
          console.warn('[process-document] Rate limit hit - Inngest will retry automatically')
          throw error
        }
        throw error
      }
    })

    if (ocrResult.status === 'error') {
      await step.run('mark-extraction-failed', async () => {
        await supabase
          .from('document_extractions')
          .update({ status: 'failed', raw_text: ocrResult.error })
          .eq('id', extraction.id)
        
        await supabase.from('audit_events').insert({
          agency_id: agencyId,
          case_id: caseId,
          actor_type: 'agent',
          actor_id: 'document-agent',
          event_name: 'document_processing_failed',
          event_payload_json: {
            document_id: documentId,
            error: ocrResult.error,
          },
        })
      })
      return { status: 'error', error: ocrResult.error }
    }

    // Step 4: Classify and extract with Document Agent
    const extractionResult = await step.run('classify-and-extract', async () => {
      try {
        return await classifyAndExtract(ocrResult.rawText, caseId)
      } catch (error: any) {
        console.error('[process-document] Classification failed:', error)
        // Return a minimal result instead of crashing
        return {
          document_type: 'unknown',
          fields: [],
          items: [],
          warnings: [`Classification failed: ${error?.message || 'Unknown error'}`],
        }
      }
    })

    // Step 5: Save results
    await step.run('save-extraction-results', async () => {
      // Update extraction record
      await supabase
        .from('document_extractions')
        .update({
          status: 'completed',
          raw_text: ocrResult.rawText,
          extraction_json: extractionResult as unknown as Record<string, unknown>,
        })
        .eq('id', extraction.id)

      // Update document type if classified (Normalize to allowed enum values)
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

      // Create audit event
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
    })

    // Step 6: Run tariff classification for items
    if (extractionResult.items && extractionResult.items.length > 0) {
      await step.run('tariff-classification', async () => {
        const { data: savedItems } = await supabase
          .from('case_items')
          .select('*')
          .eq('case_id', caseId)
          .eq('source_document_id', documentId)

        if (!savedItems) return

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
            // Continue with next item instead of failing the whole step
          }
        }
      })
    }

    // Step 7: Check if all documents processed, trigger orchestration
    await step.run('check-trigger-orchestration', async () => {
      const { data: allDocs } = await supabase
        .from('case_documents')
        .select('id')
        .eq('case_id', caseId)

      const { data: completedExtractions } = await supabase
        .from('document_extractions')
        .select('document_id')
        .in('document_id', allDocs?.map(d => d.id) || [])
        .eq('status', 'completed')

      if (allDocs && completedExtractions && allDocs.length === completedExtractions.length && allDocs.length > 0) {
        await inngest.send({
          name: 'case/ready-for-orchestration',
          data: { caseId, agencyId: event.data.agencyId },
        })
      }
    })

    const duration = Date.now() - startTime
    console.log(`[process-document] Processing completed successfully in ${duration}ms`)
    
    return { status: 'success', documentType: extractionResult.document_type }
  }
)
