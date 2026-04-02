"use client"

import { CheckCircle, AlertCircle, XCircle } from "lucide-react"

interface AmountMatchIndicatorProps {
  detectedAmount: number
  provisionAmount: number
  currency?: string
  tolerance?: number
}

export function AmountMatchIndicator({
  detectedAmount,
  provisionAmount,
  currency = "EUR",
  tolerance = 0.01,
}: AmountMatchIndicatorProps) {
  const diff = Math.abs(detectedAmount - provisionAmount)
  const diffPercent = provisionAmount > 0 ? (diff / provisionAmount) * 100 : 0
  const isMatch = diff <= tolerance || diffPercent <= 1
  const isClose = !isMatch && diffPercent <= 5

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(amount)
  }

  if (isMatch) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-[var(--success)]" />
        <span className="text-sm font-medium text-[var(--success)]">
          {formatCurrency(detectedAmount)}
        </span>
        <span className="text-xs text-[var(--text-faint)]">
          Coincide
        </span>
      </div>
    )
  }

  if (isClose) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
        <span className="text-sm font-medium text-[var(--warning)]">
          {formatCurrency(detectedAmount)}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          Diferencia: {formatCurrency(diff)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <XCircle className="h-4 w-4 text-[var(--error)]" />
      <span className="text-sm font-medium text-[var(--error)]">
        {formatCurrency(detectedAmount)}
      </span>
      <span className="text-xs text-[var(--text-muted)]">
        Esperado: {formatCurrency(provisionAmount)}
      </span>
    </div>
  )
}
