import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/provisions/[id] - Get provision details
export async function GET(
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
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 400 })
    }

    // Get provision with items and case info
    const { data: provision, error } = await supabase
      .from('provisions')
      .select(`
        *,
        provision_items (*),
        operation_cases:case_id (client_name, reference_code, status)
      `)
      .eq('id', id)
      .eq('agency_id', profile.agency_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Provision not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ provision })
  } catch (error) {
    console.error('Error fetching provision:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/provisions/[id] - Update provision status/items
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
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 400 })
    }

    // Verify provision belongs to agency
    const { data: existingProvision } = await supabase
      .from('provisions')
      .select('id, case_id, status')
      .eq('id', id)
      .eq('agency_id', profile.agency_id)
      .single()

    if (!existingProvision) {
      return NextResponse.json({ error: 'Provision not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status, items, subtotal, total, notes } = body

    // Update provision fields if provided
    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (subtotal !== undefined) updateData.subtotal = subtotal
    if (total !== undefined) updateData.total = total
    if (notes !== undefined) updateData.notes = notes

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('provisions')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from('provision_items')
        .delete()
        .eq('provision_id', id)

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      // Insert new items
      const provisionItems = items.map((item: { label: string; amount: number; description?: string }, index: number) => ({
        provision_id: id,
        item_order: index + 1,
        label: item.label,
        amount: item.amount,
        description: item.description || null,
      }))

      const { error: itemsError } = await supabase
        .from('provision_items')
        .insert(provisionItems)

      if (itemsError) {
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
      }
    }

    // Log audit event
    await supabase.from('audit_events').insert({
      agency_id: profile.agency_id,
      case_id: existingProvision.case_id,
      actor_type: 'user',
      actor_id: user.id,
      event_name: 'provision_updated',
      event_payload_json: {
        provision_id: id,
        changes: Object.keys(updateData),
        items_updated: items ? true : false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating provision:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
