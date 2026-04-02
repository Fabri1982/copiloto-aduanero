"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Clock, Package, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export type ClientCaseStatus = "en_proceso" | "provision_disponible" | "pago_pendiente" | "completado"

interface ClientCaseCardProps {
  id: string
  reference: string
  status: ClientCaseStatus
  date: string
  description?: string
}

const statusConfig: Record<ClientCaseStatus, { label: string; color: string; icon: React.ReactNode }> = {
  en_proceso: {
    label: "En proceso",
    color: "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/20",
    icon: <Clock className="w-4 h-4" />,
  },
  provision_disponible: {
    label: "Provisión disponible",
    color: "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]/20",
    icon: <Package className="w-4 h-4" />,
  },
  pago_pendiente: {
    label: "Pago pendiente",
    color: "bg-[var(--error-soft)] text-[var(--error)] border-[var(--error)]/20",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  completado: {
    label: "Completado",
    color: "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]/20",
    icon: <CheckCircle className="w-4 h-4" />,
  },
}

export function ClientCaseCard({ id, reference, status, date, description }: ClientCaseCardProps) {
  const config = statusConfig[status]

  return (
    <Link href={`/client-portal/cases/${id}`}>
      <Card className="group bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-md transition-all cursor-pointer">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-[var(--text)]">
                  {reference}
                </span>
              </div>
              
              {description && (
                <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-1">
                  {description}
                </p>
              )}
              
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={`${config.color} font-normal text-xs px-2 py-0.5`}
                >
                  <span className="flex items-center gap-1.5">
                    {config.icon}
                    {config.label}
                  </span>
                </Badge>
                <span className="text-xs text-[var(--text-faint)]">
                  {new Date(date).toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--surface-2)] group-hover:bg-[var(--primary-soft)] transition-colors">
              <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
