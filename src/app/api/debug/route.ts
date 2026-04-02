import { NextResponse } from 'next/server'

export async function GET() {
  const signingKey = process.env.INNGEST_SIGNING_KEY || ''
  const eventKey = process.env.INNGEST_EVENT_KEY || ''
  const inngestDev = process.env.INNGEST_DEV || ''
  
  return NextResponse.json({
    signing_key_prefix: signingKey.substring(0, 20) + '...',
    signing_key_length: signingKey.length,
    signing_key_last_8: signingKey.slice(-8),
    event_key_present: !!eventKey,
    inngest_dev: inngestDev,
    node_env: process.env.NODE_ENV,
  })
}
