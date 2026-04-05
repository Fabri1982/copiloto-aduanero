import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ClientTimeline } from "@/components/client/client-timeline"
import { ClientProvisionView } from "@/components/client/client-provision-view"
import { ClientUploadZone } from "@/components/client/client-upload-zone"
import { ClientMessages } from "@/components/client/client-messages"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Clock, CheckCircle, AlertCircle, Package } from "lucide-react"
import Link from "next/link"

// Mapeo de estados internos a estados simplificados para el cliente
function getClientStatusInfo(status: string) {
  switch (status) {
    case "draft":
    case "documents_uploaded":
    case "processing":
    case "needs_review":
      return {
        label: "En proceso",
        color: "bg-amber-600/10 text-amber-600 border-amber-600/20",
        icon: <Clock className="w-4 h-4" />,
      }
    case "ready_for_provision":
    case "provision_sent":
      return {
        label: "Provisión disponible",
        color: "bg-primary/10 text-primary border-primary/20",
        icon: <Package className="w-4 h-4" />,
      }
    case "payment_uploaded":
    case "payment_under_validation":
      return {
        label: "Pago pendiente",
        color: "bg-destructive/10 text-destructive border-destructive/20",
        icon: <AlertCircle className="w-4 h-4" />,
      }
    case "closed":
      return {
        label: "Completado",
        color: "bg-emerald-600/10 text-emerald-600 border-emerald-600/20",
        icon: <CheckCircle className="w-4 h-4" />,
      }
    default:
      return {
        label: "En proceso",
        color: "bg-amber-600/10 text-amber-600 border-amber-600/20",
        icon: <Clock className="w-4 h-4" />,
      }
  }
}

// Generar pasos del timeline según el estado
function getTimelineSteps(status: string) {
  const steps: { label: string; completed: boolean; current?: boolean }[] = [
    { label: "Operación registrada", completed: true },
    { label: "Documentos recibidos", completed: ["documents_uploaded", "processing", "needs_review", "ready_for_provision", "provision_sent", "payment_uploaded", "payment_under_validation", "closed"].includes(status) },
    { label: "En procesamiento", completed: ["processing", "needs_review", "ready_for_provision", "provision_sent", "payment_uploaded", "payment_under_validation", "closed"].includes(status) },
    { label: "Provisión enviada", completed: ["provision_sent", "payment_uploaded", "payment_under_validation", "closed"].includes(status) },
    { label: "Pago recibido", completed: ["payment_uploaded", "payment_under_validation", "closed"].includes(status) },
    { label: "Operación completada", completed: status === "closed" },
  ]
  
  // Marcar el paso actual
  const currentIndex = steps.findIndex(s => !s.completed)
  if (currentIndex !== -1) {
    steps[currentIndex].current = true
  }
  
  return steps
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientCaseDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect("/client-portal/login")
  }
  
  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, agency_id, name")
    .eq("id", user.id)
    .single()
  
  if (!profile || profile.role !== "cliente") {
    redirect("/client-portal/login")
  }
  
  // Obtener detalle del caso
  const { data: caseDetail } = await supabase
    .from("operation_cases")
    .select("*")
    .eq("id", id)
    .eq("agency_id", profile.agency_id)
    .single()
  
  if (!caseDetail) {
    notFound()
  }
  
  // Obtener documentos del caso
  const { data: documents } = await supabase
    .from("case_documents")
    .select("*")
    .eq("case_id", id)
    .order("created_at", { ascending: false })
  
  // Obtener mensajes del caso (simulado - debería haber una tabla de mensajes)
  // Por ahora, usamos audit_events como fallback
  const { data: auditEvents } = await supabase
    .from("audit_events")
    .select("*")
    .eq("case_id", id)
    .order("created_at", { ascending: true })
    .limit(20)

  const statusInfo = getClientStatusInfo(caseDetail.status)
  const timelineSteps = getTimelineSteps(caseDetail.status)
  
  // Datos de ejemplo para la provisión (en una implementación real vendrían de la DB)
  const provisionItems = [
    { id: "1", description: "Derechos de importación", amount: 125000 },
    { id: "2", description: "IVA", amount: 238000 },
    { id: "3", description: "Gastos operacionales", amount: 45000 },
    { id: "4", description: "Honorarios agencia", amount: 89000 },
  ]
  const provisionTotal = provisionItems.reduce((sum, item) => sum + item.amount, 0)

  // Verificar si se requiere subir documentos o comprobante de pago
  const needsDocumentUpload = ["draft", "documents_uploaded", "needs_review"].includes(caseDetail.status)
  const needsPaymentUpload = ["provision_sent", "payment_uploaded"].includes(caseDetail.status)
  const hasProvision = ["ready_for_provision", "provision_sent", "payment_uploaded", "payment_under_validation", "closed"].includes(caseDetail.status)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header con navegación */}
      <div className="mb-6">
        <Link href="/client-portal/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2">
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Button>
        </Link>
      </div>

      {/* Info principal */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
              {caseDetail.reference_code || `Operación #${caseDetail.id.slice(0, 8)}`}
            </h1>
            <p className="text-muted-foreground">
              {caseDetail.client_name}
            </p>
          </div>
          <Badge 
            variant="outline" 
            className={`${statusInfo.color} font-normal text-sm px-3 py-1 w-fit`}
          >
            <span className="flex items-center gap-1.5">
              {statusInfo.icon}
              {statusInfo.label}
            </span>
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Creada el {new Date(caseDetail.created_at).toLocaleDateString("es-CL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Grid de contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda - Timeline y estado */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-foreground">
                Estado de la operación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ClientTimeline steps={timelineSteps} />
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-foreground">
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground truncate flex-1">
                        {doc.file_name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay documentos disponibles
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha - Acciones y detalles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Provisión de gastos */}
          {hasProvision && (
            <ClientProvisionView
              items={provisionItems}
              total={provisionTotal}
              currency="CLP"
            />
          )}

          {/* Subir documento faltante */}
          {needsDocumentUpload && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-foreground">
                  Subir documento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClientUploadZone
                  label="Arrastra tu documento aquí"
                  description="Factura comercial, packing list, BL, AWB"
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSizeMB={10}
                  onUpload={async (file) => {
                    "use server"
                    // La lógica real se implementará en la API route
                    console.log("Upload document:", file.name)
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Subir comprobante de pago */}
          {needsPaymentUpload && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-foreground">
                  Subir comprobante de pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClientUploadZone
                  label="Comprobante de pago"
                  description="Sube tu comprobante de transferencia o depósito"
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSizeMB={10}
                  onUpload={async (file) => {
                    "use server"
                    // La lógica real se implementará en la API route
                    console.log("Upload payment receipt:", file.name)
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Mensajes */}
          <ClientMessages
            messages={[
              {
                id: "1",
                content: "Hemos recibido tus documentos. Estamos procesando tu operación.",
                sender: "agency",
                senderName: "Agencia",
                timestamp: new Date(Date.now() - 86400000).toISOString(),
              },
              {
                id: "2",
                content: "Perfecto, gracias por la actualización.",
                sender: "client",
                senderName: profile.name,
                timestamp: new Date(Date.now() - 43200000).toISOString(),
              },
            ]}
            onSendMessage={async (content) => {
              "use server"
              // La lógica real se implementará en la API route
              console.log("Send message:", content)
            }}
          />

          {/* Historial básico */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-foreground">
                Historial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditEvents && auditEvents.length > 0 ? (
                  auditEvents.map((event) => (
                    <div key={event.id} className="flex gap-3 text-sm">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {new Date(event.created_at).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span className="text-muted-foreground">
                        {event.event_name}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-3 text-sm">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {new Date(caseDetail.created_at).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span className="text-muted-foreground">
                        Operación creada
                      </span>
                    </div>
                    {caseDetail.status !== "draft" && (
                      <div className="flex gap-3 text-sm">
                        <span className="text-muted-foreground whitespace-nowrap">
                          {new Date(caseDetail.updated_at).toLocaleDateString("es-CL", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span className="text-muted-foreground">
                          Documentos recibidos
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
