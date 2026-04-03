"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PDFViewer } from "./pdf-viewer"
import { ExtractedFields } from "./extracted-fields"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Document {
  id: string
  file_name: string
  file_path: string
  document_type: string
}

interface DualViewProps {
  caseId: string
  documents: Document[]
}

type ProcessingState = "pending" | "processing" | "completed" | "failed"

interface DocumentExtraction {
  document_id: string
  status: ProcessingState
}

export function DualView({ caseId, documents }: DualViewProps) {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    documents.length > 0 ? documents[0].id : null
  )
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [extractions, setExtractions] = useState<Record<string, DocumentExtraction>>({})

  // Fetch document extractions status
  useEffect(() => {
    const fetchExtractions = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("document_extractions")
        .select("document_id, status")
        .in(
          "document_id",
          documents.map((d) => d.id)
        )

      if (error) {
        console.error("Error fetching extractions:", error)
        return
      }

      const extractionMap: Record<string, DocumentExtraction> = {}
      data?.forEach((ext) => {
        extractionMap[ext.document_id] = ext
      })
      setExtractions(extractionMap)
    }

    if (documents.length > 0) {
      fetchExtractions()
      
      // Auto-refresh while any document is processing, pending, or missing from extractions
      const hasProcessing = documents.some((doc) => {
        const ext = extractions[doc.id]
        return !ext || ext.status === "processing" || ext.status === "pending"
      })
      
      if (hasProcessing) {
        const interval = setInterval(() => {
          console.log('[DualView] Auto-refreshing extractions...')
          fetchExtractions()
        }, 3000)
        
        // Refresh when window regains focus
        const handleFocus = () => {
          console.log('[DualView] Window focused, refreshing...')
          fetchExtractions()
        }
        window.addEventListener('focus', handleFocus)
        
        return () => {
          clearInterval(interval)
          window.removeEventListener('focus', handleFocus)
        }
      }
    }
  }, [documents, extractions])

  // Supabase Realtime subscription for automatic updates
  useEffect(() => {
    if (documents.length === 0) return

    const supabase = createClient()
    const channel = supabase
      .channel('dualview-extractions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_extractions',
          filter: `document_id=in.(${documents.map(d => d.id).join(',')})`,
        },
        () => {
          console.log('[DualView] Realtime change detected, refreshing...')
          // Trigger re-fetch by updating extractions state
          setExtractions(prev => ({ ...prev }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [documents])

  // Get signed URL when document selection changes
  useEffect(() => {
    const getSignedUrl = async () => {
      if (!selectedDocumentId) {
        setSignedUrl(null)
        return
      }

      const selectedDoc = documents.find((d) => d.id === selectedDocumentId)
      if (!selectedDoc) {
        setSignedUrl(null)
        return
      }

      setLoadingUrl(true)
      const supabase = createClient()

      try {
        const { data, error } = await supabase.storage
          .from("case-documents")
          .createSignedUrl(selectedDoc.file_path, 3600) // 1 hour

        if (error) throw error

        setSignedUrl(data.signedUrl)
      } catch (err) {
        console.error("Error getting signed URL:", err)
        setSignedUrl(null)
      } finally {
        setLoadingUrl(false)
      }
    }

    getSignedUrl()
  }, [selectedDocumentId, documents])

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId)
  const extractionStatus = selectedDocumentId
    ? extractions[selectedDocumentId]?.status
    : null

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      commercial_invoice: "Factura comercial",
      packing_list: "Packing list",
      bl: "Bill of Lading",
      awb: "Air Waybill",
      payment_receipt: "Comprobante de pago",
      unknown: "Otro",
    }
    return labels[type] || type
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-[var(--surface)] rounded-xl border border-[var(--border)]">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-base font-medium text-[var(--text)] mb-1">
          No hay documentos
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          Sube documentos para ver el contenido y los datos extraídos.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px] bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Document Selector */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex-1">
          <Select
            value={selectedDocumentId || undefined}
            onValueChange={setSelectedDocumentId}
          >
            <SelectTrigger className="w-full max-w-md bg-[var(--bg)] border-[var(--border)]">
              <SelectValue placeholder="Seleccionar documento" />
            </SelectTrigger>
            <SelectContent>
              {documents.map((doc) => (
                <SelectItem key={doc.id} value={doc.id}>
                  <div className="flex items-center gap-2">
                    <span className="truncate">{doc.file_name}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      ({getDocumentTypeLabel(doc.document_type)})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Processing Status Badge */}
        {extractionStatus && (
          <div className="flex items-center gap-2">
            {extractionStatus === "processing" && (
              <div className="flex items-center gap-2 text-sm text-[var(--primary)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Procesando...</span>
              </div>
            )}
            {extractionStatus === "completed" && (
              <div className="flex items-center gap-2 text-sm text-[var(--success)]">
                <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                <span>Procesado</span>
              </div>
            )}
            {extractionStatus === "failed" && (
              <div className="flex items-center gap-2 text-sm text-[var(--error)]">
                <AlertCircle className="h-4 w-4" />
                <span>Error</span>
              </div>
            )}
            {extractionStatus === "pending" && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
                <span>Pendiente</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: PDF Viewer */}
        <div className="flex-1 border-r border-[var(--border)] min-w-0">
          {loadingUrl ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Cargando documento...
              </p>
            </div>
          ) : signedUrl ? (
            <PDFViewer url={signedUrl} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <AlertCircle className="h-8 w-8 text-[var(--text-muted)]" />
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                No se pudo cargar el documento
              </p>
            </div>
          )}
        </div>

        {/* Right: Extracted Fields */}
        <div className="w-[400px] flex-shrink-0 bg-[var(--bg)]">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
            <h3 className="text-sm font-medium text-[var(--text)]">
              Datos extraídos
            </h3>
          </div>
          <div className="h-[calc(100%-49px)]">
            <ExtractedFields
              caseId={caseId}
              selectedDocumentId={selectedDocumentId}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
