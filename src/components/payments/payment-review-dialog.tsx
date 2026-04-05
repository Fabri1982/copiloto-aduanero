"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

interface PaymentReviewDialogProps {
  receiptId: string
  receiptName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function PaymentReviewDialog({
  receiptId,
  receiptName,
  open,
  onOpenChange,
  onSuccess,
}: PaymentReviewDialogProps) {
  const [action, setAction] = useState<"validate" | "reject" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (selectedAction: "validate" | "reject") => {
    setAction(selectedAction)
    
    if (selectedAction === "reject" && !rejectionReason.trim()) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/payments/${receiptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedAction === "validate" ? "validated" : "rejected",
          rejection_reason: selectedAction === "reject" ? rejectionReason : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al procesar el pago")
      }

      onOpenChange(false)
      setRejectionReason("")
      setAction(null)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Revisar comprobante de pago
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {receiptName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {action === "reject" ? (
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-foreground">
                Motivo del rechazo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Indica el motivo del rechazo..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-background border-border min-h-[100px]"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecciona la acción a realizar con este comprobante de pago.
            </p>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {action === "reject" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAction(null)}
                disabled={loading}
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleAction("reject")}
                disabled={loading || !rejectionReason.trim()}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Rechazar
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setAction("reject")}
                disabled={loading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rechazar
              </Button>
              <Button
                type="button"
                onClick={() => handleAction("validate")}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-600/90"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Aprobar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
