import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCommunication } from '@/lib/agents/communication-agent'

// POST /api/provisions/[id]/send - Send provision to client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, name')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 400 })
    }

    // Get provision with case info
    const { data: provision, error: provisionError } = await supabase
      .from('provisions')
      .select(`
        *,
        provision_items (*),
        operation_cases:case_id (id, client_name, reference_code)
      `)
      .eq('id', id)
      .eq('agency_id', profile.agency_id)
      .single()

    if (provisionError || !provision) {
      return NextResponse.json({ error: 'Provision not found' }, { status: 404 })
    }

    const caseData = provision.operation_cases as unknown as { id: string; client_name: string; reference_code: string }

    // Generate communication message
    const communication = await generateCommunication({
      caseId: caseData.id,
      clientName: caseData.client_name,
      referenceCode: caseData.reference_code,
      type: 'explain_provision',
      provisionTotal: provision.total,
      provisionCurrency: provision.currency,
    })

    // Update provision status to sent
    const { error: updateError } = await supabase
      .from('provisions')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update case status
    const { error: caseUpdateError } = await supabase
      .from('operation_cases')
      .update({ status: 'provision_sent' })
      .eq('id', caseData.id)

    if (caseUpdateError) {
      return NextResponse.json({ error: caseUpdateError.message }, { status: 500 })
    }

    // Store client message
    const { error: messageError } = await supabase
      .from('client_messages')
      .insert({
        agency_id: profile.agency_id,
        case_id: caseData.id,
        provision_id: id,
        direction: 'outbound',
        channel: communication.channel,
        subject: communication.subject,
        content: communication.message,
        sent_by: user.id,
      })

    if (messageError) {
      console.error('Error storing message:', messageError)
      // Non-fatal error, continue
    }

    // Log audit event
    await supabase.from('audit_events').insert({
      agency_id: profile.agency_id,
      case_id: caseData.id,
      actor_type: 'user',
      actor_id: user.id,
      event_name: 'provision_sent',
      event_payload_json: {
        provision_id: id,
        total: provision.total,
        currency: provision.currency,
        channel: communication.channel,
      },
    })

    return NextResponse.json({ 
      success: true,
      communication: {
        subject: communication.subject,
        message: communication.message,
        channel: communication.channel,
        cta_text: communication.cta_text,
      }
    })
  } catch (error) {
    console.error('Error sending provision:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
