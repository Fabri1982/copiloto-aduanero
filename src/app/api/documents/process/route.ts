import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/inngest/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { documentId, caseId, filePath, fileName, mimeType, agencyId } = body

    console.log('[documents/process] Starting processing for document:', {
      documentId,
      caseId,
      filePath,
      fileName,
      agencyId,
    })

    const result = await inngest.send({
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

    console.log('[documents/process] Inngest send result:', {
      ids: result.ids,
      success: true,
    })

    return NextResponse.json({ success: true, message: 'Processing started', eventIds: result.ids })
  } catch (error) {
    console.error('[documents/process] Error sending to Inngest:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start processing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
