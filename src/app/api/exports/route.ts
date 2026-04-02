import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateExport, getPredefinedProfiles, type ExportProfile, type ExportableCaseData } from '@/lib/agents/export-agent'

// GET /api/exports/profiles - Get available export profiles
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

    // Get predefined profiles
    const predefinedProfiles = getPredefinedProfiles()

    // Get custom profiles from database (if any)
    const { data: customProfiles } = await supabase
      .from('export_profiles')
      .select('*')
      .eq('agency_id', profile.agency_id)

    const profiles = [
      ...predefinedProfiles.map(p => ({ ...p, is_predefined: true })),
      ...(customProfiles || []).map(p => ({ ...p, is_predefined: false })),
    ]

    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('Error fetching export profiles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/exports - Generate export
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
    const { case_id, profile_id, profile_key } = body

    if (!case_id) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 })
    }

    if (!profile_id && !profile_key) {
      return NextResponse.json({ error: 'Profile ID or key is required' }, { status: 400 })
    }

    // Verify case belongs to agency
    const { data: caseData, error: caseError } = await supabase
      .from('operation_cases')
      .select('id, client_name, reference_code, status, priority')
      .eq('id', case_id)
      .eq('agency_id', profile.agency_id)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Get export profile
    let exportProfile: ExportProfile | null = null

    if (profile_id) {
      // Get custom profile from database
      const { data: customProfile } = await supabase
        .from('export_profiles')
        .select('*')
        .eq('id', profile_id)
        .eq('agency_id', profile.agency_id)
        .single()
      exportProfile = customProfile
    } else if (profile_key) {
      // Get predefined profile
      const predefinedProfiles = getPredefinedProfiles()
      const predefined = predefinedProfiles.find(p => p.profile_key === profile_key)
      if (predefined) {
        exportProfile = {
          ...predefined,
          id: profile_key,
          agency_id: profile.agency_id,
          created_at: new Date().toISOString(),
        } as ExportProfile
      }
    }

    if (!exportProfile) {
      return NextResponse.json({ error: 'Export profile not found' }, { status: 404 })
    }

    // Get extracted fields for the case
    const { data: extractedFields } = await supabase
      .from('extracted_fields')
      .select('field_name, field_value, confidence, document_id')
      .eq('case_id', case_id)

    // Get extracted items
    const { data: extractedItems } = await supabase
      .from('extracted_items')
      .select('id, description, quantity, unit_price, total_price, confidence, document_id')
      .eq('case_id', case_id)

    // Get tariff classifications
    const { data: classifications } = await supabase
      .from('tariff_classifications')
      .select('item_id, hs_code, description, duty_rate, vat_rate')
      .eq('case_id', case_id)

    // Get conflicts
    const { data: conflicts } = await supabase
      .from('case_conflicts')
      .select('field_name, severity')
      .eq('case_id', case_id)

    // Build exportable case data
    const header: ExportableCaseData['header'] = {}
    for (const field of extractedFields || []) {
      header[field.field_name] = {
        value: field.field_value,
        source_document: field.document_id,
        confidence: field.confidence,
      }
    }

    const items: ExportableCaseData['items'] = (extractedItems || []).map(item => {
      const classification = classifications?.find(c => c.item_id === item.id)
      return {
        description: item.description || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        source_document: item.document_id,
        confidence: item.confidence,
        tariff_classification: classification ? {
          hs_code: classification.hs_code,
          description: classification.description,
          duty_rate: classification.duty_rate,
          vat_rate: classification.vat_rate,
        } : undefined,
      }
    })

    const exportableData: ExportableCaseData = {
      caseId: caseData.id,
      clientName: caseData.client_name,
      referenceCode: caseData.reference_code || undefined,
      status: caseData.status,
      priority: caseData.priority,
      header,
      items,
      conflicts: conflicts || [],
    }

    // Generate export
    const exportResult = generateExport(exportableData, exportProfile)

    // Store export job record
    const { data: exportJob, error: jobError } = await supabase
      .from('export_jobs')
      .insert({
        agency_id: profile.agency_id,
        case_id,
        profile_id: profile_id || profile_key,
        profile_name: exportProfile.name,
        format: exportProfile.format,
        status: 'completed',
        file_name: exportResult.filename,
        warnings: exportResult.warnings,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (jobError) {
      console.error('Error storing export job:', jobError)
    }

    // Log audit event
    await supabase.from('audit_events').insert({
      agency_id: profile.agency_id,
      case_id,
      actor_type: 'user',
      actor_id: user.id,
      event_name: 'export_generated',
      event_payload_json: {
        export_job_id: exportJob?.id,
        profile_id: profile_id || profile_key,
        profile_name: exportProfile.name,
        format: exportProfile.format,
        warnings_count: exportResult.warnings.length,
      },
    })

    return NextResponse.json({
      success: true,
      export: {
        headers: exportResult.headers,
        rows: exportResult.rows,
        warnings: exportResult.warnings,
        format: exportResult.format,
        filename: exportResult.filename,
      },
    })
  } catch (error) {
    console.error('Error generating export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
