import { getFlashLiteModel } from '@/lib/agents/gemini'

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
    const model = getFlashLiteModel()
    
    const base64Data = fileBuffer.toString('base64')
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `Extract ALL text from this document exactly as it appears. 
Preserve the structure, tables, headers, and formatting as much as possible.
Return only the extracted text, nothing else.
If this is a table or invoice, preserve the tabular structure using pipes (|) and dashes (-).`,
          },
        ],
      }],
    })

    const rawText = result.response.text()
    
    return {
      rawText,
      pages: 1, // Simplified for MVP
      status: 'success',
    }
  } catch (error) {
    return {
      rawText: '',
      pages: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown OCR error',
    }
  }
}
