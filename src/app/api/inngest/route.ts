import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { functions } from '@/inngest/functions'

// Clean env vars - PowerShell pipe adds \r\n to values
if (process.env.INNGEST_SIGNING_KEY) {
  process.env.INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY.trim()
}

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
