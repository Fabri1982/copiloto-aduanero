"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, AlertCircle, Info, CheckCircle, Loader2 } from "lucide-react"

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
  const [error, setError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const fetchAlerts = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/cases/${caseId}/alerts`)
      if (!response.ok) {
        throw new Error("Error al cargar alertas")
      }
      const data = await response.json()
      setAlerts(data.alerts || [])
    } catch (err) {
      console.error("Error fetching alerts:", err)
      setError("No se pudieron cargar las alertas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [caseId])

  const handleResolve = async (alertId: string) => {
    setResolvingId(alertId)
    
    try {
      const response = await fetch(`/api/cases/${caseId}/alerts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, resolved: true }),
      })

      if (!response.ok) {
        throw new Error("Error al resolver alerta")
      }

      await fetchAlerts()
    } catch (err) {
      console.error("Error resolving alert:", err)
    } finally {
      setResolvingId(null)
    }
  }

  const pendingAlerts = alerts.filter((a) => !a.resolved)
  const resolvedAlerts = alerts.filter((a) => a.resolved)

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "high":
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          badgeClass: "bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/30",
          borderClass: "border-l-[var(--error)]",
          label: "Alta",
        }
      case "medium":
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          badgeClass: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30",
          borderClass: "border-l-[var(--warning)]",
          label: "Media",
        }
      case "low":
      default:
        return {
          icon: <Info className="h-5 w-5" />,
          badgeClass: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30",
          borderClass: "border-l-[var(--primary)]",
          label: "Baja",
        }
    }
  }

  if (loading) {
    return (
      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-[var(--primary)]" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">Cargando alertas...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-[var(--error)] mb-3" />
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchAlerts} className="mt-4">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--success)]/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-[var(--success)]" />
          </div>
          <h3 className="text-base font-medium text-[var(--text)] mb-1">
            No hay alertas de validación
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
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
        className={`bg-[var(--surface)] border-[var(--border)] border-l-4 ${config.borderClass} rounded-xl`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${alert.severity === "high" ? "text-[var(--error)]" : alert.severity === "medium" ? "text-[var(--warning)]" : "text-[var(--primary)]"}`}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge variant="outline" className={`text-xs ${config.badgeClass}`}>
                  {config.label}
                </Badge>
                {alert.resolved && (
                  <Badge variant="outline" className="text-xs bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30">
                    Resuelta
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[var(--text)]">{alert.message}</p>
              {alert.affected_fields && alert.affected_fields.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {alert.affected_fields.map((field, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]"
                    >
                      {field}
                    </Badge>
                  ))}
                </div>
              )}
              {alert.recommended_action && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  <span className="font-medium">Recomendación:</span> {alert.recommended_action}
                </p>
              )}
              {alert.resolved && alert.resolved_at && (
                <p className="text-xs text-[var(--text-muted)]/60 mt-2">
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
          <div className="w-2 h-2 rounded-full bg-[var(--error)]" />
          <span className="text-sm text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text)]">{pendingAlerts.length}</span>{" "}
            pendientes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
          <span className="text-sm text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text)]">{resolvedAlerts.length}</span>{" "}
            resueltas
          </span>
        </div>
      </div>

      {/* Pending Alerts */}
      {pendingAlerts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[var(--text)]">Alertas pendientes</h4>
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
          <h4 className="text-sm font-medium text-[var(--text-muted)]">Alertas resueltas</h4>
          {resolvedAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} showResolve={false} />
          ))}
        </div>
      )}
    </div>
  )
}
