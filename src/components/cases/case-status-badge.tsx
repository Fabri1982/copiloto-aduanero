"use client"

import { Badge } from "@/components/ui/badge"
import { CaseStatus } from "@/types/database"

interface CaseStatusBadgeProps {
  status: CaseStatus
}

const statusConfig: Record<
  CaseStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  // Green (success)
  closed: {
    label: "Cerrado",
    variant: "default",
    className: "bg-emerald-600 text-primary-foreground",
  },
  ready_for_provision: {
    label: "Listo para provisión",
    variant: "default",
    className: "bg-emerald-600 text-primary-foreground",
  },
  // Yellow (warning)
  processing: {
    label: "En procesamiento",
    variant: "default",
    className: "bg-amber-600 text-primary-foreground",
  },
  needs_review: {
    label: "Necesita revisión",
    variant: "default",
    className: "bg-amber-600 text-primary-foreground",
  },
  payment_under_validation: {
    label: "Pago en validación",
    variant: "default",
    className: "bg-amber-600 text-primary-foreground",
  },
  // Red (error/attention)
  draft: {
    label: "Borrador",
    variant: "destructive",
    className: "bg-destructive text-primary-foreground",
  },
  // Neutral
  documents_uploaded: {
    label: "Documentos cargados",
    variant: "secondary",
    className: "bg-sidebar-accent text-muted-foreground",
  },
  provision_sent: {
    label: "Provisión enviada",
    variant: "secondary",
    className: "bg-sidebar-accent text-muted-foreground",
  },
  payment_uploaded: {
    label: "Pago cargado",
    variant: "secondary",
    className: "bg-sidebar-accent text-muted-foreground",
  },
}

export function CaseStatusBadge({ status }: CaseStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    variant: "secondary",
    className: "bg-sidebar-accent text-muted-foreground",
  }

  return (
    <Badge
      variant={config.variant}
      className={`text-xs font-medium ${config.className}`}
    >
      {config.label}
    </Badge>
  )
}
