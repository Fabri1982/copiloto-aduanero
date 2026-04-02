import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/inngest/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { documentId, caseId, filePath, fileName, mimeType, agencyId } = body

    await inngest.send({
      name: 'document/uploaded',
      data: {
        documentId,
        caseId,
        filePath,
        fileName,
        mimeType,
        agencyId,
      },
    })

    return NextResponse.json({ success: true, message: 'Processing started' })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to start processing' },
      { status: 500 }
    )
  }
}
