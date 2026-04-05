"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown, AlertTriangle } from "lucide-react"

interface ExportProfile {
  id: string
  name: string
  profile_key?: string
  format: "csv" | "xlsx" | "json"
  is_predefined?: boolean
}

interface ExportCaseDialogProps {
  caseId: string
  caseName: string
}

export function ExportCaseDialog({ caseId, caseName }: ExportCaseDialogProps) {
  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState<ExportProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [exportResult, setExportResult] = useState<{
    headers: string[]
    rows: Record<string, unknown>[]
    filename: string
    format: string
  } | null>(null)

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch("/api/exports")
      
      if (!response.ok) {
        throw new Error("Error al cargar los perfiles de exportación")
      }

      const data = await response.json()
      setProfiles(data.profiles || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (profile: ExportProfile) => {
    try {
      setExporting(true)
      setError(null)
      setWarnings([])
      setExportResult(null)

      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          profile_id: profile.is_predefined ? undefined : profile.id,
          profile_key: profile.is_predefined ? profile.profile_key : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al generar la exportación")
      }

      const data = await response.json()
      
      if (data.export.warnings?.length > 0) {
        setWarnings(data.export.warnings)
      }

      setExportResult(data.export)

      // Trigger download
      downloadExport(data.export)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setExporting(false)
    }
  }

  const downloadExport = (exportData: {
    headers: string[]
    rows: Record<string, unknown>[]
    filename: string
    format: string
  }) => {
    let content: string
    let mimeType: string

    if (exportData.format === "csv") {
      // Convert to CSV
      const csvRows = [
        exportData.headers.join(","),
        ...exportData.rows.map((row) =>
          exportData.headers.map((h) => {
            const value = row[h]
            if (value === null || value === undefined) return ""
            const stringValue = String(value)
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
              return `"${stringValue.replace(/"/g, '""')}"`
            }
            return stringValue
          }).join(",")
        ),
      ]
      content = csvRows.join("\n")
      mimeType = "text/csv;charset=utf-8;"
    } else if (exportData.format === "xlsx") {
      // For XLSX, we'll create a simple HTML table that Excel can open
      const tableRows = exportData.rows.map((row) =>
        `<tr>${exportData.headers.map((h) => `<td>${row[h] || ""}</td>`).join("")}</tr>`
      ).join("")
      content = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <table>
            <thead><tr>${exportData.headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
        </html>
      `
      mimeType = "application/vnd.ms-excel"
    } else {
      content = JSON.stringify(exportData.rows, null, 2)
      mimeType = "application/json"
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = exportData.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getProfileIcon = (format: string) => {
    switch (format) {
      case "csv":
        return <FileText className="h-4 w-4" />
      case "xlsx":
        return <FileSpreadsheet className="h-4 w-4" />
      default:
        return <Download className="h-4 w-4" />
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
              <ChevronDown className="h-3 w-3" />
            </Button>
          }
          onClick={fetchProfiles}
        />
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Exportar expediente
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {caseName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <Alert className="bg-destructive/10 border-destructive">
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {warnings.length > 0 && (
                  <Alert className="bg-amber-600/10 border-amber-600">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-foreground">
                      <p className="font-medium mb-1">Advertencias:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {exportResult && (
                  <Alert className="bg-emerald-600/10 border-emerald-600">
                    <AlertDescription className="text-foreground">
                      <p className="font-medium">Exportación completada</p>
                      <p className="text-sm text-muted-foreground">
                        {exportResult.filename} ({exportResult.rows.length} filas)
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Selecciona un formato de exportación:
                  </p>
                  <div className="grid gap-2">
                    {profiles.map((profile) => (
                      <Button
                        key={profile.id}
                        variant="outline"
                        className="justify-start gap-3 h-auto py-3"
                        onClick={() => handleExport(profile)}
                        disabled={exporting}
                      >
                        {exporting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          getProfileIcon(profile.format)
                        )}
                        <div className="text-left">
                          <p className="font-medium">{profile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Formato {profile.format.toUpperCase()}
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
