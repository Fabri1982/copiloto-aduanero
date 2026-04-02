import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/client/cases - Obtener operaciones del cliente autenticado
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }
    
    // Obtener perfil y verificar rol
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, agency_id, name")
      .eq("id", user.id)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      )
    }
    
    if (profile.role !== "cliente") {
      return NextResponse.json(
        { error: "Acceso denegado. Solo clientes pueden acceder a este recurso." },
        { status: 403 }
      )
    }
    
    // Obtener operaciones del cliente
    // Filtramos por agency_id y buscamos coincidencias en client_name
    const { data: cases, error: casesError } = await supabase
      .from("operation_cases")
      .select("id, reference_code, status, client_name, created_at, updated_at")
      .eq("agency_id", profile.agency_id)
      .ilike("client_name", `%${profile.name}%`)
      .order("created_at", { ascending: false })
    
    if (casesError) {
      console.error("Error fetching cases:", casesError)
      return NextResponse.json(
        { error: "Error al obtener operaciones" },
        { status: 500 }
      )
    }
    
    // Si no hay casos por nombre, retornamos array vacío
    // (el cliente solo debe ver sus propios casos)
    return NextResponse.json({ cases: cases || [] })
    
  } catch (error) {
    console.error("Error in GET /api/client/cases:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
