"use client"

import { createClient } from "@/lib/supabase/client"
import { CaseDocument, DocumentType } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Package,
  Ship,
  Plane,
  Receipt,
  File,
  Download,
  Loader2,
} from "lucide-react"
import { useState } from "react"

interface DocumentListProps {
  documents: CaseDocument[]
}

const documentTypeLabels: Record<DocumentType, string> = {
  commercial_invoice: "Factura comercial",
  packing_list: "Packing list",
  bl: "Bill of Lading",
  awb: "Air Waybill",
  payment_receipt: "Comprobante de pago",
  unknown: "Otro",
}

const documentTypeIcons: Record<DocumentType, React.ReactNode> = {
  commercial_invoice: <FileText className="h-5 w-5" />,
  packing_list: <Package className="h-5 w-5" />,
  bl: <Ship className="h-5 w-5" />,
  awb: <Plane className="h-5 w-5" />,
  payment_receipt: <Receipt className="h-5 w-5" />,
  unknown: <File className="h-5 w-5" />,
}

const documentTypeColors: Record<DocumentType, string> = {
  commercial_invoice: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  packing_list: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  bl: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  awb: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  payment_receipt: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  unknown: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function DocumentItem({ document }: { document: CaseDocument }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from("case-documents")
        .createSignedUrl(document.file_path, 60)

      if (error) throw error

      // Open in new tab
      window.open(data.signedUrl, "_blank")
    } catch (err) {
      console.error("Error downloading file:", err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] transition-colors">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${documentTypeColors[document.document_type]}`}
      >
        {documentTypeIcons[document.document_type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-[var(--text)] truncate">
            {document.file_name}
          </p>
          <Badge
            variant="secondary"
            className="text-xs bg-[var(--surface-2)] text-[var(--text-muted)]"
          >
            {documentTypeLabels[document.document_type]}
          </Badge>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Subido el {formatDate(document.created_at)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDownload}
        disabled={downloading}
        className="shrink-0"
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4">
          <File className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-base font-medium text-[var(--text)] mb-1">
          No hay documentos
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          Sube documentos usando la zona de arrastre de arriba.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => (
        <DocumentItem key={document.id} document={document} />
      ))}
    </div>
  )
}
