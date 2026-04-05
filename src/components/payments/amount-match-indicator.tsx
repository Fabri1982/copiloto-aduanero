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
        <CheckCircle className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-600">
          {formatCurrency(detectedAmount)}
        </span>
        <span className="text-xs text-muted-foreground">
          Coincide
        </span>
      </div>
    )
  }

  if (isClose) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-600">
          {formatCurrency(detectedAmount)}
        </span>
        <span className="text-xs text-muted-foreground">
          Diferencia: {formatCurrency(diff)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <XCircle className="h-4 w-4 text-destructive" />
      <span className="text-sm font-medium text-destructive">
        {formatCurrency(detectedAmount)}
      </span>
      <span className="text-xs text-muted-foreground">
        Esperado: {formatCurrency(provisionAmount)}
      </span>
    </div>
  )
}
