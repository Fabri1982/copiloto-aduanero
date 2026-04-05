"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, AlertCircle, CheckCircle, Loader2, ArrowRight } from "lucide-react"

interface CaseConflict {
  id: string
  case_id: string
  field_name: string
  left_value: string
  right_value: string
  left_source: string
  right_source: string
  severity: "low" | "medium" | "high"
  status: "pending" | "resolved"
  resolved_value: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

interface ConflictsPanelProps {
  caseId: string
}

export function ConflictsPanel({ caseId }: ConflictsPanelProps) {
  const [conflicts, setConflicts] = useState<CaseConflict[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const fetchConflicts = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/cases/${caseId}/conflicts`)
      if (!response.ok) {
        throw new Error("Error al cargar conflictos")
      }
      const data = await response.json()
      setConflicts(data.conflicts || [])
    } catch (err) {
      console.error("Error fetching conflicts:", err)
      setError("No se pudieron cargar los conflictos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConflicts()
  }, [caseId])

  const handleResolve = async (conflictId: string, chosenValue: "left" | "right") => {
    setResolvingId(conflictId)
    
    try {
      const response = await fetch(`/api/cases/${caseId}/conflicts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId, chosenValue }),
      })

      if (!response.ok) {
        throw new Error("Error al resolver conflicto")
      }

      await fetchConflicts()
    } catch (err) {
      console.error("Error resolving conflict:", err)
    } finally {
      setResolvingId(null)
    }
  }

  const pendingConflicts = conflicts.filter((c) => c.status === "pending")
  const resolvedConflicts = conflicts.filter((c) => c.status === "resolved")

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "high":
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
          label: "Alta",
        }
      case "medium":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          badgeClass: "bg-amber-500/10 text-amber-600 border-amber-600/30",
          label: "Media",
        }
      case "low":
      default:
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          badgeClass: "bg-primary/10 text-primary border-primary/30",
          label: "Baja",
        }
    }
  }

  if (loading) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Cargando conflictos...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-3" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchConflicts} className="mt-4">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (conflicts.length === 0) {
    return (
      <Card className="bg-card border-border rounded-xl">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-base font-medium text-foreground mb-1">
            No hay conflictos detectados
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No se encontraron conflictos entre documentos para este expediente.
          </p>
        </CardContent>
      </Card>
    )
  }

  const ConflictCard = ({ conflict, showResolve }: { conflict: CaseConflict; showResolve: boolean }) => {
    const config = getSeverityConfig(conflict.severity)

    return (
      <Card className="bg-card border-border rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${config.badgeClass}`}>
                <span className="flex items-center gap-1">
                  {config.icon}
                  {config.label}
                </span>
              </Badge>
              <span className="text-sm font-medium text-foreground">{conflict.field_name}</span>
            </div>
            {conflict.status === "resolved" && (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-600/30">
                Resuelto
              </Badge>
            )}
          </div>

          {/* Values Comparison */}
          <div className="p-4">
            {conflict.status === "resolved" ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-600/5 border border-emerald-600/20">
                  <p className="text-xs text-muted-foreground mb-1">Valor resuelto</p>
                  <p className="text-sm font-medium text-emerald-600">{conflict.resolved_value}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <p className="text-xs text-muted-foreground mb-1">{conflict.left_source}</p>
                    <p className="text-sm text-foreground line-through opacity-50">{conflict.left_value}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <p className="text-xs text-muted-foreground mb-1">{conflict.right_source}</p>
                    <p className="text-sm text-foreground line-through opacity-50">{conflict.right_value}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                  {/* Left Value */}
                  <div className="p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
                    <p className="text-xs text-muted-foreground mb-1">{conflict.left_source}</p>
                    <p className="text-sm font-medium text-foreground">{conflict.left_value || "—"}</p>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Right Value */}
                  <div className="p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
                    <p className="text-xs text-muted-foreground mb-1">{conflict.right_source}</p>
                    <p className="text-sm font-medium text-foreground">{conflict.right_value || "—"}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                {showResolve && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(conflict.id, "left")}
                      disabled={resolvingId === conflict.id}
                      className="flex-1"
                    >
                      {resolvingId === conflict.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Usar {conflict.left_source}
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(conflict.id, "right")}
                      disabled={resolvingId === conflict.id}
                      className="flex-1"
                    >
                      {resolvingId === conflict.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Usar {conflict.right_source}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
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
          <div className="w-2 h-2 rounded-full bg-amber-600" />
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{pendingConflicts.length}</span>{" "}
            pendientes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-600" />
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{resolvedConflicts.length}</span>{" "}
            resueltos
          </span>
        </div>
      </div>

      {/* Pending Conflicts */}
      {pendingConflicts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Conflictos pendientes</h4>
          {pendingConflicts
            .sort((a, b) => {
              const severityOrder = { high: 0, medium: 1, low: 2 }
              return severityOrder[a.severity] - severityOrder[b.severity]
            })
            .map((conflict) => (
              <ConflictCard key={conflict.id} conflict={conflict} showResolve={true} />
            ))}
        </div>
      )}

      {/* Resolved Conflicts */}
      {resolvedConflicts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Conflictos resueltos</h4>
          {resolvedConflicts.map((conflict) => (
            <ConflictCard key={conflict.id} conflict={conflict} showResolve={false} />
          ))}
        </div>
      )}
    </div>
  )
}
