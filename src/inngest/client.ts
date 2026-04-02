import { Inngest } from 'inngest'

// Clean env vars globally - PowerShell pipe adds \r\n to values set via Vercel CLI
// This must be done here (not just in route.ts) because each Vercel serverless
// function is isolated - trimming in /api/inngest doesn't affect /api/documents/process
if (process.env.INNGEST_SIGNING_KEY) {
  process.env.INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY.trim()
}
if (process.env.INNGEST_EVENT_KEY) {
  process.env.INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY.trim()
}

export const inngest = new Inngest({ 
  id: 'copiloto-aduanero',
  name: 'Copiloto Aduanero',
})
