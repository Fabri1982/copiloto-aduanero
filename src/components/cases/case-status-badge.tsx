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
    className: "bg-[var(--success)] text-[var(--text-inverse)]",
  },
  ready_for_provision: {
    label: "Listo para provisión",
    variant: "default",
    className: "bg-[var(--success)] text-[var(--text-inverse)]",
  },
  // Yellow (warning)
  processing: {
    label: "En procesamiento",
    variant: "default",
    className: "bg-[var(--warning)] text-[var(--text-inverse)]",
  },
  needs_review: {
    label: "Necesita revisión",
    variant: "default",
    className: "bg-[var(--warning)] text-[var(--text-inverse)]",
  },
  payment_under_validation: {
    label: "Pago en validación",
    variant: "default",
    className: "bg-[var(--warning)] text-[var(--text-inverse)]",
  },
  // Red (error/attention)
  draft: {
    label: "Borrador",
    variant: "destructive",
    className: "bg-[var(--error)] text-[var(--text-inverse)]",
  },
  // Neutral
  documents_uploaded: {
    label: "Documentos cargados",
    variant: "secondary",
    className: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  },
  provision_sent: {
    label: "Provisión enviada",
    variant: "secondary",
    className: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  },
  payment_uploaded: {
    label: "Pago cargado",
    variant: "secondary",
    className: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  },
}

export function CaseStatusBadge({ status }: CaseStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    variant: "secondary",
    className: "bg-[var(--surface-2)] text-[var(--text-muted)]",
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
