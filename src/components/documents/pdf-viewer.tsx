"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import * as pdfjs from "pdfjs-dist"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, AlertCircle } from "lucide-react"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  url: string
}

export function PDFViewer({ url }: PDFViewerProps) {
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<pdfjs.RenderTask | null>(null)

  // Load PDF
  useEffect(() => {
    let isCancelled = false

    const loadPdf = async () => {
      setLoading(true)
      setError(null)

      try {
        const loadingTask = pdfjs.getDocument(url)
        const pdfDoc = await loadingTask.promise

        if (isCancelled) return

        setPdf(pdfDoc)
        setNumPages(pdfDoc.numPages)
        setCurrentPage(1)
      } catch (err) {
        console.error("Error loading PDF:", err)
        setError("No se pudo cargar el PDF. Verifica que el archivo sea válido.")
      } finally {
        setLoading(false)
      }
    }

    loadPdf()

    return () => {
      isCancelled = true
    }
  }, [url])

  // Render page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return

    let isCancelled = false

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage)

        if (isCancelled) return

        const canvas = canvasRef.current!
        const context = canvas.getContext("2d")

        if (!context) return

        // Cancel any ongoing render task
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel()
        }

        const viewport = page.getViewport({ scale })
        canvas.width = viewport.width
        canvas.height = viewport.height

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        // @ts-expect-error - pdfjs-dist types are inconsistent with actual API
        renderTaskRef.current = page.render(renderContext)
        await renderTaskRef.current.promise

        renderTaskRef.current = null
      } catch (err) {
        if ((err as Error).message?.includes("cancelled")) {
          // Ignore cancelled renders
          return
        }
        console.error("Error rendering page:", err)
      }
    }

    renderPage()

    return () => {
      isCancelled = true
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
    }
  }, [pdf, currentPage, scale])

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }, [])

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(numPages, prev + 1))
  }, [numPages])

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(3, prev + 0.2))
  }, [])

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(0.5, prev - 0.2))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-card rounded-lg border border-border">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Cargando PDF...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-card rounded-lg border border-border">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-sm text-foreground">{error}</p>
      </div>
    )
  }

  if (!pdf) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-card rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">No se pudo cargar el documento</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-foreground min-w-[100px] text-center">
            Página {currentPage} de {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="h-8 w-8"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={zoomIn}
            disabled={scale >= 3}
            className="h-8 w-8"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-background">
        <canvas
          ref={canvasRef}
          className="shadow-lg"
          style={{ maxWidth: "100%", height: "auto" }}
        />
      </div>
    </div>
  )
}
