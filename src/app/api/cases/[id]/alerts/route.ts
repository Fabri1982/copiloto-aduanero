import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/cases/[id]/alerts - Fetch validation alerts for a case
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id: caseId } = await params

    // Verify user has access to this case
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Verify case belongs to user's agency
    const { data: caseItem } = await supabase
      .from("operation_cases")
      .select("id")
      .eq("id", caseId)
      .eq("agency_id", profile.agency_id)
      .single()

    if (!caseItem) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    // Fetch alerts
    const { data: alerts, error } = await supabase
      .from("validation_alerts")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching alerts:", error)
      return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
    }

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error("Error in GET /api/cases/[id]/alerts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/cases/[id]/alerts - Resolve an alert
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id: caseId } = await params

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Verify case belongs to user's agency
    const { data: caseItem } = await supabase
      .from("operation_cases")
      .select("id")
      .eq("id", caseId)
      .eq("agency_id", profile.agency_id)
      .single()

    if (!caseItem) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { alertId, resolved } = body

    if (!alertId || typeof resolved !== "boolean") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Update alert
    const { data: alert, error } = await supabase
      .from("validation_alerts")
      .update({
        resolved,
        resolved_by: resolved ? user.id : null,
        resolved_at: resolved ? new Date().toISOString() : null,
      })
      .eq("id", alertId)
      .eq("case_id", caseId)
      .select()
      .single()

    if (error) {
      console.error("Error updating alert:", error)
      return NextResponse.json({ error: "Failed to update alert" }, { status: 500 })
    }

    // Create audit event
    await supabase.from("audit_events").insert({
      agency_id: profile.agency_id,
      case_id: caseId,
      actor_type: "user",
      actor_id: user.id,
      event_name: resolved ? "alert_resolved" : "alert_reopened",
      event_payload_json: { alert_id: alertId },
    })

    return NextResponse.json({ alert })
  } catch (error) {
    console.error("Error in PATCH /api/cases/[id]/alerts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
