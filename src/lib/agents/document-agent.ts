import { generateWithOpenRouter, safeParseJson } from './openrouter'

export interface DocumentExtractionResult {
  document_type: string
  fields: Array<{
    name: string
    value: string | null
    confidence: number
    evidence: string
  }>
  items: Array<{
    description: string
    quantity: string | null
    unit_price: string | null
    total_price: string | null
    confidence: number
  }>
  warnings: string[]
}

const EMPTY_RESULT: DocumentExtractionResult = {
  document_type: 'unknown',
  fields: [],
  items: [],
  warnings: ['AI response parsing failed'],
}

export async function classifyAndExtract(
  rawText: string,
  caseId: string
): Promise<DocumentExtractionResult> {
  const prompt = `SYSTEM
Eres un agente documental experto en expedientes de importación para agencias de aduana en Chile.
Tu tarea es analizar documentos comerciales y de transporte, identificar su tipo y extraer solo información visible o altamente sustentada por evidencia documental.
Nunca inventes valores.
Cuando un dato no exista o sea ambiguo, marca null.
Devuelve salida estructurada en JSON válido.

USER
Analiza este documento del expediente ${caseId}.

Texto del documento:
${rawText}

Objetivos:
1. Clasifica el tipo de documento.
2. Extrae datos clave.
3. Identifica si el documento contiene tabla de ítems.
4. Devuelve confianza por campo entre 0 y 1.
5. Devuelve evidencia corta por campo.

Tipos posibles:
- commercial_invoice
- packing_list
- bl
- awb
- payment_receipt
- unknown

Campos deseados:
- document_type
- invoice_number
- invoice_date
- supplier_name
- consignee_name
- currency
- incoterm
- total_amount
- gross_weight
- net_weight
- package_count
- transport_reference
- items[]

Formato de salida (JSON):
{
  "document_type": "...",
  "fields": [{
    "name": "invoice_number",
    "value": "...",
    "confidence": 0.0,
    "evidence": "texto breve encontrado"
  }],
  "items": [{
    "description": "...",
    "quantity": "...",
    "unit_price": "...",
    "total_price": "...",
    "confidence": 0.0
  }],
  "warnings": []
}`

  const response = await generateWithOpenRouter(prompt, true)
  const { result, usedFallback } = safeParseJson(response.content, EMPTY_RESULT)
  if (usedFallback) {
    result.warnings.push('JSON parsing failed, empty result returned')
  }
  return result
}
