import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/auth"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const { profile } = await getUserProfile()
    const supabase = await createClient()

    const { data: agency, error } = await supabase
      .from("agencies")
      .select("*")
      .eq("id", profile.agency_id)
      .single()

    if (error) {
      console.error("Error fetching agency:", error)
      return NextResponse.json(
        { error: "Error al obtener la configuración de la agencia" },
        { status: 500 }
      )
    }

    return NextResponse.json(agency)
  } catch (error) {
    console.error("Error in GET /api/settings/agency:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await getUserProfile()
    
    // Only admin can update agency settings
    if (profile.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para modificar la configuración de la agencia" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const supabase = await createClient()

    const { data: agency, error } = await supabase
      .from("agencies")
      .update({
        name: body.name,
        settings_json: body.settings_json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.agency_id)
      .select()
      .single()

    if (error) {
      console.error("Error updating agency:", error)
      return NextResponse.json(
        { error: "Error al actualizar la configuración de la agencia" },
        { status: 500 }
      )
    }

    return NextResponse.json(agency)
  } catch (error) {
    console.error("Error in PATCH /api/settings/agency:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
