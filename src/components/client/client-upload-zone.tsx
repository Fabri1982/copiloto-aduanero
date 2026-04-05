"use client"

import { useState, useCallback } from "react"
import { Upload, File, X, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ClientUploadZoneProps {
  onUpload: (file: File) => Promise<void>
  accept?: string
  maxSizeMB?: number
  label: string
  description?: string
}

export function ClientUploadZone({
  onUpload,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSizeMB = 10,
  label,
  description,
}: ClientUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const validateFile = (file: File): string | null => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `El archivo es muy grande. Máximo ${maxSizeMB}MB.`
    }
    return null
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setError(null)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const validationError = validateFile(droppedFile)
      if (validationError) {
        setError(validationError)
        return
      }
      setFile(droppedFile)
      setUploaded(false)
    }
  }, [maxSizeMB])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const validationError = validateFile(selectedFile)
      if (validationError) {
        setError(validationError)
        return
      }
      setFile(selectedFile)
      setUploaded(false)
    }
  }, [maxSizeMB])

  const handleUpload = async () => {
    if (!file) return
    
    setUploading(true)
    setError(null)
    
    try {
      await onUpload(file)
      setUploaded(true)
    } catch {
      setError("Error al subir el archivo. Intenta de nuevo.")
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setUploaded(false)
    setError(null)
  }

  if (uploaded) {
    return (
      <div className="p-6 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-center">
        <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-600" />
        <p className="text-sm font-medium text-foreground">
          ¡Archivo subido exitosamente!
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {file?.name}
        </p>
        <Button 
          variant="ghost" 
          size="sm" 
          className="mt-3 text-xs"
          onClick={clearFile}
        >
          Subir otro archivo
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative p-6 rounded-xl border-2 border-dashed text-center cursor-pointer
            transition-all duration-200
            ${isDragging 
              ? "border-primary bg-primary/10" 
              : "border-border bg-sidebar-accent hover:border-primary/50"
            }
          `}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className={`
            w-8 h-8 mx-auto mb-3 transition-colors
            ${isDragging ? "text-primary" : "text-muted-foreground"}
          `} />
          <p className="text-sm font-medium text-foreground mb-1">
            {label}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Arrastra un archivo o haz clic para seleccionar
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-sidebar-accent border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <File className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={clearFile}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-3)] text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <Button 
            className="w-full mt-3 bg-primary text-primary-foreground"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? "Subiendo..." : "Confirmar subida"}
          </Button>
        </div>
      )}
      
      {error && (
        <p className="text-xs text-destructive text-center">
          {error}
        </p>
      )}
    </div>
  )
}
