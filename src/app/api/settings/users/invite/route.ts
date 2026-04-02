import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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

    // Use admin client for auth operations (requires service role key)
    const adminClient = createAdminClient()
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-12) + "A1!",
      email_confirm: true,
      user_metadata: {
        name: name || email.split("@")[0],
      },
    })

    if (authError) {
      console.error("Error creating user:", authError)
      return NextResponse.json(
        { error: authError.message || "Error al crear el usuario" },
        { status: 500 }
      )
    }

    // Create profile for the new user using admin client (bypasses RLS)
    if (authData.user) {
      const { error: profileError } = await adminClient.from("profiles").insert({
        id: authData.user.id,
        agency_id: profile.agency_id,
        role: role,
        name: name || email.split("@")[0],
        email: email,
      })

      if (profileError) {
        console.error("Error creating profile:", profileError)
      }
    }

    return NextResponse.json({
      message: "Usuario creado exitosamente",
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
