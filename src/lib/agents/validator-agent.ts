import { generateWithOpenRouter } from './openrouter'

export interface ValidationResult {
  status: 'approvable' | 'needs_review' | 'missing_documents'
  risk_score: number
  alerts: Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    message: string
    affected_fields: string[]
    recommended_action: string
  }>
  human_review_required: boolean
  review_reasons: string[]
}

export async function validateCase(
  structuredData: Record<string, unknown>,
  conflicts: Array<Record<string, unknown>>,
  documentTypes: string[],
  caseId: string
): Promise<ValidationResult> {
  const prompt = `SYSTEM
Eres un agente validador para expedientes aduaneros.
Tu misión es detectar inconsistencias y señalar lo que debe revisar un operador humano.
No debes reescribir todo el expediente; solo evaluar calidad, consistencia y completitud.

USER
Evalúa el expediente ${caseId}.

Datos estructurados:
${JSON.stringify(structuredData, null, 2)}

Conflictos detectados:
${JSON.stringify(conflicts, null, 2)}

Tipos de documentos presentes:
${JSON.stringify(documentTypes)}

Revisa:
- consistencia de montos
- moneda presente y consistente
- pesos (bruto/neto)
- bultos
- fechas relevantes
- datos faltantes
- referencias de transporte
- conflictos entre documentos
- campos críticos vacíos (invoice_number, invoice_date, supplier_name, currency, total_amount, transport_reference, gross_weight, package_count)

Devuelve JSON (JSON):
{
  "status": "approvable | needs_review | missing_documents",
  "risk_score": 0,
  "alerts": [{
    "type": "...",
    "severity": "low | medium | high",
    "message": "...",
    "affected_fields": [...],
    "recommended_action": "..."
  }],
  "human_review_required": true,
  "review_reasons": []
}`

  const response = await generateWithOpenRouter(prompt, true)
  return JSON.parse(response.content) as ValidationResult
}
