import { generateWithGemini, safeParseJson } from './gemini'

export type CommunicationType = 'missing_documents' | 'explain_provision' | 'request_payment_proof' | 'general_update'

export interface CommunicationResult {
  subject: string
  message: string
  channel: 'email' | 'whatsapp' | 'portal'
  cta_text: string
}

export interface CommunicationContext {
  caseId: string
  clientName: string
  referenceCode?: string
  type: CommunicationType
  missingDocuments?: string[]
  provisionTotal?: number
  provisionCurrency?: string
  customMessage?: string
}

const EMPTY_RESULT: CommunicationResult = {
  subject: 'Actualización de expediente',
  message: 'Estimado cliente, nos ponemos en contacto para informarle sobre el estado de su expediente. Por favor, contáctenos para más detalles.',
  channel: 'email',
  cta_text: 'Contactar',
}

export async function generateCommunication(context: CommunicationContext): Promise<CommunicationResult> {
  let specificInstructions = ''
  
  switch (context.type) {
    case 'missing_documents':
      specificInstructions = `
Contexto: Solicitar documentos faltantes al cliente.
Documentos requeridos: ${context.missingDocuments?.join(', ') || 'No especificados'}
Instrucciones:
- Sé claro sobre qué documentos faltan
- Explica brevemente por qué son necesarios
- Indica el plazo para enviarlos
- Mantén un tono servicial y profesional`
      break
    case 'explain_provision':
      specificInstructions = `
Contexto: Explicar la provisión de gastos al cliente.
Monto total: ${context.provisionTotal} ${context.provisionCurrency}
Instrucciones:
- Explica qué es una provisión y por qué es necesaria
- Desglosa brevemente los conceptos principales
- Indica los próximos pasos (pago, documentación, etc.)
- Responde a posibles dudas frecuentes`
      break
    case 'request_payment_proof':
      specificInstructions = `
Contexto: Solicitar comprobante de pago de la provisión.
Instrucciones:
- Agradece la gestión del pago
- Solicita el comprobante/justificante
- Explica cómo enviarlo (portal, email, etc.)
- Indica que se procederá con la operación una vez recibido`
      break
    case 'general_update':
      specificInstructions = `
Contexto: Actualización general sobre el estado del expediente.
Mensaje adicional: ${context.customMessage || 'Ninguno'}
Instrucciones:
- Resume el estado actual del expediente
- Comunica cualquier novedad relevante
- Indica próximos pasos si los hay
- Mantén al cliente informado de forma proactiva`
      break
  }

  const prompt = `SYSTEM
Eres un agente de comunicación de una agencia aduanera.
Tu tarea es generar mensajes profesionales pero amigables para clientes.

Tono:
- Profesional pero cercano
- Claro y sin jerga técnica innecesaria
- Servicial y orientado a soluciones
- Siempre en español

Estructura del mensaje:
- Asunto claro y descriptivo
- Saludo personalizado
- Cuerpo del mensaje bien estructurado
- Llamada a la acción (CTA) clara
- Despedida profesional

${specificInstructions}

USER
Genera un mensaje para el cliente con los siguientes datos:

Expediente: ${context.caseId}
Cliente: ${context.clientName}
Referencia: ${context.referenceCode || 'N/A'}

Salida esperada (JSON):
{
  "subject": "Asunto del mensaje",
  "message": "Cuerpo completo del mensaje con saludo y despedida",
  "channel": "email",
  "cta_text": "Texto para el botón o llamada a la acción"
}`

  const response = await generateWithGemini(prompt, true)
  const { result } = safeParseJson(response.content, EMPTY_RESULT)
  return result
}
