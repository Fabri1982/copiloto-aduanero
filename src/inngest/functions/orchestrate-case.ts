import { inngest } from '../client'
import { createAdminClient } from '@/lib/supabase/admin'
import { consolidateCase } from '@/lib/agents/structurer-agent'
import { validateCase } from '@/lib/agents/validator-agent'
import { decideEscalation } from '@/lib/agents/escalation-agent'

export const orchestrateCase = inngest.createFunction(
  { id: 'orchestrate-case', retries: 1, triggers: [{ event: 'case/ready-for-orchestration' }] },
  async ({ event, step }) => {
    const { caseId, agencyId } = event.data
    const supabase = createAdminClient()

    // Step 1: Gather all extractions for this case
    const extractions = await step.run('gather-extractions', async () => {
      const { data: documents } = await supabase
        .from('case_documents')
        .select('id, document_type, file_name')
        .eq('case_id', caseId)

      if (!documents || documents.length === 0) return []

      const results = []
      for (const doc of documents) {
        const { data: extraction } = await supabase
          .from('document_extractions')
          .select('extraction_json')
          .eq('document_id', doc.id)
          .eq('status', 'completed')
          .single()

        if (extraction?.extraction_json) {
          const ext = extraction.extraction_json as Record<string, unknown>
          results.push({
            documentId: doc.id,
            documentType: (ext.document_type as string) || doc.document_type,
            fields: (ext.fields as Array<{ name: string; value: string | null; confidence: number; evidence: string }>) || [],
            items: (ext.items as Array<{ description: string; quantity: string | null; unit_price: string | null; total_price: string | null; confidence: number }>) || [],
          })
        }
      }
      return results
    })

    if (extractions.length === 0) {
      return { status: 'no_extractions' }
    }

    // Step 2: Consolidate with Structurer Agent
    const structured = await step.run('consolidate-case', async () => {
      return await consolidateCase(extractions, caseId)
    })

    // Step 3: Save conflicts
    await step.run('save-conflicts', async () => {
      if (structured.conflicts && structured.conflicts.length > 0) {
        const conflictsToInsert = structured.conflicts.map(c => ({
          case_id: caseId,
          field_name: c.field_name,
          conflict_type: c.conflict_type,
          left_value: c.left_value,
          right_value: c.right_value,
          severity: c.severity,
        }))
        await supabase.from('case_conflicts').insert(conflictsToInsert)
      }

      // Audit event
      await supabase.from('audit_events').insert({
        agency_id: agencyId,
        case_id: caseId,
        actor_type: 'agent',
        actor_id: 'structurer-agent',
        event_name: 'case_consolidated',
        event_payload_json: {
          fields_count: Object.keys(structured.header || {}).length,
          items_count: structured.items?.length || 0,
          conflicts_count: structured.conflicts?.length || 0,
        },
      })
    })

    // Step 4: Validate
    const documentTypes = extractions.map(e => e.documentType)
    const validation = await step.run('validate-case', async () => {
      return await validateCase(
        structured.header as unknown as Record<string, unknown>,
        structured.conflicts as unknown as Array<Record<string, unknown>>,
        documentTypes,
        caseId
      )
    })

    // Step 5: Save validation alerts
    await step.run('save-validation-alerts', async () => {
      if (validation.alerts && validation.alerts.length > 0) {
        const alertsToInsert = validation.alerts.map(a => ({
          case_id: caseId,
          alert_type: a.type,
          severity: a.severity,
          message: a.message,
          affected_fields_json: a.affected_fields,
          recommended_action: a.recommended_action,
        }))
        await supabase.from('validation_alerts').insert(alertsToInsert)
      }

      await supabase.from('audit_events').insert({
        agency_id: agencyId,
        case_id: caseId,
        actor_type: 'agent',
        actor_id: 'validator-agent',
        event_name: 'case_validated',
        event_payload_json: {
          status: validation.status,
          risk_score: validation.risk_score,
          alerts_count: validation.alerts?.length || 0,
          human_review_required: validation.human_review_required,
        },
      })
    })

    // Step 6: Decide escalation
    const escalation = await step.run('decide-escalation', async () => {
      // Get critical field confidences
      const { data: fields } = await supabase
        .from('extracted_fields')
        .select('field_name, confidence')
        .eq('case_id', caseId)

      const criticalFields = ['invoice_number', 'invoice_date', 'supplier_name', 'currency', 'total_amount', 'transport_reference', 'gross_weight', 'package_count']
      const criticalConfidence: Record<string, number> = {}
      for (const cf of criticalFields) {
        const field = fields?.find(f => f.field_name === cf)
        criticalConfidence[cf] = field?.confidence ?? 0
      }

      // Check missing document types
      const requiredTypes = ['commercial_invoice']
      const presentTypes = documentTypes
      const missingDocs = requiredTypes.filter(t => !presentTypes.includes(t))

      return await decideEscalation({
        validationStatus: validation.status,
        riskScore: validation.risk_score,
        criticalFieldConfidence: criticalConfidence,
        missingDocuments: missingDocs,
        alertSummary: validation.alerts.map(a => ({ type: a.type, severity: a.severity })),
        unresolvedConflicts: structured.conflicts?.length || 0,
        caseId,
      })
    })

    // Step 7: Update case status based on escalation
    await step.run('update-case-status', async () => {
      const newStatus = escalation.decision === 'auto_continue' 
        ? 'ready_for_provision' 
        : 'needs_review'
      
      await supabase
        .from('operation_cases')
        .update({ status: newStatus, priority: escalation.priority })
        .eq('id', caseId)

      await supabase.from('audit_events').insert({
        agency_id: agencyId,
        case_id: caseId,
        actor_type: 'agent',
        actor_id: 'escalation-agent',
        event_name: 'escalation_decided',
        event_payload_json: {
          decision: escalation.decision,
          priority: escalation.priority,
          reasons: escalation.reasons,
          next_step: escalation.next_step,
        },
      })
    })

    return {
      status: 'success',
      escalation: escalation.decision,
      validationStatus: validation.status,
      riskScore: validation.risk_score,
    }
  }
)
