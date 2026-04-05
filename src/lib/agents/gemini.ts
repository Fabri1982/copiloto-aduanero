import { GoogleGenerativeAI } from '@google/generative-ai'

let geminiInstance: GoogleGenerativeAI | null = null

export function getGemini() {
  if (!geminiInstance) {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is missing in environment variables')
    }
    geminiInstance = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  }
  return geminiInstance
}

export const GEMINI_MODEL = 'gemini-2.5-flash-lite'
const GEMINI_TIMEOUT_MS = 90_000 // 90 seconds

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
    console.warn('[Gemini] JSON parse failed, using fallback result')
    return { result: fallback, usedFallback: true }
  }
}

export async function generateWithGemini(
  prompt: string,
  jsonMode = true,
): Promise<AIResponse> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY is missing')
  }

  try {
    const genAI = getGemini()
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.1,
        ...(jsonMode && {
          responseMimeType: 'application/json',
        }),
      },
    })

    const contentPromise = model.generateContent(prompt)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini timeout after ${GEMINI_TIMEOUT_MS / 1000}s`)), GEMINI_TIMEOUT_MS)
    )
    const result = await Promise.race([contentPromise, timeoutPromise])
    const text = result.response.text()

    return {
      content: text,
      model_used: GEMINI_MODEL,
    }
  } catch (error: any) {
    const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Quota exceeded')
    const isTimeout = error?.message?.includes('timeout') || error?.message?.includes('ETIMEDOUT')
    
    if (isTimeout) {
      console.error('[Gemini] Request timed out:', error)
      throw new Error(`Gemini request timed out after ${GEMINI_TIMEOUT_MS / 1000}s. Please try again.`)
    }
    
    if (isRateLimit) {
      console.warn('[Gemini] Rate limit hit, retrying in 60s...')
      await new Promise(resolve => setTimeout(resolve, 60000))
      return generateWithGemini(prompt, jsonMode)
    }
    throw error
  }
}
