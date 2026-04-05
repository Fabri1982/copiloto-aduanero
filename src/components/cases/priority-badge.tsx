"use client"

import { Badge } from "@/components/ui/badge"

interface PriorityBadgeProps {
  priority: "low" | "medium" | "high"
}

const priorityConfig = {
  low: {
    label: "Baja",
    className: "bg-sidebar-accent text-muted-foreground",
  },
  medium: {
    label: "Media",
    className: "bg-amber-600/10 text-amber-600",
  },
  high: {
    label: "Alta",
    className: "bg-destructive/10 text-destructive",
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
