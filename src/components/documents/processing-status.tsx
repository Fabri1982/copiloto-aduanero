"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  RefreshCw,
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
  const [manualRefresh, setManualRefresh] = useState(0)

  const fetchExtractions = useCallback(async (forceRefresh = false) => {
    if (documents.length === 0) {
      setLoading(false)
      return
    }

    if (forceRefresh) {
      console.log('[ProcessingStatus] Manual refresh triggered...')
      setLoading(true) // Show loading indicator on manual refresh
    } else {
      console.log('[ProcessingStatus] Fetching extractions...')
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

    console.log('[ProcessingStatus] Extractions fetched:', data)
    const extractionMap: Record<string, DocumentExtraction> = {}
    data?.forEach((ext) => {
      extractionMap[ext.document_id] = ext
    })
    setExtractions(extractionMap)
    setLoading(false)
  }, [documents])

  // Initial load and manual refresh
  useEffect(() => {
    fetchExtractions()
  }, []) // Only on mount

  // Manual refresh trigger
  useEffect(() => {
    if (manualRefresh > 0) {
      fetchExtractions(true)
    }
  }, [manualRefresh, fetchExtractions])

  // Auto-refresh while any document is processing, pending, or missing from extractions
  useEffect(() => {
    const hasProcessing = documents.some((doc) => {
      const ext = extractions[doc.id]
      return !ext || ext.status === "processing" || ext.status === "pending"
    })

    if (!hasProcessing) return

    const interval = setInterval(() => {
      console.log('[ProcessingStatus] Auto-refreshing extractions...')
      fetchExtractions()
    }, 3000)

    // Refresh when window regains focus
    const handleFocus = () => {
      console.log('[ProcessingStatus] Window focused, refreshing...')
      fetchExtractions()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [extractions, fetchExtractions])

  const handleRetry = async (document: Document) => {
    setRetrying((prev) => ({ ...prev, [document.id]: true }))

    try {
      const response = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          caseId: caseId,
          filePath: document.file_path,
          fileName: document.file_name,
          mimeType: "application/pdf", // Default, could be improved
          agencyId: agencyId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to retry processing")
      }

      // Refresh after retry
      await fetchExtractions()
    } catch (err) {
      console.error("Error retrying processing:", err)
    } finally {
      setRetrying((prev) => ({ ...prev, [document.id]: false }))
    }
  }

  const getStatusIcon = (status: ProcessingState) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-[var(--text-muted)]" />
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-[var(--success)]" />
      case "failed":
        return <XCircle className="h-4 w-4 text-[var(--error)]" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: ProcessingState) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "processing":
        return "Procesando"
      case "completed":
        return "Completado"
      case "failed":
        return "Error"
      default:
        return status
    }
  }

  const getStatusClass = (status: ProcessingState) => {
    switch (status) {
      case "pending":
        return "bg-[var(--text-muted)]/10 text-[var(--text-muted)]"
      case "processing":
        return "bg-[var(--primary)]/10 text-[var(--primary)]"
      case "completed":
        return "bg-[var(--success)]/10 text-[var(--success)]"
      case "failed":
        return "bg-[var(--error)]/10 text-[var(--error)]"
      default:
        return ""
    }
  }

  const handleManualRefresh = () => {
    setManualRefresh(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (documents.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* Manual refresh button */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => console.log('[Debug] Current extractions:', extractions)}
          className="h-8 text-xs"
        >
          Debug
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualRefresh}
          className="h-8 gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar estado
        </Button>
      </div>
      {documents.map((doc) => {
        const extraction = extractions[doc.id]
        // Treat "pending" as "processing" since Inngest may have created the record but not updated yet
        const rawStatus: ProcessingState = extraction?.status || "pending"
        const status: ProcessingState = rawStatus === "pending" ? "processing" : rawStatus
        
        console.log(`[Document ${doc.file_name}] Status:`, { 
          raw: rawStatus, 
          display: status,
          extractionId: extraction?.id,
          updatedAt: extraction?.updated_at 
        })

        return (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text)] truncate">
                {doc.file_name}
              </p>
              {extraction?.error_message && status === "failed" && (
                <p className="text-xs text-[var(--error)] truncate">
                  {extraction.error_message}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(
                  status
                )}`}
              >
                {getStatusIcon(status)}
                {getStatusLabel(status)}
              </span>
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
        )
      })}
    </div>
  )
}
