import { getOpenRouter } from '../agents/openrouter'

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
    const model = 'google/gemini-2.0-flash-lite:free'

    const response = await getOpenRouter().chat.completions.create({
      model: model,
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
      max_tokens: 4000,
    })

    const rawText = response.choices[0].message.content || ''
    
    return {
      rawText,
      pages: 1,
      status: 'success',
    }
  } catch (error: any) {
    console.error('[OCR-OpenRouter] Error:', error)
    return {
      rawText: '',
      pages: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'OpenRouter OCR failure',
    }
  }
}
