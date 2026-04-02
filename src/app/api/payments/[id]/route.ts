import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/payments/[id] - Validate or reject payment receipt
export async function PATCH(
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
      .select('agency_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 400 })
    }

    // Get receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('payment_receipts')
      .select('*, provisions:provision_id (id, case_id)')
      .eq('id', id)
      .eq('agency_id', profile.agency_id)
      .single()

    if (receiptError || !receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status, rejection_reason } = body

    if (!status || !['validated', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (status === 'rejected' && !rejection_reason) {
      return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 })
    }

    // Update receipt status
    const updateData: Record<string, unknown> = {
      status,
      validated_by: user.id,
      validated_at: new Date().toISOString(),
    }

    if (rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    const { error: updateError } = await supabase
      .from('payment_receipts')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const provision = receipt.provisions as unknown as { id: string; case_id: string }

    // Update provision and case status based on validation
    if (status === 'validated') {
      // Update provision status
      await supabase
        .from('provisions')
        .update({ status: 'payment_validated' })
        .eq('id', provision.id)

      // Update case status
      await supabase
        .from('operation_cases')
        .update({ status: 'closed' })
        .eq('id', provision.case_id)
    } else {
      // If rejected, revert to provision_sent status
      await supabase
        .from('provisions')
        .update({ status: 'sent' })
        .eq('id', provision.id)

      await supabase
        .from('operation_cases')
        .update({ status: 'provision_sent' })
        .eq('id', provision.case_id)
    }

    // Log audit event
    await supabase.from('audit_events').insert({
      agency_id: profile.agency_id,
      case_id: provision.case_id,
      actor_type: 'user',
      actor_id: user.id,
      event_name: status === 'validated' ? 'payment_validated' : 'payment_rejected',
      event_payload_json: {
        receipt_id: id,
        provision_id: provision.id,
        amount: receipt.amount,
        rejection_reason: rejection_reason || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating payment receipt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
