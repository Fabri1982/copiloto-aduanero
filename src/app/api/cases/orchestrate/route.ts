import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/inngest/client'

export async function POST(request: NextRequest) {
  try {
    const { caseId, agencyId } = await request.json()
    
    await inngest.send({
      name: 'case/ready-for-orchestration',
      data: { caseId, agencyId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to trigger orchestration' }, { status: 500 })
  }
}
