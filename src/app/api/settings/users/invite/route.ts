import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { profile } = await getUserProfile()
    
    // Only admin can invite users
    if (profile.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para invitar usuarios" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, role, name } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email y rol son requeridos" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create user with admin client (requires service role key)
    // Note: In production, this should use a service role client
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        name: name || email.split("@")[0],
        agency_id: profile.agency_id,
        role: role,
      },
    })

    if (authError) {
      console.error("Error inviting user:", authError)
      return NextResponse.json(
        { error: "Error al invitar al usuario" },
        { status: 500 }
      )
    }

    // Create profile for the new user
    if (authData.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        agency_id: profile.agency_id,
        role: role,
        user_id: authData.user.id,
      })

      if (profileError) {
        console.error("Error creating profile:", profileError)
        // Don't fail the request, but log the error
      }
    }

    return NextResponse.json({
      message: "Invitación enviada exitosamente",
      user: authData.user,
    })
  } catch (error) {
    console.error("Error in POST /api/settings/users/invite:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
