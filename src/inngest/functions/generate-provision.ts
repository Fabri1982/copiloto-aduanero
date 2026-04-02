import { inngest } from '../client'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateProvisionDraft, type CaseData } from '@/lib/agents/provision-agent'

export const generateProvision = inngest.createFunction(
  { id: 'generate-provision', retries: 2, triggers: [{ event: 'case/generate-provision' }] },
  async ({ event, step }) => {
    const { caseId, agencyId } = event.data
    const supabase = createAdminClient()

    // Step 1: Fetch case data + items + classifications
    const caseData = await step.run('fetch-case-data', async () => {
      // Get case details
      const { data: caseDetails, error: caseError } = await supabase
        .from('operation_cases')
        .select('id, client_name, reference_code, status')
        .eq('id', caseId)
        .single()

      if (caseError || !caseDetails) {
        throw new Error(`Case not found: ${caseError?.message}`)
      }

      // Get extracted fields (header data)
      const { data: extractedFields } = await supabase
        .from('extracted_fields')
        .select('field_name, field_value, confidence, document_id')
        .eq('case_id', caseId)

      // Get case items (not extracted_items - items are stored in case_items table)
      const { data: caseItems } = await supabase
        .from('case_items')
        .select('id, description, quantity, unit_price, total_price, confidence, source_document_id')
        .eq('case_id', caseId)

      // Get tariff classifications for items
      const { data: classifications } = await supabase
        .from('tariff_classifications')
        .select('item_id, hs_code, description, duty_rate, vat_rate, confidence')
        .eq('case_id', caseId)

      // Build header object from extracted fields
      const header: CaseData['header'] = {}
      for (const field of extractedFields || []) {
        header[field.field_name] = {
          value: field.field_value,
          source_document: field.document_id,
          confidence: field.confidence,
        }
      }

      // Build items array with classifications
      const items: CaseData['items'] = (caseItems || []).map(item => {
        const classification = classifications?.find(c => c.item_id === item.id)
        return {
          description: item.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          source_document: item.source_document_id,
          confidence: item.confidence,
          tariff_classification: classification ? {
            hs_code: classification.hs_code,
            description: classification.description,
            duty_rate: classification.duty_rate,
            vat_rate: classification.vat_rate,
            confidence: classification.confidence,
          } : undefined,
        }
      })

      return {
        caseId: caseDetails.id,
        clientName: caseDetails.client_name,
        referenceCode: caseDetails.reference_code || undefined,
        header,
        items,
      } as CaseData
    })

    // Step 2: Run provision agent
    const provisionResult = await step.run('generate-provision-draft', async () => {
      try {
        return await generateProvisionDraft(caseData)
      } catch (error: any) {
        console.error('[generate-provision] Provision generation failed:', error)
        return {
          items: [],
          subtotal: 0,
          total: 0,
          currency: 'CLP',
          notes: 'Provision could not be generated automatically due to an error',
          confidence: 0,
        }
      }
    })

    // Step 3: Save provision + provision_items en DB
    const provisionId = await step.run('save-provision', async () => {
      // Insert main provision record
      const { data: provision, error: provisionError } = await supabase
        .from('provisions')
        .insert({
          case_id: caseId,
          agency_id: agencyId,
          status: 'draft',
          subtotal: provisionResult.subtotal,
          total: provisionResult.total,
          currency: provisionResult.currency,
          notes: provisionResult.notes,
          confidence: provisionResult.confidence,
        })
        .select('id')
        .single()

      if (provisionError || !provision) {
        throw new Error(`Failed to create provision: ${provisionError?.message}`)
      }

      // Insert provision items
      const provisionItems = provisionResult.items.map((item, index) => ({
        provision_id: provision.id,
        item_order: index + 1,
        label: item.label,
        amount: item.amount,
        description: item.description || null,
      }))

      const { error: itemsError } = await supabase
        .from('provision_items')
        .insert(provisionItems)

      if (itemsError) {
        throw new Error(`Failed to create provision items: ${itemsError.message}`)
      }

      return provision.id
    })

    // Step 4: Update case status to 'ready_for_provision'
    await step.run('update-case-status', async () => {
      const { error } = await supabase
        .from('operation_cases')
        .update({ status: 'ready_for_provision' })
        .eq('id', caseId)

      if (error) {
        throw new Error(`Failed to update case status: ${error.message}`)
      }
    })

    // Step 5: Log audit event
    await step.run('log-audit-event', async () => {
      await supabase.from('audit_events').insert({
        agency_id: agencyId,
        case_id: caseId,
        actor_type: 'agent',
        actor_id: 'provision-agent',
        event_name: 'provision_generated',
        event_payload_json: {
          provision_id: provisionId,
          total: provisionResult.total,
          currency: provisionResult.currency,
          items_count: provisionResult.items.length,
          confidence: provisionResult.confidence,
        },
      })
    })

    return {
      status: 'success',
      provisionId,
      total: provisionResult.total,
      currency: provisionResult.currency,
      confidence: provisionResult.confidence,
    }
  }
)
