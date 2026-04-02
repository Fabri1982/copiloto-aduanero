"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download } from "lucide-react"

interface ProvisionItem {
  id: string
  description: string
  amount: number
}

interface ClientProvisionViewProps {
  items: ProvisionItem[]
  total: number
  currency?: string
  pdfUrl?: string
}

export function ClientProvisionView({ 
  items, 
  total, 
  currency = "CLP",
  pdfUrl 
}: ClientProvisionViewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card className="bg-[var(--surface)] border-[var(--border)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-[var(--text)]">
            Provisión de gastos
          </CardTitle>
          {pdfUrl && (
            <a 
              href={pdfUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-[var(--border)] bg-transparent hover:bg-[var(--surface-2)] text-[var(--text)]"
            >
              <FileText className="w-3.5 h-3.5" />
              Ver PDF
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabla de items */}
        <div className="space-y-2">
          {items.map((item) => (
            <div 
              key={item.id}
              className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
            >
              <span className="text-sm text-[var(--text)]">{item.description}</span>
              <span className="text-sm font-medium text-[var(--text)]">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Total */}
        <div className="pt-3 border-t border-[var(--border)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text)]">Total a pagar</span>
            <span className="text-lg font-semibold text-[var(--primary)]">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Botón descargar */}
        {pdfUrl && (
          <a 
            href={pdfUrl} 
            download
            className="inline-flex items-center justify-center gap-2 w-full h-9 px-4 text-sm font-medium rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar provisión
          </a>
        )}
      </CardContent>
    </Card>
  )
}
