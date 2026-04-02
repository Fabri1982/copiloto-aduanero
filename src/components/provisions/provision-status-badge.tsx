"use client"

import { Badge } from "@/components/ui/badge"
import { ProvisionStatus } from "@/types/database"

interface ProvisionStatusBadgeProps {
  status: ProvisionStatus
}

const statusConfig: Record<
  ProvisionStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  draft: {
    label: "Borrador",
    variant: "secondary",
    className: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  },
  ready_to_send: {
    label: "Listo para enviar",
    variant: "default",
    className: "bg-[var(--primary)] text-[var(--text-inverse)]",
  },
  sent: {
    label: "Enviado",
    variant: "default",
    className: "bg-[var(--warning)] text-[var(--text-inverse)]",
  },
  viewed: {
    label: "Visto",
    variant: "default",
    className: "bg-[var(--warning)] text-[var(--text-inverse)]",
  },
  payment_pending: {
    label: "Pago pendiente",
    variant: "default",
    className: "bg-[var(--warning)] text-[var(--text-inverse)]",
  },
  payment_uploaded: {
    label: "Pago cargado",
    variant: "default",
    className: "bg-[var(--primary)] text-[var(--text-inverse)]",
  },
  payment_validated: {
    label: "Pagado",
    variant: "default",
    className: "bg-[var(--success)] text-[var(--text-inverse)]",
  },
}

export function ProvisionStatusBadge({ status }: ProvisionStatusBadgeProps) {
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
