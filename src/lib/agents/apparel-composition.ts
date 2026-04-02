import { generateWithGemini, safeParseJson } from './openrouter'

export interface ApparelResult {
  category_normalized: string
  target_user: string
  short_description: string
  long_description: string
  normalized_composition: string
  missing_attributes: string[]
  confidence: number
}

const EMPTY_RESULT: ApparelResult = {
  category_normalized: '',
  target_user: '',
  short_description: '',
  long_description: '',
  normalized_composition: '',
  missing_attributes: ['JSON parsing failed'],
  confidence: 0,
}

export async function normalizeApparel(input: {
  description: string
  composition?: string
  category?: string
}): Promise<ApparelResult> {
  const prompt = `SYSTEM
Eres un especialista en normalización de vestuario, calzado y accesorios para uso aduanero en Chile.
Debes traducir, simplificar y normalizar atributos comerciales para generar una salida clara, breve y consistente.
No inventes porcentajes ni materiales faltantes.
Si la composición no está completa, dilo explícitamente.

USER
Procesa este producto textil o de calzado.

Descripción: ${input.description}
Composición: ${input.composition || 'No disponible'}
Categoría: ${input.category || 'No especificada'}

Devuelve (JSON):
{
  "category_normalized": "",
  "target_user": "",
  "short_description": "",
  "long_description": "",
  "normalized_composition": "",
  "missing_attributes": [],
  "confidence": 0.0
}`

  const response = await generateWithGemini(prompt, true)
  const { result } = safeParseJson(response.content, EMPTY_RESULT)
  return result
}
