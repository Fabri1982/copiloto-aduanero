import { GoogleGenerativeAI } from '@google/generative-ai'

export interface OCRResult {
  rawText: string
  pages: number
  status: 'success' | 'error'
  error?: string
}

let geminiInstance: GoogleGenerativeAI | null = null

function getGemini() {
  if (!geminiInstance) {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY is missing')
    }
    geminiInstance = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  }
  return geminiInstance
}

export async function extractTextFromDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  try {
    const base64Data = fileBuffer.toString('base64')
    const genAI = getGemini()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
      {
        text: `Extract ALL text from this document exactly as it appears. 
Preserve the structure, tables, headers, and formatting.
Return only the extracted text, nothing else.
If this is a table or invoice, preserve the tabular structure using pipes (|).`,
      },
    ])

    const rawText = result.response.text()

    return {
      rawText,
      pages: 1,
      status: 'success',
    }
  } catch (error: any) {
    const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Quota exceeded')

    if (isRateLimit) {
      console.warn('[OCR] Rate limit hit, retrying in 60s...')
      await new Promise(resolve => setTimeout(resolve, 60000))
      return extractTextFromDocument(fileBuffer, mimeType)
    }

    console.error('[OCR-Gemini] Error:', error)
    return {
      rawText: '',
      pages: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Gemini OCR failure',
    }
  }
}
