import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/client/cases/[id]/messages - Obtener mensajes de una operación
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
        { error: "Acceso denegado" },
        { status: 403 }
      )
    }
    
    // Verificar que el cliente tenga acceso a este caso
    const { data: caseDetail } = await supabase
      .from("operation_cases")
      .select("client_name")
      .eq("id", id)
      .eq("agency_id", profile.agency_id)
      .single()
    
    if (!caseDetail) {
      return NextResponse.json(
        { error: "Operación no encontrada" },
        { status: 404 }
      )
    }
    
    if (!caseDetail.client_name?.toLowerCase().includes(profile.name.toLowerCase())) {
      return NextResponse.json(
        { error: "No tienes acceso a esta operación" },
        { status: 403 }
      )
    }
    
    // Por ahora, usamos audit_events como fuente de mensajes
    // En una implementación real, debería haber una tabla client_messages
    const { data: messages, error: messagesError } = await supabase
      .from("audit_events")
      .select("id, event_name, event_payload_json, actor_type, actor_id, created_at")
      .eq("case_id", id)
      .eq("agency_id", profile.agency_id)
      .ilike("event_name", "%message%")
      .order("created_at", { ascending: true })
      .limit(50)
    
    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
      return NextResponse.json(
        { error: "Error al obtener mensajes" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ messages: messages || [] })
    
  } catch (error) {
    console.error("Error in GET /api/client/cases/[id]/messages:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST /api/client/cases/[id]/messages - Enviar un mensaje
export async function POST(
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
        { error: "Acceso denegado" },
        { status: 403 }
      )
    }
    
    // Verificar que el cliente tenga acceso a este caso
    const { data: caseDetail } = await supabase
      .from("operation_cases")
      .select("client_name")
      .eq("id", id)
      .eq("agency_id", profile.agency_id)
      .single()
    
    if (!caseDetail) {
      return NextResponse.json(
        { error: "Operación no encontrada" },
        { status: 404 }
      )
    }
    
    if (!caseDetail.client_name?.toLowerCase().includes(profile.name.toLowerCase())) {
      return NextResponse.json(
        { error: "No tienes acceso a esta operación" },
        { status: 403 }
      )
    }
    
    // Obtener el contenido del mensaje
    const body = await request.json()
    const { content } = body
    
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "El mensaje no puede estar vacío" },
        { status: 400 }
      )
    }
    
    // Por ahora, guardamos el mensaje como un evento de auditoría
    // En una implementación real, debería haber una tabla client_messages
    const { data: message, error: insertError } = await supabase
      .from("audit_events")
      .insert({
        agency_id: profile.agency_id,
        case_id: id,
        actor_type: "user",
        actor_id: user.id,
        event_name: "client_message",
        event_payload_json: {
          content: content.trim(),
          sender_name: profile.name,
          sender_role: "cliente",
        },
      })
      .select()
      .single()
    
    if (insertError) {
      console.error("Error inserting message:", insertError)
      return NextResponse.json(
        { error: "Error al enviar el mensaje" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ message }, { status: 201 })
    
  } catch (error) {
    console.error("Error in POST /api/client/cases/[id]/messages:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
