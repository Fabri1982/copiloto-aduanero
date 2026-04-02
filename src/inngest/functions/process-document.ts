import { inngest } from '../client'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractTextFromDocument } from '@/lib/ocr/document-ai'
import { classifyAndExtract } from '@/lib/agents/document-agent'
import { normalizeToChileanTariff } from '@/lib/agents/tariff-normalizer'

export const processDocument = inngest.createFunction(
  { id: 'process-uploaded-document', triggers: [{ event: 'document/uploaded' }] },
  async ({ event, step }) => {
    const { documentId, caseId, filePath, fileName, mimeType } = event.data
    const supabase = createAdminClient()

    console.log('[process-document] Event data received:', JSON.stringify(event.data))

    if (!documentId) {
      throw new Error(`documentId is missing from event data. Received: ${JSON.stringify(event.data)}`)
    }

    // Step 1: Create extraction record
    const extraction = await step.run('create-extraction-record', async () => {
      const { data, error } = await supabase
        .from('document_extractions')
        .insert({
          document_id: documentId,
          status: 'processing',
          model_name: 'gemini-2.0-flash-lite',
        })
        .select()
        .single()
      
      if (error) throw new Error(`Failed to create extraction: ${error.message}`)
      return data
    })

    // Step 2: Download file from storage
    const fileBuffer = await step.run('download-file', async () => {
      const { data, error } = await supabase.storage
        .from('case-documents')
        .download(filePath)
      
      if (error) throw new Error(`Failed to download: ${error.message}`)
      const buffer = Buffer.from(await data.arrayBuffer())
      return buffer.toString('base64')
    })

    // Step 3: OCR - Extract text
    const ocrResult = await step.run('ocr-extract-text', async () => {
      const buffer = Buffer.from(fileBuffer, 'base64')
      const detectedMimeType = mimeType || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
      return await extractTextFromDocument(buffer, detectedMimeType)
    })

    if (ocrResult.status === 'error') {
      await step.run('mark-extraction-failed', async () => {
        await supabase
          .from('document_extractions')
          .update({ status: 'failed', raw_text: ocrResult.error })
          .eq('id', extraction.id)
      })
      return { status: 'error', error: ocrResult.error }
    }

    // Step 4: Classify and extract with Document Agent
    const extractionResult = await step.run('classify-and-extract', async () => {
      return await classifyAndExtract(ocrResult.rawText, caseId)
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

      // Update document type if classified
      if (extractionResult.document_type !== 'unknown') {
        await supabase
          .from('case_documents')
          .update({ document_type: extractionResult.document_type })
          .eq('id', documentId)
      }

      // Save extracted fields
      if (extractionResult.fields && extractionResult.fields.length > 0) {
        const fieldsToInsert = extractionResult.fields.map(f => ({
          case_id: caseId,
          document_id: documentId,
          field_name: f.name,
          field_value: f.value,
          confidence: f.confidence,
          evidence: f.evidence,
        }))
        await supabase.from('extracted_fields').insert(fieldsToInsert)
      }

      // Save items
      if (extractionResult.items && extractionResult.items.length > 0) {
        const itemsToInsert = extractionResult.items.map(item => ({
          case_id: caseId,
          description: item.description,
          quantity: item.quantity ? parseFloat(item.quantity) : null,
          unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
          total_price: item.total_price ? parseFloat(item.total_price) : null,
          source_document_id: documentId,
          confidence: item.confidence,
        }))
        await supabase.from('case_items').insert(itemsToInsert)
      }

      // Create audit event
      await supabase.from('audit_events').insert({
        agency_id: event.data.agencyId,
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
        // Get saved items
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

      // If all documents have completed extractions, trigger orchestration
      if (allDocs && completedExtractions && allDocs.length === completedExtractions.length && allDocs.length > 0) {
        await inngest.send({
          name: 'case/ready-for-orchestration',
          data: { caseId, agencyId: event.data.agencyId },
        })
      }
    })

    return { status: 'success', documentType: extractionResult.document_type }
  }
)
