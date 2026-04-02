import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { functions } from '@/inngest/functions'

// Vercel serverless max duration (recommended by Inngest docs)
export const maxDuration = 300

// Note: env var trimming is done in @/inngest/client.ts (shared across all routes)

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
