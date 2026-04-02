import { generateWithOpenRouter, safeParseJson } from './openrouter'

export interface StructuredCase {
  header: Record<string, {
    value: string | null
    source_document: string
    confidence: number
  }>
  items: Array<{
    description: string
    quantity: number | null
    unit_price: number | null
    total_price: number | null
    source_document: string
    confidence: number
  }>
  conflicts: Array<{
    field_name: string
    conflict_type: string
    left_value: string
    right_value: string
    severity: 'low' | 'medium' | 'high'
  }>
  draft_din: Record<string, string | null>
  field_sources: Array<{
    field: string
    source: string
    document_type: string
  }>
}

const EMPTY_RESULT: StructuredCase = {
  header: {},
  items: [],
  conflicts: [],
  draft_din: {},
  field_sources: [],
}

export async function consolidateCase(
  extractions: Array<{
    documentId: string
    documentType: string
    fields: Array<{ name: string; value: string | null; confidence: number; evidence: string }>
    items: Array<{ description: string; quantity: string | null; unit_price: string | null; total_price: string | null; confidence: number }>
  }>,
  caseId: string
): Promise<StructuredCase> {
  const prompt = `SYSTEM
Eres un agente estructurador de expedientes aduaneros.
Debes consolidar información proveniente de múltiples documentos del mismo caso.
Tu prioridad es consistencia, trazabilidad y prudencia.
No completes con suposiciones arriesgadas.
Si dos documentos difieren, conserva el conflicto y márcalo.

USER
Recibirás varias extracciones documentales del expediente ${caseId}.
Tu tarea es construir una estructura única de operación.

Extracciones:
${JSON.stringify(extractions, null, 2)}

Reglas:
1. Consolida campos equivalentes.
2. Prioriza factura para valores comerciales y documento de transporte para referencias de embarque.
3. Si existe conflicto, no elijas silenciosamente: crea un conflicto explícito.
4. Devuelve confianza consolidada.
5. Devuelve estructura JSON válida.

Salida (JSON):
{
  "header": {
    "campo": { "value": "...", "source_document": "docId", "confidence": 0.0 }
  },
  "items": [...],
  "conflicts": [{ "field_name": "...", "conflict_type": "value_mismatch", "left_value": "...", "right_value": "...", "severity": "medium" }],
  "draft_din": { "consignee": "...", "supplier": "...", "invoice_number": "...", "total_amount": "...", "currency": "...", "incoterm": "...", "transport_reference": "...", "gross_weight": "...", "package_count": "..." },
  "field_sources": [{ "field": "...", "source": "docId", "document_type": "..." }]
}`

  const response = await generateWithOpenRouter(prompt, true)
  const { result, usedFallback } = safeParseJson(response.content, EMPTY_RESULT)
  if (usedFallback) {
    result.conflicts.push({
      field_name: 'consolidation',
      conflict_type: 'parse_error',
      left_value: '',
      right_value: '',
      severity: 'high',
    })
  }
  return result
}
