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
    className: "bg-amber-600 text-primary-foreground",
  },
  validated: {
    label: "Validado",
    variant: "default",
    className: "bg-emerald-600 text-primary-foreground",
  },
  rejected: {
    label: "Rechazado",
    variant: "destructive",
    className: "bg-destructive text-primary-foreground",
  },
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
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
