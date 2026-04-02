"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, XCircle, Loader2, FileText } from "lucide-react"
import { useUser } from "@/hooks/use-user"

interface CaseConflict {
  id: string
  case_id: string
  field_name: string
  left_document_id: string
  left_value: string
  right_document_id: string
  right_value: string
  severity: "low" | "medium" | "high"
  status: "open" | "resolved" | "dismissed"
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

interface DocumentInfo {
  id: string
  file_name: string
  document_type: string
}

interface ConflictsPanelProps {
  caseId: string
}

export function ConflictsPanel({ caseId }: ConflictsPanelProps) {
  const [conflicts, setConflicts] = useState<CaseConflict[]>([])
  const [documents, setDocuments] = useState<Record<string, DocumentInfo>>({})
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updateAction, setUpdateAction] = useState<"resolve" | "dismiss" | null>(null)
  const { profile } = useUser()

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch conflicts
      const { data: conflictsData, error: conflictsError } = await supabase
        .from("case_conflicts")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })

      if (conflictsError) throw conflictsError
      setConflicts(conflictsData || [])

      // Fetch documents for reference
      const { data: docsData, error: docsError } = await supabase
        .from("case_documents")
        .select("id, file_name, document_type")
        .eq("case_id", caseId)

      if (docsError) throw docsError

      const docsMap: Record<string, DocumentInfo> = {}
      docsData?.forEach((doc) => {
        docsMap[doc.id] = doc
      })
      setDocuments(docsMap)
    } catch (err) {
      console.error("Error fetching conflicts:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [caseId])

  const handleUpdateStatus = async (
    conflictId: string,
    newStatus: "resolved" | "dismissed"
  ) => {
    if (!profile) return

    setUpdatingId(conflictId)
    setUpdateAction(newStatus === "resolved" ? "resolve" : "dismiss")
    const supabase = createClient()

    const { error } = await supabase
      .from("case_conflicts")
      .update({
        status: newStatus,
        resolved_by: profile.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", conflictId)

    if (error) {
      console.error("Error updating conflict:", error)
    } else {
      await fetchData()
    }
    setUpdatingId(null)
    setUpdateAction(null)
  }

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "high":
        return {
          badgeClass: "bg-[var(--error-soft)] text-[var(--error)] border-[var(--error)]",
          label: "Alta",
        }
      case "medium":
        return {
          badgeClass: "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]",
          label: "Media",
        }
      case "low":
      default:
        return {
          badgeClass: "bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]",
          label: "Baja",
        }
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "resolved":
        return {
          badgeClass: "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]",
          label: "Resuelto",
        }
      case "dismissed":
        return {
          badgeClass: "bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]",
          label: "Descartado",
        }
      case "open":
      default:
        return {
          badgeClass: "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]",
          label: "Abierto",
        }
    }
  }

  if (loading) {
    return (
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-[var(--primary)]" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">Cargando conflictos...</p>
        </CardContent>
      </Card>
    )
  }

  if (conflicts.length === 0) {
    return (
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-[var(--success)]" />
          </div>
          <h3 className="text-base font-medium text-[var(--text)] mb-1">
            No hay conflictos entre documentos
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
            No se encontraron discrepancias entre los valores extraídos de diferentes documentos.
          </p>
        </CardContent>
      </Card>
    )
  }

  const openConflicts = conflicts.filter((c) => c.status === "open")
  const closedConflicts = conflicts.filter((c) => c.status !== "open")

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--warning)]" />
          <span className="text-sm text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text)]">{openConflicts.length}</span>{" "}
            abiertos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
          <span className="text-sm text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text)]">{closedConflicts.length}</span>{" "}
            cerrados
          </span>
        </div>
      </div>

      {/* Open Conflicts */}
      {openConflicts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[var(--text)]">Conflictos abiertos</h4>
          {openConflicts.map((conflict) => {
            const severityConfig = getSeverityConfig(conflict.severity)
            const leftDoc = documents[conflict.left_document_id]
            const rightDoc = documents[conflict.right_document_id]

            return (
              <Card
                key={conflict.id}
                className="bg-[var(--bg)] border-[var(--border)]"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                      <span className="font-medium text-[var(--text)]">
                        {conflict.field_name}
                      </span>
                      <Badge variant="outline" className={`text-xs ${severityConfig.badgeClass}`}>
                        {severityConfig.label}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]">
                      Abierto
                    </Badge>
                  </div>

                  {/* Side by side comparison */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-3 w-3 text-[var(--text-muted)]" />
                        <span className="text-xs text-[var(--text-muted)] truncate">
                          {leftDoc?.file_name || "Documento"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[var(--text)]">
                        {conflict.left_value || "—"}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-3 w-3 text-[var(--text-muted)]" />
                        <span className="text-xs text-[var(--text-muted)] truncate">
                          {rightDoc?.file_name || "Documento"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[var(--text)]">
                        {conflict.right_value || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(conflict.id, "dismissed")}
                      disabled={updatingId === conflict.id}
                    >
                      {updatingId === conflict.id && updateAction === "dismiss" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Descartar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(conflict.id, "resolved")}
                      disabled={updatingId === conflict.id}
                    >
                      {updatingId === conflict.id && updateAction === "resolve" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolver
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Closed Conflicts */}
      {closedConflicts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[var(--text-muted)]">Conflictos cerrados</h4>
          {closedConflicts.map((conflict) => {
            const severityConfig = getSeverityConfig(conflict.severity)
            const statusConfig = getStatusConfig(conflict.status)
            const leftDoc = documents[conflict.left_document_id]
            const rightDoc = documents[conflict.right_document_id]

            return (
              <Card
                key={conflict.id}
                className="bg-[var(--bg)] border-[var(--border)] opacity-75"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text)]">
                        {conflict.field_name}
                      </span>
                      <Badge variant="outline" className={`text-xs ${severityConfig.badgeClass}`}>
                        {severityConfig.label}
                      </Badge>
                    </div>
                    <Badge variant="outline" className={`text-xs ${statusConfig.badgeClass}`}>
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                      <span className="text-xs text-[var(--text-muted)] block truncate mb-1">
                        {leftDoc?.file_name || "Documento"}
                      </span>
                      <p className="text-sm text-[var(--text)]">
                        {conflict.left_value || "—"}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                      <span className="text-xs text-[var(--text-muted)] block truncate mb-1">
                        {rightDoc?.file_name || "Documento"}
                      </span>
                      <p className="text-sm text-[var(--text)]">
                        {conflict.right_value || "—"}
                      </p>
                    </div>
                  </div>

                  {conflict.resolved_at && (
                    <p className="text-xs text-[var(--text-faint)] mt-2">
                      {conflict.status === "resolved" ? "Resuelto" : "Descartado"} el{" "}
                      {new Date(conflict.resolved_at).toLocaleDateString("es-ES")}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
