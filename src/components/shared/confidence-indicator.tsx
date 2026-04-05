"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ConfidenceIndicatorProps {
  value: number // 0 to 1
  showLabel?: boolean
}

export function ConfidenceIndicator({ value, showLabel = true }: ConfidenceIndicatorProps) {
  // Determine color based on confidence value
  const getColor = () => {
    if (value >= 0.9) return "text-emerald-600"
    if (value >= 0.75) return "text-amber-600"
    return "text-destructive"
  }

  const getLabel = () => {
    if (value >= 0.9) return "Alta"
    if (value >= 0.75) return "Media"
    return "Baja"
  }

  const percentage = Math.round(value * 100)
  const color = getColor()
  const label = getLabel()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={
          <div className="inline-flex items-center gap-2 cursor-help">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {showLabel && (
              <span className="text-sm text-muted-foreground">
                {percentage}%
              </span>
            )}
          </div>
        } />
        <TooltipContent side="top">
          <p className="text-xs">
            Confianza: {percentage}% ({label})
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
