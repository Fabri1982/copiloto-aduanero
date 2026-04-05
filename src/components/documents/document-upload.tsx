"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DocumentType } from "@/types/database"
import { Upload, X, FileUp, Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface DocumentUploadProps {
  caseId: string
  agencyId: string
  userId: string
}

interface FileWithType {
  file: File
  documentType: DocumentType
  id: string
}

interface UploadStatus {
  fileId: string
  status: "pending" | "uploading" | "success" | "error"
  message?: string
}

const documentTypeLabels: Record<DocumentType, string> = {
  commercial_invoice: "Factura comercial",
  packing_list: "Packing list",
  bl: "Bill of Lading (BL)",
  awb: "Air Waybill (AWB)",
  payment_receipt: "Comprobante de pago",
  unknown: "Otro",
}

export function DocumentUpload({ caseId, agencyId, userId }: DocumentUploadProps) {
  const router = useRouter()
  const [files, setFiles] = useState<FileWithType[]>([])
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const acceptedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      acceptedTypes.includes(file.type)
    )

    const newFiles: FileWithType[] = droppedFiles.map((file) => ({
      file,
      documentType: "unknown",
      id: Math.random().toString(36).substring(7),
    }))

    setFiles((prev) => [...prev, ...newFiles])
    setUploadStatuses((prev) => [
      ...prev,
      ...newFiles.map((f) => ({ fileId: f.id, status: "pending" as const })),
    ])
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []).filter((file) =>
        acceptedTypes.includes(file.type)
      )

      const newFiles: FileWithType[] = selectedFiles.map((file) => ({
        file,
        documentType: "unknown",
        id: Math.random().toString(36).substring(7),
      }))

      setFiles((prev) => [...prev, ...newFiles])
      setUploadStatuses((prev) => [
        ...prev,
        ...newFiles.map((f) => ({ fileId: f.id, status: "pending" as const })),
      ])
    },
    []
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    setUploadStatuses((prev) => prev.filter((s) => s.fileId !== id))
  }, [])

  const updateDocumentType = useCallback((id: string, type: DocumentType) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, documentType: type } : f))
    )
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    const supabase = createClient()

    for (const fileWithType of files) {
      // Update status to uploading
      setUploadStatuses((prev) =>
        prev.map((s) =>
          s.fileId === fileWithType.id ? { ...s, status: "uploading" } : s
        )
      )

      try {
        // Generate unique filename
        const timestamp = Date.now()
        const fileExt = fileWithType.file.name.split(".").pop()
        const fileName = `${timestamp}_${fileWithType.file.name}`
        const filePath = `${agencyId}/${caseId}/${fileName}`

        // Upload to server endpoint (uses service role key, no auth issues)
        const uploadFormData = new FormData()
        uploadFormData.append('file', fileWithType.file)
        uploadFormData.append('filePath', filePath)

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadResult = await uploadResponse.json()

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResult.error || uploadResult.details || 'Unknown error'}`)
        }

        // Create document record
        const { error: docError } = await supabase.from("case_documents").insert({
          case_id: caseId,
          file_path: filePath,
          document_type: fileWithType.documentType,
          file_name: fileWithType.file.name,
          uploaded_by: userId,
          version: 1,
        })

        if (docError) {
          throw docError
        }

        // Create audit event
        await supabase.from("audit_events").insert({
          agency_id: agencyId,
          case_id: caseId,
          actor_type: "user",
          actor_id: userId,
          event_name: "document_uploaded",
          event_payload_json: {
            file_name: fileWithType.file.name,
            document_type: fileWithType.documentType,
          },
        })

        // Get the created document ID
        const { data: createdDoc } = await supabase
          .from("case_documents")
          .select("id")
          .eq("case_id", caseId)
          .eq("file_path", filePath)
          .single()

        // Trigger document processing via direct API (synchronous)
        if (createdDoc) {
          try {
            const response = await fetch("/api/documents/process-direct", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                documentId: createdDoc.id,
                caseId: caseId,
                filePath: filePath,
                fileName: fileWithType.file.name,
                mimeType: fileWithType.file.type,
                agencyId: agencyId,
              }),
            })
            
            const result = await response.json()
            
            if (!response.ok) {
              console.error("[DocumentUpload] Processing error:", result)
              // Still mark as success since the file was uploaded
              // User can retry processing later
            } else {
              console.log("[DocumentUpload] Processing completed:", result)
            }
          } catch (processErr) {
            console.error("[DocumentUpload] Error during document processing:", processErr)
          }
        }

        // Update status to success
        setUploadStatuses((prev) =>
          prev.map((s) =>
            s.fileId === fileWithType.id
              ? { ...s, status: "success" }
              : s
          )
        )
      } catch (err) {
        console.error("Error uploading file:", err)
        setUploadStatuses((prev) =>
          prev.map((s) =>
            s.fileId === fileWithType.id
              ? {
                  ...s,
                  status: "error",
                  message:
                    err instanceof Error ? err.message : "Error al subir",
                }
              : s
          )
        )
      }
    }

    setIsUploading(false)
    // Clear successful uploads after a delay
    setTimeout(() => {
      setFiles((prev) =>
        prev.filter(
          (f) =>
            uploadStatuses.find((s) => s.fileId === f.id)?.status !== "success"
        )
      )
      router.refresh()
    }, 2000)
  }

  const getStatusIcon = (status: UploadStatus["status"]) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-emerald-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:border-primary"
          }
        `}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-sidebar-accent flex items-center justify-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Arrastra archivos aquí o haz clic para seleccionar
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, PNG, JPG (máx. 10MB)
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileWithType) => {
            const status = uploadStatuses.find(
              (s) => s.fileId === fileWithType.id
            )
            return (
              <div
                key={fileWithType.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent border border-border"
              >
                <FileUp className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {fileWithType.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(fileWithType.file.size)}
                  </p>
                </div>
                <Select
                  value={fileWithType.documentType}
                  onValueChange={(value) =>
                    updateDocumentType(fileWithType.id, (value as DocumentType) || "unknown")
                  }
                  disabled={status?.status === "uploading"}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(documentTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  {status && getStatusIcon(status.status)}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeFile(fileWithType.id)}
                    disabled={status?.status === "uploading"}
                    className="h-6 w-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Subir {files.length} archivo{files.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
