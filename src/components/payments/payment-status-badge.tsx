"use client"

import { Badge } from "@/components/ui/badge"
import { PaymentStatus } from "@/types/database"

interface PaymentStatusBadgeProps {
  status: PaymentStatus
}

const statusConfig: Record<
  PaymentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  pending: {
    label: "Pendiente",
    variant: "default",
    className: "bg-[var(--warning)] text-[var(--text-inverse)]",
  },
  validated: {
    label: "Validado",
    variant: "default",
    className: "bg-[var(--success)] text-[var(--text-inverse)]",
  },
  rejected: {
    label: "Rechazado",
    variant: "destructive",
    className: "bg-[var(--error)] text-[var(--text-inverse)]",
  },
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
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
