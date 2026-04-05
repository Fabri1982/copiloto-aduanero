"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, AlertCircle, Info, CheckCircle, Loader2 } from "lucide-react"
import { useUser } from "@/hooks/use-user"

interface ValidationAlert {
  id: string
  case_id: string
  severity: "low" | "medium" | "high"
  message: string
  affected_fields: string[]
  recommended_action: string | null
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

interface AlertsPanelProps {
  caseId: string
}

export function AlertsPanel({ caseId }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<ValidationAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const { profile } = useUser()

  const fetchAlerts = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("validation_alerts")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching alerts:", error)
    } else {
      setAlerts(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAlerts()
  }, [caseId])

  const handleResolve = async (alertId: string) => {
    if (!profile) return

    setResolvingId(alertId)
    const supabase = createClient()

    const { error } = await supabase
      .from("validation_alerts")
      .update({
        resolved: true,
        resolved_by: profile.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId)

    if (error) {
      console.error("Error resolving alert:", error)
    } else {
      // Refresh alerts
      await fetchAlerts()
    }
    setResolvingId(null)
  }

  const pendingAlerts = alerts.filter((a) => !a.resolved)
  const resolvedAlerts = alerts.filter((a) => a.resolved)

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "high":
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          badgeClass: "bg-destructive/10 text-destructive border-destructive",
          borderClass: "border-l-destructive",
          label: "Alta",
        }
      case "medium":
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          badgeClass: "bg-amber-600/10 text-amber-600 border-amber-600",
          borderClass: "border-l-amber-600",
          label: "Media",
        }
      case "low":
      default:
        return {
          icon: <Info className="h-5 w-5" />,
          badgeClass: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
          borderClass: "border-l-blue-400",
          label: "Baja",
        }
    }
  }

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Cargando alertas...</p>
        </CardContent>
      </Card>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-sidebar-accent flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-base font-medium text-foreground mb-1">
            No hay alertas de validación
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No se encontraron alertas para este expediente. Las alertas se generan automáticamente durante el procesamiento de documentos.
          </p>
        </CardContent>
      </Card>
    )
  }

  const AlertCard = ({ alert, showResolve }: { alert: ValidationAlert; showResolve: boolean }) => {
    const config = getSeverityConfig(alert.severity)

    return (
      <Card
        className={`bg-background border-border border-l-4 ${config.borderClass}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${alert.severity === "high" ? "text-destructive" : alert.severity === "medium" ? "text-amber-600" : "text-blue-500"}`}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge variant="outline" className={`text-xs ${config.badgeClass}`}>
                  {config.label}
                </Badge>
                {alert.resolved && (
                  <Badge variant="outline" className="text-xs bg-emerald-600/10 text-emerald-600 border-emerald-600">
                    Resuelta
                  </Badge>
                )}
              </div>
              <p className="text-sm text-foreground">{alert.message}</p>
              {alert.affected_fields && alert.affected_fields.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {alert.affected_fields.map((field, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs bg-sidebar-accent text-muted-foreground"
                    >
                      {field}
                    </Badge>
                  ))}
                </div>
              )}
              {alert.recommended_action && (
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-medium">Recomendación:</span> {alert.recommended_action}
                </p>
              )}
              {alert.resolved && alert.resolved_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Resuelta el {new Date(alert.resolved_at).toLocaleDateString("es-ES")}
                </p>
              )}
            </div>
            {showResolve && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleResolve(alert.id)}
                disabled={resolvingId === alert.id}
                className="shrink-0"
              >
                {resolvingId === alert.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Resolver
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{pendingAlerts.length}</span>{" "}
            pendientes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-600" />
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{resolvedAlerts.length}</span>{" "}
            resueltas
          </span>
        </div>
      </div>

      {/* Pending Alerts */}
      {pendingAlerts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Alertas pendientes</h4>
          {pendingAlerts
            .sort((a, b) => {
              const severityOrder = { high: 0, medium: 1, low: 2 }
              return severityOrder[a.severity] - severityOrder[b.severity]
            })
            .map((alert) => (
              <AlertCard key={alert.id} alert={alert} showResolve={true} />
            ))}
        </div>
      )}

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Alertas resueltas</h4>
          {resolvedAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} showResolve={false} />
          ))}
        </div>
      )}
    </div>
  )
}
