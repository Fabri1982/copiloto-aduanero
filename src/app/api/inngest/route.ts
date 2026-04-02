import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { functions } from '@/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  signingKey: process.env.INNGEST_SIGNING_KEY?.trim(),
  signingKeyFallback: process.env.INNGEST_SIGNING_KEY_FALLBACK?.trim(),
})
