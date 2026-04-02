import { getOpenRouter, FALLBACK_MODELS } from '../agents/openrouter'

export interface OCRResult {
  rawText: string
  pages: number
  status: 'success' | 'error'
  error?: string
}

export async function extractTextFromDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  try {
    const base64Data = fileBuffer.toString('base64')

    for (const model of FALLBACK_MODELS) {
      try {
        const response = await getOpenRouter().chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract ALL text from this document exactly as it appears. 
Preserve the structure, tables, headers, and formatting.
Return only the extracted text, nothing else.
If this is a table or invoice, preserve the tabular structure using pipes (|).`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`
                  }
                }
              ]
            }
          ],
          max_tokens: 8000,
        })

        const rawText = response.choices[0].message.content || ''
        
        return {
          rawText,
          pages: 1,
          status: 'success',
        }
      } catch (modelError: any) {
        const isRateLimit = modelError?.status === 429 || modelError?.message?.includes('429')
        const isQuotaExceeded = modelError?.message?.includes('Quota exceeded')
        const isRetryable = isRateLimit || isQuotaExceeded || modelError?.status >= 500

        if (!isRetryable) {
          throw modelError
        }

        console.warn(`[OCR] Model ${model} failed (${modelError?.status || modelError?.message}), trying next...`)
      }
    }

    return {
      rawText: '',
      pages: 0,
      status: 'error',
      error: 'All OCR models failed after retries',
    }
  } catch (error: any) {
    console.error('[OCR-OpenRouter] Unexpected error:', error)
    return {
      rawText: '',
      pages: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'OpenRouter OCR failure',
    }
  }
}
