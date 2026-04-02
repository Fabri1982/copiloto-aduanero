import { generateWithOpenRouter } from './openrouter'

export interface ProvisionItem {
  label: string
  amount: number
  description?: string
}

export interface ProvisionResult {
  items: ProvisionItem[]
  subtotal: number
  total: number
  currency: string
  notes: string
  confidence: number
}

export interface CaseData {
  caseId: string
  clientName: string
  referenceCode?: string
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
    tariff_classification?: {
      hs_code: string
      description: string
      duty_rate: number
      vat_rate: number
      confidence: number
    }
  }>
}

export async function generateProvisionDraft(caseData: CaseData): Promise<ProvisionResult> {
  const prompt = `SYSTEM
Eres un agente de provisión aduanera experto en comercio internacional.
Tu tarea es generar un borrador de provisión de gastos basado en los datos del expediente.

Conceptos típicos a considerar:
- Derechos aduaneros (basado en clasificación arancelaria)
- IVA de importación
- Comisión de agencia aduanera
- Almacenaje portuario
- Transporte/local
- Tramitación/gestión documental
- Tasas portuarias/aeroportuarias
- Seguro (si aplica)

Reglas:
1. Calcula derechos basándote en los valores CIF y tasas arancelarias
2. El IVA generalmente es 21% en España (o 19% en Chile, ajusta según el contexto)
3. Usa estimaciones razonables para conceptos no especificados
4. Indica claramente qué conceptos son estimados vs calculados
5. Devuelve siempre la moneda del expediente
6. Incluye notas explicativas sobre los cálculos

USER
Genera una provisión de gastos para el siguiente expediente:

Expediente ID: ${caseData.caseId}
Cliente: ${caseData.clientName}
Referencia: ${caseData.referenceCode || 'N/A'}

Datos consolidados:
${JSON.stringify(caseData.header, null, 2)}

Ítems con clasificación arancelaria:
${JSON.stringify(caseData.items, null, 2)}

Salida esperada (JSON):
{
  "items": [
    { "label": "Derechos aduaneros", "amount": 0.00, "description": "X% sobre valor CIF" },
    { "label": "IVA importación", "amount": 0.00, "description": "X% sobre (CIF + derechos)" },
    { "label": "Comisión agencia", "amount": 0.00 },
    { "label": "Almacenaje", "amount": 0.00 },
    { "label": "Transporte", "amount": 0.00 },
    { "label": "Tramitación", "amount": 0.00 }
  ],
  "subtotal": 0.00,
  "total": 0.00,
  "currency": "EUR",
  "notes": "Descripción de cálculos y estimaciones",
  "confidence": 0.0
}`

  const response = await generateWithOpenRouter(prompt, true)
  return JSON.parse(response.content) as ProvisionResult
}
