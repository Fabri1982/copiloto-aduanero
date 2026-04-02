import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/cases/[id]/conflicts - Fetch case conflicts
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

    // Fetch conflicts
    const { data: conflicts, error } = await supabase
      .from("case_conflicts")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching conflicts:", error)
      return NextResponse.json({ error: "Failed to fetch conflicts" }, { status: 500 })
    }

    return NextResponse.json({ conflicts })
  } catch (error) {
    console.error("Error in GET /api/cases/[id]/conflicts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/cases/[id]/conflicts - Resolve a conflict
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
    const { conflictId, chosenValue } = body

    if (!conflictId || !chosenValue || !["left", "right"].includes(chosenValue)) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 })
    }

    // Get the conflict to determine the resolved value
    const { data: conflict } = await supabase
      .from("case_conflicts")
      .select("*")
      .eq("id", conflictId)
      .eq("case_id", caseId)
      .single()

    if (!conflict) {
      return NextResponse.json({ error: "Conflict not found" }, { status: 404 })
    }

    const resolvedValue = chosenValue === "left" ? conflict.left_value : conflict.right_value

    // Update conflict
    const { data: updatedConflict, error } = await supabase
      .from("case_conflicts")
      .update({
        status: "resolved",
        resolved_value: resolvedValue,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", conflictId)
      .eq("case_id", caseId)
      .select()
      .single()

    if (error) {
      console.error("Error updating conflict:", error)
      return NextResponse.json({ error: "Failed to update conflict" }, { status: 500 })
    }

    // Update the corresponding extracted field with the resolved value
    const { data: extractedField } = await supabase
      .from("extracted_fields")
      .select("id")
      .eq("case_id", caseId)
      .eq("field_name", conflict.field_name)
      .single()

    if (extractedField) {
      await supabase
        .from("extracted_fields")
        .update({ extracted_value: resolvedValue })
        .eq("id", extractedField.id)
    }

    // Create audit event
    await supabase.from("audit_events").insert({
      agency_id: profile.agency_id,
      case_id: caseId,
      actor_type: "user",
      actor_id: user.id,
      event_name: "conflict_resolved",
      event_payload_json: {
        conflict_id: conflictId,
        field_name: conflict.field_name,
        chosen_value: chosenValue,
        resolved_value: resolvedValue,
      },
    })

    return NextResponse.json({ conflict: updatedConflict })
  } catch (error) {
    console.error("Error in PATCH /api/cases/[id]/conflicts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
