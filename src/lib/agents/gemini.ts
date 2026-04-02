import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

export function getFlashModel() {
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' })
}

export function getFlashLiteModel() {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
}

export async function generateJSON(model: ReturnType<typeof genAI.getGenerativeModel>, prompt: string): Promise<unknown> {
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })
  const text = result.response.text()
  return JSON.parse(text)
}
