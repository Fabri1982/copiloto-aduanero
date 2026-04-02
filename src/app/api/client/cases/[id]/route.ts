import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/client/cases/[id] - Obtener detalle de una operación específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    
    // Obtener el caso específico
    const { data: caseDetail, error: caseError } = await supabase
      .from("operation_cases")
      .select("*")
      .eq("id", id)
      .eq("agency_id", profile.agency_id)
      .single()
    
    if (caseError || !caseDetail) {
      return NextResponse.json(
        { error: "Operación no encontrada" },
        { status: 404 }
      )
    }
    
    // Verificar que el cliente tenga acceso a este caso
    // (el client_name debe coincidir con el nombre del perfil)
    if (!caseDetail.client_name?.toLowerCase().includes(profile.name.toLowerCase())) {
      return NextResponse.json(
        { error: "No tienes acceso a esta operación" },
        { status: 403 }
      )
    }
    
    // Obtener documentos del caso
    const { data: documents } = await supabase
      .from("case_documents")
      .select("id, file_name, document_type, created_at, version")
      .eq("case_id", id)
      .order("created_at", { ascending: false })
    
    // Obtener eventos de auditoría como historial
    const { data: auditEvents } = await supabase
      .from("audit_events")
      .select("id, event_name, event_payload_json, created_at")
      .eq("case_id", id)
      .eq("agency_id", profile.agency_id)
      .order("created_at", { ascending: false })
      .limit(50)
    
    return NextResponse.json({
      case: caseDetail,
      documents: documents || [],
      history: auditEvents || [],
    })
    
  } catch (error) {
    console.error("Error in GET /api/client/cases/[id]:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
