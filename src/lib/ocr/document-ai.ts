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

const OCR_TIMEOUT_MS = 120_000 // 2 minutes
const MAX_FILE_SIZE_MB = 50 // Conservative limit

export async function extractTextFromDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  try {
    const fileSizeMB = fileBuffer.length / (1024 * 1024)
    console.log(`[OCR] File size: ${fileSizeMB.toFixed(2)}MB, MIME: ${mimeType}`)
    
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      return {
        rawText: '',
        pages: 0,
        status: 'error',
        error: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum: ${MAX_FILE_SIZE_MB}MB`,
      }
    }

    const base64Data = fileBuffer.toString('base64')
    const genAI = getGemini()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    console.log('[OCR] Sending request to Gemini...')
    const startTime = Date.now()

    const contentPromise = model.generateContent([
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

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`OCR timeout after ${OCR_TIMEOUT_MS / 1000}s`)), OCR_TIMEOUT_MS)
    )

    const result = await Promise.race([contentPromise, timeoutPromise])
    const duration = Date.now() - startTime
    console.log(`[OCR] Gemini responded in ${duration}ms`)

    const rawText = result.response.text()

    return {
      rawText,
      pages: 1,
      status: 'success',
    }
  } catch (error: any) {
    const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Quota exceeded')
    const isTimeout = error?.message?.includes('timeout') || error?.message?.includes('ETIMEDOUT')

    if (isRateLimit) {
      console.warn('[OCR] Rate limit hit, retrying in 60s...')
      await new Promise(resolve => setTimeout(resolve, 60000))
      return extractTextFromDocument(fileBuffer, mimeType)
    }

    if (isTimeout) {
      console.error('[OCR] Request timed out:', error)
      return {
        rawText: '',
        pages: 0,
        status: 'error',
        error: `OCR request timed out after ${OCR_TIMEOUT_MS / 1000}s. The document may be too complex.`,
      }
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
