import OpenAI from 'openai'

let openRouterInstance: OpenAI | null = null

export function getOpenRouter() {
  if (!openRouterInstance) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is missing in environment variables')
    }
    openRouterInstance = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'https://copiloto-aduanero.vercel.app',
        'X-Title': 'Copiloto Aduanero',
      },
      timeout: 60000,
      maxRetries: 2,
    })
  }
  return openRouterInstance
}

export const FALLBACK_MODELS = [
  'openrouter/free',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.5-flash-lite:free',
  'qwen/qwen-2.5-72b-instruct:free',
]

export interface AIResponse {
  content: string
  model_used: string
}

export function safeParseJson<T>(content: string, fallback: T): { result: T; usedFallback: boolean } {
  try {
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()
    return { result: JSON.parse(cleaned) as T, usedFallback: false }
  } catch {
    console.warn('[OpenRouter] JSON parse failed, using fallback result')
    return { result: fallback, usedFallback: true }
  }
}

async function tryModel(
  model: string,
  prompt: string,
  jsonMode: boolean,
): Promise<AIResponse> {
  const response = await getOpenRouter().chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: jsonMode ? { type: 'json_object' } : undefined,
    temperature: 0.1,
  })

  return {
    content: response.choices[0].message.content || '',
    model_used: model,
  }
}

export async function generateWithOpenRouter(
  prompt: string,
  jsonMode = true,
): Promise<AIResponse> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is missing')
  }

  let lastError: Error | null = null

  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const model = FALLBACK_MODELS[i]
    try {
      console.log(`[OpenRouter] Trying model: ${model}`)
      return await tryModel(model, prompt, jsonMode)
    } catch (error: any) {
      lastError = error
      const isRateLimit = error?.status === 429 || error?.message?.includes('429')
      const isQuotaExceeded = error?.message?.includes('Quota exceeded')
      const isRetryable = isRateLimit || isQuotaExceeded || error?.status >= 500

      console.error(`[OpenRouter] Error with ${model}: ${error?.message || error}`)

      if (!isRetryable) {
        throw error
      }

      if (i < FALLBACK_MODELS.length - 1) {
        console.log(`[OpenRouter] Retrying with next model: ${FALLBACK_MODELS[i + 1]}`)
      }
    }
  }

  throw lastError || new Error('All OpenRouter models failed')
}
