import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const filePath = formData.get('filePath') as string

    if (!file || !filePath) {
      return NextResponse.json(
        { error: 'Missing file or filePath' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabase.storage
      .from('case-documents')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      console.error('[upload] Storage upload error:', error)
      return NextResponse.json(
        { error: 'Failed to upload file', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, path: data.path })
  } catch (error: any) {
    console.error('[upload] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Upload failed', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
