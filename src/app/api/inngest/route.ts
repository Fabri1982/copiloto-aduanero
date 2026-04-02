import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { functions } from '@/inngest/functions'

// Clean env vars - PowerShell pipe can add \r\n to values
if (process.env.INNGEST_SIGNING_KEY) {
  process.env.INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY.trim()
}
if (process.env.INNGEST_EVENT_KEY) {
  process.env.INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY.trim()
}

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
