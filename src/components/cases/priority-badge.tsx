"use client"

import { Badge } from "@/components/ui/badge"

interface PriorityBadgeProps {
  priority: "low" | "medium" | "high"
}

const priorityConfig = {
  low: {
    label: "Baja",
    className: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  },
  medium: {
    label: "Media",
    className: "bg-[var(--warning-soft)] text-[var(--warning)]",
  },
  high: {
    label: "Alta",
    className: "bg-[var(--error-soft)] text-[var(--error)]",
  },
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = priorityConfig[priority]

  return (
    <Badge
      variant="secondary"
      className={`text-xs font-medium ${config.className}`}
    >
      {config.label}
    </Badge>
  )
}
