import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GreetingSection } from "@/components/dashboard/greeting-section"
import { RelativeTime } from "@/components/dashboard/relative-time"

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Borrador",
    documents_uploaded: "Documentos cargados",
    processing: "En procesamiento",
    needs_review: "Necesita revisión",
    ready_for_provision: "Listo para provisión",
    provision_sent: "Provisión enviada",
    payment_uploaded: "Pago cargado",
    payment_under_validation: "Pago en validación",
    closed: "Cerrado",
  }
  return labels[status] || status
}

export default async function DashboardPage() {
  const { profile } = await getUserProfile()
  const supabase = await createClient()

  // Fetch metrics
  const { data: activeCases } = await supabase
    .from("operation_cases")
    .select("id", { count: "exact" })
    .eq("agency_id", profile.agency_id)
    .neq("status", "closed")

  const { data: needsReview } = await supabase
    .from("operation_cases")
    .select("id", { count: "exact" })
    .eq("agency_id", profile.agency_id)
    .eq("status", "needs_review")

  const { data: readyForProvision } = await supabase
    .from("operation_cases")
    .select("id", { count: "exact" })
    .eq("agency_id", profile.agency_id)
    .eq("status", "ready_for_provision")

  const { data: paymentUploaded } = await supabase
    .from("operation_cases")
    .select("id", { count: "exact" })
    .eq("agency_id", profile.agency_id)
    .eq("status", "payment_uploaded")

  // Fetch recent activity (last 5 updated cases)
  const { data: recentCases } = await supabase
    .from("operation_cases")
    .select("id, reference_code, client_name, status, updated_at")
    .eq("agency_id", profile.agency_id)
    .order("updated_at", { ascending: false })
    .limit(5)

  const metrics = [
    {
      title: "Expedientes activos",
      value: activeCases?.length ?? 0,
      description: "En proceso",
      icon: "📁",
    },
    {
      title: "Pendientes de revisión",
      value: needsReview?.length ?? 0,
      description: "Requieren atención",
      icon: "👁️",
    },
    {
      title: "Provisiones pendientes",
      value: readyForProvision?.length ?? 0,
      description: "Listos para enviar",
      icon: "📋",
    },
    {
      title: "Pagos por validar",
      value: paymentUploaded?.length ?? 0,
      description: "En espera",
      icon: "💳",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Greeting Section */}
      <GreetingSection userName={profile.name} />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.title}
            className="bg-[var(--surface)] border-[var(--border)] rounded-xl shadow-sm"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[var(--text-muted)]">
                {metric.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-[var(--text)]">
                  {metric.value}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {metric.description}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Section */}
      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium text-[var(--text)]">
            Actividad reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentCases && recentCases.length > 0 ? (
            <div className="space-y-3">
              {recentCases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-sm">
                      📄
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">
                        {caseItem.reference_code || "Sin referencia"}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {caseItem.client_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--surface-2)] text-[var(--text-muted)]">
                      {getStatusLabel(caseItem.status)}
                    </span>
                    <p className="text-xs text-[var(--text-faint)] mt-1">
                      <RelativeTime dateString={caseItem.updated_at} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--text-muted)]">
                No hay actividad reciente
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
