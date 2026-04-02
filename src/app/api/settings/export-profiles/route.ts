import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/auth"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const { profile } = await getUserProfile()
    const supabase = await createClient()

    const { data: profiles, error } = await supabase
      .from("export_profiles")
      .select("*")
      .eq("agency_id", profile.agency_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching export profiles:", error)
      return NextResponse.json(
        { error: "Error al obtener los perfiles de exportación" },
        { status: 500 }
      )
    }

    return NextResponse.json(profiles)
  } catch (error) {
    console.error("Error in GET /api/settings/export-profiles:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getUserProfile()
    
    // Only admin and supervisor can create export profiles
    if (!["admin", "supervisor"].includes(profile.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para crear perfiles de exportación" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, target_system, format, field_mapping, is_active } = body

    if (!name || !target_system || !format) {
      return NextResponse.json(
        { error: "Nombre, sistema destino y formato son requeridos" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: exportProfile, error } = await supabase
      .from("export_profiles")
      .insert({
        agency_id: profile.agency_id,
        name,
        target_system,
        format,
        field_mapping: field_mapping || {},
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating export profile:", error)
      return NextResponse.json(
        { error: "Error al crear el perfil de exportación" },
        { status: 500 }
      )
    }

    return NextResponse.json(exportProfile)
  } catch (error) {
    console.error("Error in POST /api/settings/export-profiles:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
