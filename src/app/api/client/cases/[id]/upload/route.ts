import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/client/cases/[id]/upload - Subir documento o comprobante de pago
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
      .select("client_name, status")
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
    
    // Procesar el formulario multipart
    const formData = await request.formData()
    const file = formData.get("file") as File
    const documentType = formData.get("documentType") as string || "unknown"
    
    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      )
    }
    
    // Validar tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande. Máximo 10MB." },
        { status: 400 }
      )
    }
    
    // Validar tipo de archivo
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo PDF, JPG y PNG." },
        { status: 400 }
      )
    }
    
    // Generar nombre único para el archivo
    const timestamp = Date.now()
    const fileExt = file.name.split(".").pop()
    const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${profile.agency_id}/${id}/${fileName}`
    
    // Subir archivo a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("case-documents")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })
    
    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      return NextResponse.json(
        { error: "Error al subir el archivo" },
        { status: 500 }
      )
    }
    
    // Determinar el tipo de documento basado en el estado del caso y el tipo proporcionado
    let finalDocumentType = documentType
    if (documentType === "payment_receipt" || caseDetail.status === "provision_sent") {
      finalDocumentType = "payment_receipt"
    }
    
    // Registrar el documento en la base de datos
    const { data: document, error: docError } = await supabase
      .from("case_documents")
      .insert({
        case_id: id,
        file_path: filePath,
        document_type: finalDocumentType,
        file_name: file.name,
        uploaded_by: user.id,
        version: 1,
      })
      .select()
      .single()
    
    if (docError) {
      console.error("Error saving document:", docError)
      // Intentar eliminar el archivo subido
      await supabase.storage.from("case-documents").remove([filePath])
      return NextResponse.json(
        { error: "Error al guardar el documento" },
        { status: 500 }
      )
    }
    
    // Registrar evento de auditoría
    await supabase.from("audit_events").insert({
      agency_id: profile.agency_id,
      case_id: id,
      actor_type: "user",
      actor_id: user.id,
      event_name: finalDocumentType === "payment_receipt" 
        ? "payment_receipt_uploaded" 
        : "document_uploaded_by_client",
      event_payload_json: {
        document_id: document.id,
        file_name: file.name,
        document_type: finalDocumentType,
      },
    })
    
    // Si es un comprobante de pago, actualizar el estado del caso
    if (finalDocumentType === "payment_receipt") {
      await supabase
        .from("operation_cases")
        .update({ status: "payment_uploaded" })
        .eq("id", id)
    }
    
    return NextResponse.json({ 
      document,
      message: "Archivo subido exitosamente" 
    }, { status: 201 })
    
  } catch (error) {
    console.error("Error in POST /api/client/cases/[id]/upload:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
