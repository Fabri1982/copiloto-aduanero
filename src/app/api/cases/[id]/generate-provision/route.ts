import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'

// POST /api/cases/[id]/generate-provision - Trigger provision generation pipeline
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 400 })
    }

    // Verify case belongs to agency
    const { data: caseData, error: caseError } = await supabase
      .from('operation_cases')
      .select('id, status')
      .eq('id', caseId)
      .eq('agency_id', profile.agency_id)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Check if case has required data for provision generation
    const { data: extractedFields } = await supabase
      .from('extracted_fields')
      .select('id')
      .eq('case_id', caseId)
      .limit(1)

    if (!extractedFields || extractedFields.length === 0) {
      return NextResponse.json(
        { error: 'Case has no extracted data. Process documents first.' },
        { status: 400 }
      )
    }

    // Check if provision already exists
    const { data: existingProvision } = await supabase
      .from('provisions')
      .select('id, status')
      .eq('case_id', caseId)
      .eq('agency_id', profile.agency_id)
      .in('status', ['draft', 'ready_to_send'])
      .single()

    if (existingProvision) {
      return NextResponse.json(
        { error: 'A provision already exists for this case', provision_id: existingProvision.id },
        { status: 409 }
      )
    }

    // Trigger Inngest event
    await inngest.send({
      name: 'case/generate-provision',
      data: { 
        caseId, 
        agencyId: profile.agency_id,
        triggeredBy: user.id,
      },
    })

    // Log audit event
    await supabase.from('audit_events').insert({
      agency_id: profile.agency_id,
      case_id: caseId,
      actor_type: 'user',
      actor_id: user.id,
      event_name: 'provision_generation_triggered',
      event_payload_json: {
        case_status: caseData.status,
      },
    })

    return NextResponse.json({ 
      success: true,
      message: 'Provision generation pipeline triggered',
      case_id: caseId,
    })
  } catch (error) {
    console.error('Error triggering provision generation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
