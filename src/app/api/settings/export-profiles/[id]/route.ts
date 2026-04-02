import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/auth"
import { NextRequest, NextResponse } from "next/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await getUserProfile()
    const { id } = await params
    
    // Only admin and supervisor can update export profiles
    if (!["admin", "supervisor"].includes(profile.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar perfiles de exportación" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, target_system, format, field_mapping, is_active } = body
    const supabase = await createClient()

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (target_system !== undefined) updateData.target_system = target_system
    if (format !== undefined) updateData.format = format
    if (field_mapping !== undefined) updateData.field_mapping = field_mapping
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: exportProfile, error } = await supabase
      .from("export_profiles")
      .update(updateData)
      .eq("id", id)
      .eq("agency_id", profile.agency_id)
      .select()
      .single()

    if (error) {
      console.error("Error updating export profile:", error)
      return NextResponse.json(
        { error: "Error al actualizar el perfil de exportación" },
        { status: 500 }
      )
    }

    return NextResponse.json(exportProfile)
  } catch (error) {
    console.error("Error in PATCH /api/settings/export-profiles/[id]:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await getUserProfile()
    const { id } = await params
    
    // Only admin can delete export profiles
    if (profile.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar perfiles de exportación" },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from("export_profiles")
      .delete()
      .eq("id", id)
      .eq("agency_id", profile.agency_id)

    if (error) {
      console.error("Error deleting export profile:", error)
      return NextResponse.json(
        { error: "Error al eliminar el perfil de exportación" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Perfil de exportación eliminado exitosamente" })
  } catch (error) {
    console.error("Error in DELETE /api/settings/export-profiles/[id]:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
