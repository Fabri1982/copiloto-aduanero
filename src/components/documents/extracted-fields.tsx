"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { ConfidenceIndicator } from "@/components/shared/confidence-indicator"
import { FieldEditor } from "@/components/documents/field-editor"
import { Loader2, FileText } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ExtractedField {
  id: string
  case_id: string
  document_id: string | null
  field_name: string
  field_label: string
  extracted_value: string
  confidence: number
  evidence_text: string | null
  page_number: number | null
  manually_corrected: boolean
  created_at: string
}

interface Document {
  id: string
  file_name: string
  document_type: string
}

interface ExtractedFieldsProps {
  caseId: string
  selectedDocumentId?: string | null
}

export function ExtractedFields({ caseId, selectedDocumentId }: ExtractedFieldsProps) {
  const [fields, setFields] = useState<ExtractedField[]>([])
  const [documents, setDocuments] = useState<Record<string, Document>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const supabase = createClient()

      try {
        // Fetch extracted fields
        let query = supabase
          .from("extracted_fields")
          .select("*")
          .eq("case_id", caseId)

        if (selectedDocumentId) {
          query = query.eq("document_id", selectedDocumentId)
        }

        const { data: fieldsData, error: fieldsError } = await query.order("created_at", { ascending: false })

        if (fieldsError) throw fieldsError

        setFields(fieldsData || [])

        // Fetch documents for reference
        const { data: docsData, error: docsError } = await supabase
          .from("case_documents")
          .select("id, file_name, document_type")
          .eq("case_id", caseId)

        if (docsError) throw docsError

        const docsMap: Record<string, Document> = {}
        docsData?.forEach((doc) => {
          docsMap[doc.id] = doc
        })
        setDocuments(docsMap)
      } catch (err) {
        console.error("Error fetching extracted fields:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [caseId, selectedDocumentId])

  // Group fields by document
  const groupedFields = fields.reduce((acc, field) => {
    const docId = field.document_id || "unknown"
    if (!acc[docId]) {
      acc[docId] = []
    }
    acc[docId].push(field)
    return acc
  }, {} as Record<string, ExtractedField[]>)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">Cargando datos extraídos...</p>
      </div>
    )
  }

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-4">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
          <FileText className="h-6 w-6 text-[var(--text-muted)]" />
        </div>
        <p className="text-sm text-[var(--text-muted)] text-center">
          Los datos se extraerán automáticamente al procesar los documentos.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4">
      <TooltipProvider>
        {Object.entries(groupedFields).map(([docId, docFields]) => {
          const document = documents[docId]
          return (
            <div key={docId} className="mb-6 last:mb-0">
              {document && (
                <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-3">
                  {document.file_name}
                </h4>
              )}
              <div className="space-y-2">
                {docFields.map((field) => (
                  <div
                    key={field.id}
                    className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[var(--text-muted)] mb-1">
                          {field.field_label}
                        </p>
                        <FieldEditor
                          fieldId={field.id}
                          caseId={field.case_id}
                          initialValue={field.extracted_value || ""}
                          fieldLabel={field.field_label}
                          onSave={(newValue) => {
                            // Update local state to reflect the change
                            setFields((prev) =>
                              prev.map((f) =>
                                f.id === field.id
                                  ? { ...f, extracted_value: newValue, manually_corrected: true }
                                  : f
                              )
                            )
                          }}
                        />
                      </div>
                      <ConfidenceIndicator value={field.confidence} showLabel={false} />
                    </div>
                    {field.evidence_text && (
                      <div className="mt-2 pt-2 border-t border-[var(--border)]">
                        <Tooltip>
                          <TooltipTrigger render={<span className="text-xs text-[var(--text-muted)] truncate cursor-help block">
                            <span className="font-medium">Evidencia:</span> {field.evidence_text}
                          </span>} />
                          <TooltipContent side="bottom" className="max-w-sm">
                            <p className="text-xs">{field.evidence_text}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                    {field.page_number && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Página {field.page_number}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </TooltipProvider>
    </div>
  )
}
