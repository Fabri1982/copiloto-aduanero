import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/cases/[id]/fields - Fetch extracted fields and their reviews
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id: caseId } = await params

    // Get query params
    const { searchParams } = new URL(request.url)
    const fieldId = searchParams.get("fieldId")

    // Verify user has access to this case
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's agency
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, name")
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

    // If fieldId is provided, fetch reviews for that specific field
    if (fieldId) {
      const { data: reviews, error } = await supabase
        .from("case_reviews")
        .select(`
          *,
          reviewer:profiles(name)
        `)
        .eq("field_id", fieldId)
        .order("reviewed_at", { ascending: false })

      if (error) {
        console.error("Error fetching reviews:", error)
        return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
      }

      // Format reviews with reviewer names
      const formattedReviews = reviews?.map((review) => ({
        ...review,
        reviewer_name: review.reviewer?.name || "Usuario",
      }))

      return NextResponse.json({ reviews: formattedReviews })
    }

    // Otherwise, fetch all extracted fields for the case
    const { data: fields, error } = await supabase
      .from("extracted_fields")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching fields:", error)
      return NextResponse.json({ error: "Failed to fetch fields" }, { status: 500 })
    }

    return NextResponse.json({ fields })
  } catch (error) {
    console.error("Error in GET /api/cases/[id]/fields:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/cases/[id]/fields - Update a field and create review record
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id: caseId } = await params

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's agency and name
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, name")
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
    const { fieldId, newValue, originalValue } = body

    if (!fieldId || newValue === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Update the extracted field
    const { data: updatedField, error: fieldError } = await supabase
      .from("extracted_fields")
      .update({ extracted_value: newValue })
      .eq("id", fieldId)
      .eq("case_id", caseId)
      .select()
      .single()

    if (fieldError) {
      console.error("Error updating field:", fieldError)
      return NextResponse.json({ error: "Failed to update field" }, { status: 500 })
    }

    // Create review record for audit trail
    const { data: review, error: reviewError } = await supabase
      .from("case_reviews")
      .insert({
        field_id: fieldId,
        original_value: originalValue || "",
        new_value: newValue,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (reviewError) {
      console.error("Error creating review:", reviewError)
      // Don't fail the request if review creation fails
    }

    // Create audit event
    await supabase.from("audit_events").insert({
      agency_id: profile.agency_id,
      case_id: caseId,
      actor_type: "user",
      actor_id: user.id,
      event_name: "field_edited",
      event_payload_json: {
        field_id: fieldId,
        original_value: originalValue,
        new_value: newValue,
        field_name: updatedField.field_name,
      },
    })

    return NextResponse.json({
      field: updatedField,
      review: review
        ? {
            ...review,
            reviewer_name: profile.name,
          }
        : null,
    })
  } catch (error) {
    console.error("Error in PATCH /api/cases/[id]/fields:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
