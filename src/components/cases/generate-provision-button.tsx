"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sparkles, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import { CaseStatus } from "@/types/database"

interface GenerateProvisionButtonProps {
  caseId: string
  caseStatus: CaseStatus
  hasExtractedData: boolean
}

export function GenerateProvisionButton({
  caseId,
  caseStatus,
  hasExtractedData,
}: GenerateProvisionButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingProvisionId, setExistingProvisionId] = useState<string | null>(null)

  // Check if case status allows provision generation
  const canGenerateProvision = [
    "ready_for_provision",
    "needs_review",
    "documents_uploaded",
    "processing",
  ].includes(caseStatus)

  const handleGenerate = async () => {
    try {
      setLoading(true)
      setError(null)
      setExistingProvisionId(null)

      const response = await fetch(`/api/cases/${caseId}/generate-provision`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409 && data.provision_id) {
          setExistingProvisionId(data.provision_id)
          setError("Ya existe una provisión para este expediente.")
          return
        }
        throw new Error(data.error || "Error al generar la provisión")
      }

      // Close dialog and redirect to provisions page after a short delay
      setOpen(false)
      router.push("/provisions")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const handleViewExisting = () => {
    if (existingProvisionId) {
      router.push(`/provisions/${existingProvisionId}`)
    }
  }

  if (!canGenerateProvision) {
    return null
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
      >
        <Sparkles className="h-4 w-4" />
        Generar provisión con IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[var(--surface)] border-[var(--border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text)] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Generar provisión con IA
            </DialogTitle>
            <DialogDescription className="text-[var(--text-muted)]">
              El sistema analizará los documentos del expediente para generar automáticamente una provisión con los conceptos detectados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!hasExtractedData && (
              <Alert className="bg-[var(--warning)]/10 border-[var(--warning)]">
                <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                <AlertDescription className="text-[var(--text)]">
                  El expediente no tiene datos extraídos. Procesa los documentos primero para obtener mejores resultados.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="bg-[var(--error)]/10 border-[var(--error)]">
                <AlertTriangle className="h-4 w-4 text-[var(--error)]" />
                <AlertDescription className="text-[var(--text)]">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 text-sm text-[var(--text-muted)]">
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--success)]" />
                Análisis de facturas comerciales
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--success)]" />
                Detección de aranceles e impuestos
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--success)]" />
                Cálculo de gastos de gestión
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--success)]" />
                Generación de conceptos desglosados
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            {existingProvisionId ? (
              <Button onClick={handleViewExisting}>
                Ver provisión existente
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generar provisión
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
