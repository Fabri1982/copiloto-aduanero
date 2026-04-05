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
    className: "bg-sidebar-accent text-muted-foreground",
  },
  ready_to_send: {
    label: "Listo para enviar",
    variant: "default",
    className: "bg-primary text-primary-foreground",
  },
  sent: {
    label: "Enviado",
    variant: "default",
    className: "bg-amber-600 text-primary-foreground",
  },
  viewed: {
    label: "Visto",
    variant: "default",
    className: "bg-amber-600 text-primary-foreground",
  },
  payment_pending: {
    label: "Pago pendiente",
    variant: "default",
    className: "bg-amber-600 text-primary-foreground",
  },
  payment_uploaded: {
    label: "Pago cargado",
    variant: "default",
    className: "bg-primary text-primary-foreground",
  },
  payment_validated: {
    label: "Pagado",
    variant: "default",
    className: "bg-emerald-600 text-primary-foreground",
  },
}

export function ProvisionStatusBadge({ status }: ProvisionStatusBadgeProps) {
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
