import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/payments - List payment receipts for the agency
export async function GET(request: NextRequest) {
  try {
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

    // Get URL params for filtering
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('case_id')
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('payment_receipts')
      .select(`
        *,
        operation_cases:case_id (client_name, reference_code),
        provisions:provision_id (total, currency)
      `)
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })

    if (caseId) {
      query = query.eq('case_id', caseId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: receipts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ receipts })
  } catch (error) {
    console.error('Error fetching payment receipts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/payments - Upload new payment receipt
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { case_id, provision_id, file_path, file_name, amount, currency, payment_date, notes } = body

    if (!case_id || !provision_id || !file_path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify case and provision belong to agency
    const { data: caseData } = await supabase
      .from('operation_cases')
      .select('id, status')
      .eq('id', case_id)
      .eq('agency_id', profile.agency_id)
      .single()

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const { data: provisionData } = await supabase
      .from('provisions')
      .select('id, status')
      .eq('id', provision_id)
      .eq('agency_id', profile.agency_id)
      .single()

    if (!provisionData) {
      return NextResponse.json({ error: 'Provision not found' }, { status: 404 })
    }

    // Create payment receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('payment_receipts')
      .insert({
        case_id,
        provision_id,
        agency_id: profile.agency_id,
        file_path,
        file_name,
        amount,
        currency: currency || 'EUR',
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        status: 'pending',
        notes,
        uploaded_by: user.id,
      })
      .select('id')
      .single()

    if (receiptError || !receipt) {
      return NextResponse.json({ error: receiptError?.message }, { status: 500 })
    }

    // Update provision status
    const { error: provisionUpdateError } = await supabase
      .from('provisions')
      .update({ status: 'payment_uploaded' })
      .eq('id', provision_id)

    if (provisionUpdateError) {
      console.error('Error updating provision status:', provisionUpdateError)
    }

    // Update case status
    const { error: caseUpdateError } = await supabase
      .from('operation_cases')
      .update({ status: 'payment_uploaded' })
      .eq('id', case_id)

    if (caseUpdateError) {
      console.error('Error updating case status:', caseUpdateError)
    }

    // Log audit event
    await supabase.from('audit_events').insert({
      agency_id: profile.agency_id,
      case_id,
      actor_type: 'user',
      actor_id: user.id,
      event_name: 'payment_receipt_uploaded',
      event_payload_json: {
        receipt_id: receipt.id,
        provision_id,
        amount,
        currency,
      },
    })

    return NextResponse.json({ 
      success: true, 
      receipt: { id: receipt.id }
    })
  } catch (error) {
    console.error('Error uploading payment receipt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
