import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/provisions - List provisions for the agency
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

    // Get provisions with case info
    const { data: provisions, error } = await supabase
      .from('provisions')
      .select(`
        id,
        case_id,
        status,
        subtotal,
        total,
        currency,
        notes,
        confidence,
        sent_at,
        created_at,
        operation_cases:case_id (client_name, reference_code)
      `)
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ provisions })
  } catch (error) {
    console.error('Error fetching provisions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/provisions - Create manual provision
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
    const { case_id, items, subtotal, total, currency, notes } = body

    if (!case_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Verify case belongs to agency
    const { data: caseData } = await supabase
      .from('operation_cases')
      .select('id')
      .eq('id', case_id)
      .eq('agency_id', profile.agency_id)
      .single()

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Create provision
    const { data: provision, error: provisionError } = await supabase
      .from('provisions')
      .insert({
        case_id,
        agency_id: profile.agency_id,
        status: 'draft',
        subtotal,
        total,
        currency: currency || 'EUR',
        notes,
        confidence: 1.0, // Manual provisions have full confidence
      })
      .select('id')
      .single()

    if (provisionError || !provision) {
      return NextResponse.json({ error: provisionError?.message }, { status: 500 })
    }

    // Insert provision items
    const provisionItems = items.map((item: { label: string; amount: number; description?: string }, index: number) => ({
      provision_id: provision.id,
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

    // Log audit event
    await supabase.from('audit_events').insert({
      agency_id: profile.agency_id,
      case_id,
      actor_type: 'user',
      actor_id: user.id,
      event_name: 'provision_created_manual',
      event_payload_json: {
        provision_id: provision.id,
        total,
        currency,
        items_count: items.length,
      },
    })

    return NextResponse.json({ 
      success: true, 
      provision: { id: provision.id }
    })
  } catch (error) {
    console.error('Error creating provision:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
