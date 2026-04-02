import { generateWithGemini, safeParseJson } from './openrouter'

export interface EscalationResult {
  decision: 'auto_continue' | 'needs_human_review'
  priority: 'low' | 'medium' | 'high'
  reasons: string[]
  next_step: string
}

const EMPTY_RESULT: EscalationResult = {
  decision: 'needs_human_review',
  priority: 'high',
  reasons: ['AI response parsing failed'],
  next_step: 'Manual review required',
}

export async function decideEscalation(input: {
  validationStatus: string
  riskScore: number
  criticalFieldConfidence: Record<string, number>
  missingDocuments: string[]
  alertSummary: Array<{ type: string; severity: string }>
  unresolvedConflicts: number
  caseId: string
}): Promise<EscalationResult> {
  const prompt = `SYSTEM
Eres un agente de escalamiento para automatización supervisada.
Tu función es decidir si un caso puede continuar automáticamente o si debe ser revisado por un humano.
Debes ser conservador en casos ambiguos.

USER
Decide el siguiente paso para el expediente ${input.caseId}.

Input:
- validation_status: ${input.validationStatus}
- risk_score: ${input.riskScore}
- critical_field_confidence: ${JSON.stringify(input.criticalFieldConfidence)}
- missing_documents: ${JSON.stringify(input.missingDocuments)}
- alert_summary: ${JSON.stringify(input.alertSummary)}
- unresolved_conflicts: ${input.unresolvedConflicts}

Reglas:
- Si falta documento obligatorio → revisar
- Si existe alerta alta → revisar
- Si confianza promedio de campos críticos < 0.75 → revisar
- Si hay conflictos no resueltos → revisar
- Si no hay alertas críticas y la confianza supera 0.90 → continuar

Output (JSON):
{
  "decision": "auto_continue | needs_human_review",
  "priority": "low | medium | high",
  "reasons": [],
  "next_step": "..."
}`

  const response = await generateWithGemini(prompt, true)
  const { result, usedFallback } = safeParseJson(response.content, EMPTY_RESULT)
  if (usedFallback) {
    result.reasons.push('JSON parsing failed')
  }
  return result
}
