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

    // Try Inngest first
    try {
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

      console.log('[documents/process] Inngest event sent successfully:', {
        ids: result.ids,
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Processing started via Inngest', 
        eventIds: result.ids,
        method: 'inngest'
      })
    } catch (inngestError) {
      console.error('[documents/process] Inngest send failed, falling back to direct processing:', inngestError)
      
      // Fallback: redirect to direct processing
      const directResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://copiloto-aduanero.vercel.app'}/api/documents/process-direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const directResult = await directResponse.json()

      if (!directResponse.ok) {
        throw new Error(directResult.error || 'Direct processing failed')
      }

      return NextResponse.json({
        success: true,
        message: 'Processing started via direct method (Inngest fallback)',
        result: directResult,
        method: 'direct-fallback'
      })
    }
  } catch (error) {
    console.error('[documents/process] Error:', error)
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
