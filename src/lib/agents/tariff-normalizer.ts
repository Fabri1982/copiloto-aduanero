import { generateWithGemini, safeParseJson } from './openrouter'

export interface TariffResult {
  chile_hs_code_8: string
  short_description: string
  long_description: string
  normalized_composition: string
  classification_notes: string[]
  confidence: number
  needs_human_review: boolean
}

const EMPTY_RESULT: TariffResult = {
  chile_hs_code_8: '',
  short_description: '',
  long_description: '',
  normalized_composition: '',
  classification_notes: ['JSON parsing failed'],
  confidence: 0,
  needs_human_review: true,
}

export async function normalizeToChileanTariff(input: {
  productName: string
  description: string
  department?: string
  composition?: string
  originHsCode?: string
  brand?: string
  caseId: string
}): Promise<TariffResult> {
  const prompt = `SYSTEM
Eres un agente experto en homologación arancelaria para operaciones de importación en Chile.
Tu objetivo es transformar descripciones comerciales desordenadas en una salida operativa útil para una agencia de aduanas.
Debes proponer una partida arancelaria chilena de 8 dígitos sin puntos, una descripción corta, una descripción larga y una composición normalizada cuando exista evidencia suficiente.
Nunca inventes materiales, porcentajes ni usos que no estén respaldados.
Si la información es insuficiente o ambigua, debes marcar revisión humana.
Responde en JSON válido.

USER
Analiza este producto del expediente ${input.caseId}.

Entradas:
- product_name: ${input.productName}
- article_description: ${input.description}
- department: ${input.department || 'N/A'}
- composition: ${input.composition || 'N/A'}
- origin_hs_code: ${input.originHsCode || 'N/A'}
- brand: ${input.brand || 'N/A'}

Objetivos:
1. Homologar a código chileno de 8 dígitos sin puntos.
2. Redactar una descripción corta operativa, ideal para carga en software aduanero.
3. Redactar una descripción larga más completa para expediente o revisión.
4. Normalizar la composición en español y en formato claro.
5. Indicar confianza y necesidad de revisión humana.

Formato de salida (JSON):
{
  "chile_hs_code_8": "",
  "short_description": "",
  "long_description": "",
  "normalized_composition": "",
  "classification_notes": [""],
  "confidence": 0.0,
  "needs_human_review": true
}`

  const response = await generateWithGemini(prompt, true)
  const { result, usedFallback } = safeParseJson(response.content, EMPTY_RESULT)
  if (usedFallback) {
    result.needs_human_review = true
    result.classification_notes.push('JSON parsing failed, manual review required')
  }
  return result
}
