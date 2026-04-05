"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react"

type ProcessingState = "pending" | "processing" | "completed" | "failed"

interface DocumentExtraction {
  id: string
  document_id: string
  status: ProcessingState
  error_message: string | null
  created_at: string
  updated_at: string
}

interface Document {
  id: string
  file_name: string
  file_path: string
  document_type: string
}

interface ProcessingStatusProps {
  caseId: string
  documents: Document[]
  agencyId: string
}

export function ProcessingStatus({ caseId, documents, agencyId }: ProcessingStatusProps) {
  const [extractions, setExtractions] = useState<Record<string, DocumentExtraction>>({})
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<Record<string, boolean>>({})
  const [justCompleted, setJustCompleted] = useState<string[]>([])

  const fetchExtractions = useCallback(async () => {
    if (documents.length === 0) {
      setLoading(false)
      return
    }
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from("document_extractions")
      .select("*")
      .in(
        "document_id",
        documents.map((d) => d.id)
      )

    if (error) {
      console.error("Error fetching extractions:", error)
      setLoading(false)
      return
    }

    const extractionMap: Record<string, DocumentExtraction> = {}
    data?.forEach((ext) => {
      const prevStatus = extractions[ext.document_id]?.status
      extractionMap[ext.document_id] = ext
      
      // Detect newly completed documents for animation
      if (prevStatus === "processing" && ext.status === "completed") {
        setJustCompleted(prev => [...prev, ext.document_id])
        setTimeout(() => {
          setJustCompleted(prev => prev.filter(id => id !== ext.document_id))
        }, 3000)
      }
    })
    setExtractions(extractionMap)
    setLoading(false)
  }, [documents, extractions])

  useEffect(() => {
    fetchExtractions()
  }, [])

  // Supabase Realtime subscription
  useEffect(() => {
    if (documents.length === 0) return

    const supabase = createClient()
    const channel = supabase
      .channel('document-extractions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_extractions',
          filter: `document_id=in.(${documents.map(d => d.id).join(',')})`,
        },
        () => {
          fetchExtractions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [documents, fetchExtractions])

  // Auto-refresh while processing
  useEffect(() => {
    const hasProcessing = documents.some((doc) => {
      const ext = extractions[doc.id]
      return !ext || ext.status === "processing" || ext.status === "pending"
    })

    if (!hasProcessing) return

    const interval = setInterval(fetchExtractions, 3000)
    return () => clearInterval(interval)
  }, [extractions, fetchExtractions])

  const handleRetry = async (document: Document) => {
    setRetrying((prev) => ({ ...prev, [document.id]: true }))

    try {
      const response = await fetch("/api/documents/process-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          caseId: caseId,
          filePath: document.file_path,
          fileName: document.file_name,
          mimeType: "application/pdf",
          agencyId: agencyId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to retry processing")
      }

      await fetchExtractions()
    } catch (err) {
      console.error("Error retrying processing:", err)
    } finally {
      setRetrying((prev) => ({ ...prev, [document.id]: false }))
    }
  }

  // Calculate summary stats
  const totalDocs = documents.length
  const completedCount = documents.filter(d => extractions[d.id]?.status === "completed").length
  const processingCount = documents.filter(d => {
    const ext = extractions[d.id]
    return !ext || ext.status === "processing" || ext.status === "pending"
  }).length
  const failedCount = documents.filter(d => extractions[d.id]?.status === "failed").length
  const allCompleted = completedCount === totalDocs && totalDocs > 0

  const getStatusIcon = (status: ProcessingState, docId: string) => {
    const isJustCompleted = justCompleted.includes(docId)
    
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case "completed":
        return isJustCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 animate-bounce" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        )
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: ProcessingState) => {
    switch (status) {
      case "pending":
        return "En cola"
      case "processing":
        return "Procesando con IA..."
      case "completed":
        return "Completado"
      case "failed":
        return "Error"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  if (documents.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {/* Summary banner */}
      {allCompleted ? (
        <div className="flex items-center gap-3 p-3 rounded-[10px] border border-border bg-card">
          <Sparkles className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-[15px] font-normal text-foreground tracking-[-0.45px]">
              ¡Documento procesado exitosamente!
            </p>
            <p className="text-xs text-muted-foreground">
              Los datos extraídos están disponibles en el panel derecho
            </p>
          </div>
        </div>
      ) : processingCount > 0 ? (
        <div className="flex items-center gap-3 p-3 rounded-[10px] border border-border bg-card">
          <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-[15px] font-normal text-foreground tracking-[-0.45px]">
              Procesando documento{processingCount > 1 ? 's' : ''} con IA...
            </p>
            <p className="text-xs text-muted-foreground">
              {completedCount > 0 && `${completedCount} completado${completedCount > 1 ? 's' : ''} · `}
              No cierres esta página
            </p>
          </div>
        </div>
      ) : failedCount > 0 ? (
        <div className="flex items-center gap-3 p-3 rounded-[10px] border border-border bg-card">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-[15px] font-normal text-foreground tracking-[-0.45px]">
              Error al procesar {failedCount} documento{failedCount > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              Puedes reintentar desde la lista
            </p>
          </div>
        </div>
      ) : null}

      {/* Document list */}
      {documents.map((doc) => {
        const extraction = extractions[doc.id]
        const rawStatus: ProcessingState = extraction?.status || "pending"
        const status: ProcessingState = rawStatus === "pending" ? "processing" : rawStatus
        const isJustCompleted = justCompleted.includes(doc.id)

        return (
          <div
            key={doc.id}
            className={`relative h-[46px] rounded-[10px] border border-border bg-sidebar hover:bg-sidebar-accent px-[7px] transition-all duration-300 ${
              isJustCompleted ? "ring-2 ring-emerald-600/20" : ""
            }`}
          >
            <div className="grid h-full items-center gap-2 sm:gap-3 md:gap-4 overflow-hidden grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(120px,auto)] md:grid-cols-[minmax(0,1fr)_minmax(140px,auto)_minmax(110px,auto)] lg:grid-cols-[minmax(0,1fr)_minmax(160px,auto)_minmax(130px,auto)_minmax(70px,auto)]">
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <div className={`flex size-8 items-center justify-center rounded-[6px] border border-border bg-background shrink-0 ${
                  status === "completed" ? "bg-emerald-600/20" :
                  status === "failed" ? "bg-red-600/20" :
                  ""
                }`}>
                  {getStatusIcon(status, doc.id)}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-normal text-foreground tracking-[-0.45px] truncate">
                    {doc.file_name}
                  </p>
                  {extraction?.error_message && status === "failed" && (
                    <p className="text-xs text-red-600 truncate">
                      {extraction.error_message}
                    </p>
                  )}
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 min-w-0 overflow-hidden">
                <span
                  className={`text-[14px] font-normal tracking-[-0.42px] whitespace-nowrap truncate min-w-0 ${
                    status === "processing" ? "text-primary" :
                    status === "completed" ? "text-emerald-600" :
                    status === "failed" ? "text-red-600" :
                    "text-muted-foreground"
                  }`}
                >
                  {getStatusLabel(status)}
                </span>
              </div>

              <div className="hidden md:flex items-center justify-end gap-2 min-w-0 overflow-hidden">
                {status === "failed" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRetry(doc)}
                    disabled={retrying[doc.id]}
                    className="h-7 w-7"
                  >
                    {retrying[doc.id] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
