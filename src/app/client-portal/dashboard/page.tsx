import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ClientCaseCard, ClientCaseStatus } from "@/components/client/client-case-card"
import { Package, AlertCircle } from "lucide-react"

// Mapeo de estados internos a estados simplificados para el cliente
function mapStatusToClientStatus(status: string): ClientCaseStatus {
  switch (status) {
    case "draft":
    case "documents_uploaded":
    case "processing":
    case "needs_review":
      return "en_proceso"
    case "ready_for_provision":
    case "provision_sent":
      return "provision_disponible"
    case "payment_uploaded":
    case "payment_under_validation":
      return "pago_pendiente"
    case "closed":
      return "completado"
    default:
      return "en_proceso"
  }
}

export default async function ClientDashboardPage() {
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
  
  // Obtener operaciones del cliente (filtradas por client_name o created_by)
  // Por ahora, buscamos casos donde el client_name coincida con el nombre del perfil
  // o donde exista una relación cliente-caso definida
  const { data: cases, error: casesError } = await supabase
    .from("operation_cases")
    .select("id, reference_code, status, client_name, created_at, updated_at")
    .eq("agency_id", profile.agency_id)
    .ilike("client_name", `%${profile.name}%`)
    .order("created_at", { ascending: false })
  
  // Si no hay casos por nombre, intentamos obtener todos los casos de la agencia
  // (en una implementación real, debería haber una tabla de relación cliente-caso)
  let clientCases = cases || []
  
  if (clientCases.length === 0 && !casesError) {
    // Fallback: obtener casos recientes de la agencia
    const { data: allCases } = await supabase
      .from("operation_cases")
      .select("id, reference_code, status, client_name, created_at, updated_at")
      .eq("agency_id", profile.agency_id)
      .order("created_at", { ascending: false })
      .limit(10)
    
    clientCases = allCases || []
  }

  // Contar casos por estado
  const counts = {
    en_proceso: clientCases.filter(c => mapStatusToClientStatus(c.status) === "en_proceso").length,
    provision_disponible: clientCases.filter(c => mapStatusToClientStatus(c.status) === "provision_disponible").length,
    pago_pendiente: clientCases.filter(c => mapStatusToClientStatus(c.status) === "pago_pendiente").length,
    completado: clientCases.filter(c => mapStatusToClientStatus(c.status) === "completado").length,
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header de bienvenida */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] mb-2">
          Hola, {profile.name.split(" ")[0]}
        </h1>
        <p className="text-[var(--text-muted)]">
          Aquí puedes ver el estado de tus operaciones y documentos
        </p>
      </div>

      {/* Resumen de estados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[var(--warning)]" />
            <span className="text-xs text-[var(--text-muted)]">En proceso</span>
          </div>
          <p className="text-2xl font-semibold text-[var(--text)]">{counts.en_proceso}</p>
        </div>
        
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
            <span className="text-xs text-[var(--text-muted)]">Provisión</span>
          </div>
          <p className="text-2xl font-semibold text-[var(--text)]">{counts.provision_disponible}</p>
        </div>
        
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[var(--error)]" />
            <span className="text-xs text-[var(--text-muted)]">Pago pendiente</span>
          </div>
          <p className="text-2xl font-semibold text-[var(--text)]">{counts.pago_pendiente}</p>
        </div>
        
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
            <span className="text-xs text-[var(--text-muted)]">Completados</span>
          </div>
          <p className="text-2xl font-semibold text-[var(--text)]">{counts.completado}</p>
        </div>
      </div>

      {/* Lista de operaciones */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-[var(--text)]">
            Tus operaciones
          </h2>
          <span className="text-sm text-[var(--text-muted)]">
            {clientCases.length} {clientCases.length === 1 ? "operación" : "operaciones"}
          </span>
        </div>

        {clientCases.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-[var(--surface)] border border-[var(--border)] border-dashed">
            <Package className="w-12 h-12 mx-auto mb-4 text-[var(--text-faint)]" />
            <h3 className="text-base font-medium text-[var(--text)] mb-1">
              No tienes operaciones activas
            </h3>
            <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
              Cuando tu agencia registre una operación para ti, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {clientCases.map((caseItem) => (
              <ClientCaseCard
                key={caseItem.id}
                id={caseItem.id}
                reference={caseItem.reference_code || `Operación #${caseItem.id.slice(0, 8)}`}
                status={mapStatusToClientStatus(caseItem.status)}
                date={caseItem.created_at}
                description={caseItem.client_name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Alerta informativa */}
      <div className="mt-8 p-4 rounded-xl bg-[var(--primary-soft)] border border-[var(--primary)]/20">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--text)] mb-1">
              ¿Necesitas ayuda?
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Si tienes alguna duda sobre tus operaciones o necesitas asistencia, 
              puedes enviar un mensaje directamente desde el detalle de cada operación.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
