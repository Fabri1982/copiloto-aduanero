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
    })
  }
  return openRouterInstance
}

// Default free models to rotate if one fails
export const FREE_MODELS = [
  'google/gemini-2.0-flash-lite:free',
  'google/gemini-2.0-flash:free',
  'meta-llama/llama-3.3-70b-instruct:free',
]

export interface AIResponse {
  content: string
  model_used: string
}

export async function generateWithOpenRouter(
  prompt: string, 
  jsonMode = true,
  preferredModel = 'google/gemini-2.0-flash-lite:free'
): Promise<AIResponse> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is missing')
  }

  try {
    const response = await getOpenRouter().chat.completions.create({
      model: preferredModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: jsonMode ? { type: 'json_object' } : undefined,
      temperature: 0.1,
    })

    return {
      content: response.choices[0].message.content || '',
      model_used: preferredModel
    }
  } catch (error: any) {
    console.error(`[OpenRouter] Error with ${preferredModel}:`, error)
    
    // Auto-retry with a different free model if 429
    if (error?.status === 429 && preferredModel !== FREE_MODELS[1]) {
      console.log(`[OpenRouter] Retrying with fallback: ${FREE_MODELS[1]}`)
      return generateWithOpenRouter(prompt, jsonMode, FREE_MODELS[1])
    }
    
    throw error
  }
}
