"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProvisionStatusBadge } from "./provision-status-badge"
import { ProvisionStatus } from "@/types/database"
import { FileText, User, Calendar, DollarSign } from "lucide-react"

interface ProvisionSummaryProps {
  provision: {
    id: string
    status: ProvisionStatus
    total: number
    currency: string
    subtotal?: number | null
    notes?: string | null
    sent_at?: string | null
    created_at: string
    operation_cases?: {
      client_name: string
      reference_code: string
    } | null
  }
}

export function ProvisionSummary({ provision }: ProvisionSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: provision.currency || "EUR",
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const caseData = provision.operation_cases

  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Resumen de la provisión
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {provision.id.slice(0, 8)}...
            </p>
          </div>
          <ProvisionStatusBadge status={provision.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Case Info */}
        {caseData && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Expediente:</span>
              <span className="font-medium text-foreground">
                {caseData.reference_code || "Sin referencia"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium text-foreground">
                {caseData.client_name}
              </span>
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Creada:</span>
            <span className="text-foreground">
              {formatDate(provision.created_at)}
            </span>
          </div>
          {provision.sent_at && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Enviada:</span>
              <span className="text-foreground">
                {formatDate(provision.sent_at)}
              </span>
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-muted-foreground">Total</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(provision.total)}
            </span>
          </div>
          {provision.subtotal && provision.subtotal !== provision.total && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-sm text-foreground">
                {formatCurrency(provision.subtotal)}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        {provision.notes && (
          <div className="pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">Notas:</span>
            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
              {provision.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
