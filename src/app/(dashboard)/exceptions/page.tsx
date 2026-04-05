import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PriorityBadge } from "@/components/cases/priority-badge"
import { AlertTriangle, AlertCircle, Info, Search, ArrowRight, Filter } from "lucide-react"

interface CaseWithAlerts {
  id: string
  reference_code: string | null
  client_name: string
  priority: "low" | "medium" | "high"
  created_at: string
  alert_count: number
  high_alerts: number
  medium_alerts: number
  low_alerts: number
  first_alert_message: string | null
}

interface SearchParams {
  severity?: "all" | "high" | "medium" | "low"
  search?: string
  sort?: "priority" | "date" | "alerts"
}

export default async function ExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { profile } = await getUserProfile()
  const supabase = await createClient()
  const params = await searchParams

  const severityFilter = params.severity || "all"
  const searchQuery = params.search || ""
  const sortBy = params.sort || "priority"

  // Build the query for cases needing review with alert counts
  let query = supabase
    .from("operation_cases")
    .select(
      `
      id,
      reference_code,
      client_name,
      priority,
      created_at,
      validation_alerts!left (
        id,
        severity,
        message,
        resolved
      )
    `
    )
    .eq("agency_id", profile.agency_id)
    .eq("status", "needs_review")

  // Apply search filter
  if (searchQuery) {
    query = query.or(
      `reference_code.ilike.%${searchQuery}%,client_name.ilike.%${searchQuery}%`
    )
  }

  const { data: cases, error } = await query

  if (error) {
    console.error("Error fetching exceptions:", error)
  }

  // Process cases to calculate alert metrics
  const processedCases: CaseWithAlerts[] = (cases || [])
    .map((c) => {
      const alerts = (c.validation_alerts || []) as Array<{
        id: string
        severity: "low" | "medium" | "high"
        message: string
        resolved: boolean
      }>
      const unresolvedAlerts = alerts.filter((a) => !a.resolved)
      const highAlerts = unresolvedAlerts.filter((a) => a.severity === "high")
      const mediumAlerts = unresolvedAlerts.filter((a) => a.severity === "medium")
      const lowAlerts = unresolvedAlerts.filter((a) => a.severity === "low")

      // Find first high severity alert message, or first any alert
      const firstHighAlert = highAlerts[0]
      const firstAlert = unresolvedAlerts[0]
      const firstAlertMessage = firstHighAlert?.message || firstAlert?.message || null

      return {
        id: c.id,
        reference_code: c.reference_code,
        client_name: c.client_name,
        priority: c.priority as "low" | "medium" | "high",
        created_at: c.created_at,
        alert_count: unresolvedAlerts.length,
        high_alerts: highAlerts.length,
        medium_alerts: mediumAlerts.length,
        low_alerts: lowAlerts.length,
        first_alert_message: firstAlertMessage,
      }
    })
    .filter((c) => {
      // Apply severity filter
      if (severityFilter === "all") return true
      if (severityFilter === "high") return c.high_alerts > 0
      if (severityFilter === "medium") return c.medium_alerts > 0 && c.high_alerts === 0
      if (severityFilter === "low") return c.low_alerts > 0 && c.high_alerts === 0 && c.medium_alerts === 0
      return true
    })
    .sort((a, b) => {
      // Apply sorting
      if (sortBy === "priority") {
        const priorityWeight = { high: 3, medium: 2, low: 1 }
        if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
          return priorityWeight[b.priority] - priorityWeight[a.priority]
        }
        // Secondary sort by high alerts
        return b.high_alerts - a.high_alerts
      }
      if (sortBy === "date") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === "alerts") {
        return b.alert_count - a.alert_count
      }
      return 0
    })

  // Calculate stats
  const criticalCount = processedCases.filter((c) => c.high_alerts > 0).length
  const withObservationsCount = processedCases.filter(
    (c) => c.medium_alerts > 0 && c.high_alerts === 0
  ).length
  const withoutObservationsCount = processedCases.filter(
    (c) => c.alert_count === 0
  ).length

  const getSeverityColor = (c: CaseWithAlerts) => {
    if (c.high_alerts > 0) return "hsl(var(--destructive))"
    if (c.medium_alerts > 0) return "hsl(text-amber-600)"
    return "hsl(text-emerald-600)"
  }

  const getSeverityIcon = (c: CaseWithAlerts) => {
    if (c.high_alerts > 0) return <AlertTriangle className="h-4 w-4 text-destructive" />
    if (c.medium_alerts > 0) return <AlertCircle className="h-4 w-4 text-warning" />
    return <Info className="h-4 w-4 text-emerald-600" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Bandeja de Excepciones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión de expedientes que requieren revisión
        </p>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{criticalCount}</span>{" "}
            críticas
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{withObservationsCount}</span>{" "}
            con observaciones
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
          <div className="w-2 h-2 rounded-full bg-emerald-600" />
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{withoutObservationsCount}</span>{" "}
            sin observaciones
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <form className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Buscar por referencia o cliente..."
                defaultValue={searchQuery}
                className="pl-9 bg-background border-border"
              />
            </div>
            <div className="flex gap-4">
              <Select name="severity" defaultValue={severityFilter}>
                <SelectTrigger className="w-[180px] bg-background border-border">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Severidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las severidades</SelectItem>
                  <SelectItem value="high">Críticas (alta)</SelectItem>
                  <SelectItem value="medium">Observaciones (media)</SelectItem>
                  <SelectItem value="low">Informativas (baja)</SelectItem>
                </SelectContent>
              </Select>
              <Select name="sort" defaultValue={sortBy}>
                <SelectTrigger className="w-[160px] bg-background border-border">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Prioridad</SelectItem>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="alerts">Cantidad alertas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cases List */}
      <div className="space-y-3">
        {processedCases.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-sidebar-accent flex items-center justify-center mx-auto mb-4">
                <Info className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-1">
                No hay expedientes pendientes de revisión
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Todos los expedientes han sido revisados. La bandeja se actualizará cuando haya nuevas excepciones.
              </p>
            </CardContent>
          </Card>
        ) : (
          processedCases.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}`}>
              <Card
                className="bg-card border-border hover:bg-sidebar-accent transition-colors cursor-pointer group"
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: getSeverityColor(c),
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Severity Indicator */}
                    <div className="mt-1">{getSeverityIcon(c)}</div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-medium text-foreground">
                          {c.reference_code || "Sin referencia"}
                        </h3>
                        <PriorityBadge priority={c.priority} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {c.client_name}
                      </p>
                      {c.first_alert_message && (
                        <p className="text-sm text-foreground mt-2 line-clamp-2">
                          {c.first_alert_message}
                        </p>
                      )}
                      {c.alert_count > 1 && !c.first_alert_message && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {c.alert_count} alertas pendientes
                        </p>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Ver expediente</span>
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
