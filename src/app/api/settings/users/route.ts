import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const { profile } = await getUserProfile()
    const supabase = await createClient()

    // Get all users from the same agency
    const { data: users, error } = await supabase
      .from("profiles")
      .select(`
        id,
        role,
        created_at,
        user:user_id (
          email,
          raw_user_meta_data
        )
      `)
      .eq("agency_id", profile.agency_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json(
        { error: "Error al obtener los usuarios" },
        { status: 500 }
      )
    }

    // Transform the data to a cleaner format
    const transformedUsers = users.map((u: unknown) => {
      const user = u as {
        id: string
        role: string
        created_at: string
        user: {
          email: string
          raw_user_meta_data?: { name?: string; full_name?: string }
        }
      }
      return {
        id: user.id,
        email: user.user.email,
        name: user.user.raw_user_meta_data?.name || user.user.raw_user_meta_data?.full_name || "Sin nombre",
        role: user.role,
        status: "active", // TODO: Add status field to profiles table
        created_at: user.created_at,
      }
    })

    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error("Error in GET /api/settings/users:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
