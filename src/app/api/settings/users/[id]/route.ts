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
    
    // Only admin can update user roles
    if (profile.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para modificar usuarios" },
        { status: 403 }
      )
    }

    // Prevent admin from demoting themselves
    if (id === profile.id) {
      return NextResponse.json(
        { error: "No puedes modificar tu propio rol" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { role, status } = body
    const supabase = await createClient()

    const updateData: Record<string, unknown> = {}
    if (role) updateData.role = role
    if (status) updateData.status = status

    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .eq("agency_id", profile.agency_id)
      .select()
      .single()

    if (error) {
      console.error("Error updating user:", error)
      return NextResponse.json(
        { error: "Error al actualizar el usuario" },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error("Error in PATCH /api/settings/users/[id]:", error)
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
    
    // Only admin can deactivate users
    if (profile.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para desactivar usuarios" },
        { status: 403 }
      )
    }

    // Prevent admin from deactivating themselves
    if (id === profile.id) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Soft delete by updating status
    const { error } = await supabase
      .from("profiles")
      .update({ status: "inactive" })
      .eq("id", id)
      .eq("agency_id", profile.agency_id)

    if (error) {
      console.error("Error deactivating user:", error)
      return NextResponse.json(
        { error: "Error al desactivar el usuario" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Usuario desactivado exitosamente" })
  } catch (error) {
    console.error("Error in DELETE /api/settings/users/[id]:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
