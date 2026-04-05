"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge"
import { AmountMatchIndicator } from "@/components/payments/amount-match-indicator"
import { PaymentReviewDialog } from "@/components/payments/payment-review-dialog"
import {
  Search,
  Filter,
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
} from "lucide-react"
import { PaymentStatus } from "@/types/database"

interface PaymentReceipt {
  id: string
  case_id: string
  provision_id: string
  file_path: string
  file_name: string
  amount: number
  currency: string
  payment_date: string
  status: PaymentStatus
  notes: string | null
  rejection_reason: string | null
  created_at: string
  operation_cases: {
    client_name: string
    reference_code: string | null
  } | null
  provisions: {
    total: number
    currency: string
  } | null
}

export default function PaymentsPage() {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean
    receiptId: string
    receiptName: string
  }>({ open: false, receiptId: "", receiptName: "" })

  useEffect(() => {
    fetchReceipts()
  }, [statusFilter])

  const fetchReceipts = async () => {
    try {
      setLoading(true)
      // Use relative URL for the fetch
      const fetchUrl = statusFilter !== "all" ? `/api/payments?status=${statusFilter}` : "/api/payments"
      const response = await fetch(fetchUrl)
      
      if (!response.ok) {
        throw new Error("Error al cargar los comprobantes")
      }

      const data = await response.json()
      setReceipts(data.receipts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  // Filter by search query client-side
  const filteredReceipts = receipts.filter((receipt) => {
    if (!searchQuery) return true
    const lowerQuery = searchQuery.toLowerCase()
    return (
      receipt.operation_cases?.client_name?.toLowerCase().includes(lowerQuery) ||
      receipt.operation_cases?.reference_code?.toLowerCase().includes(lowerQuery) ||
      receipt.file_name?.toLowerCase().includes(lowerQuery)
    )
  })

  // Calculate stats
  const pendingCount = receipts.filter((r) => r.status === "pending").length
  const validatedCount = receipts.filter((r) => r.status === "validated").length
  const rejectedCount = receipts.filter((r) => r.status === "rejected").length
  const totalAmount = receipts
    .filter((r) => r.status === "validated")
    .reduce((sum, r) => sum + (r.amount || 0), 0)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const openReviewDialog = (receipt: PaymentReceipt) => {
    setReviewDialog({
      open: true,
      receiptId: receipt.id,
      receiptName: `${receipt.operation_cases?.reference_code || "Sin referencia"} - ${receipt.file_name}`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Pagos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Validación de comprobantes de pago
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{receipts.length}</p>
                <p className="text-xs text-muted-foreground">Total comprobantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{validatedCount}</p>
                <p className="text-xs text-muted-foreground">Validados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency: "EUR",
                  }).format(totalAmount)}
                </p>
                <p className="text-xs text-muted-foreground">Monto validado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente o referencia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background border-border"
              />
            </div>
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "all")}>
                <SelectTrigger className="w-[180px] bg-background border-border">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="validated">Validados</SelectItem>
                  <SelectItem value="rejected">Rechazados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredReceipts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">
                  Referencia
                </TableHead>
                <TableHead className="text-muted-foreground font-medium">
                  Cliente
                </TableHead>
                <TableHead className="text-muted-foreground font-medium">
                  Monto detectado
                </TableHead>
                <TableHead className="text-muted-foreground font-medium">
                  Estado
                </TableHead>
                <TableHead className="text-muted-foreground font-medium">
                  Fecha
                </TableHead>
                <TableHead className="text-muted-foreground font-medium w-[120px]">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt) => (
                <TableRow
                  key={receipt.id}
                  className="border-border hover:bg-sidebar-accent"
                >
                  <TableCell>
                    <Link
                      href={`/cases/${receipt.case_id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {receipt.operation_cases?.reference_code || "Sin referencia"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-foreground">
                    {receipt.operation_cases?.client_name}
                  </TableCell>
                  <TableCell>
                    {receipt.provisions ? (
                      <AmountMatchIndicator
                        detectedAmount={receipt.amount}
                        provisionAmount={receipt.provisions.total}
                        currency={receipt.currency}
                      />
                    ) : (
                      <span className="text-foreground">
                        {new Intl.NumberFormat("es-ES", {
                          style: "currency",
                          currency: receipt.currency,
                        }).format(receipt.amount)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={receipt.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(receipt.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/cases/${receipt.case_id}`}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver expediente</span>
                        </Button>
                      </Link>
                      {receipt.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-8 w-8 text-emerald-600"
                            onClick={() => openReviewDialog(receipt)}
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span className="sr-only">Aprobar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-8 w-8 text-destructive"
                            onClick={() => openReviewDialog(receipt)}
                          >
                            <XCircle className="h-4 w-4" />
                            <span className="sr-only">Rechazar</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-sidebar-accent flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-1">
              No hay comprobantes de pago
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery || statusFilter !== "all"
                ? "No se encontraron comprobantes que coincidan con los filtros."
                : "Los comprobantes aparecerán cuando los clientes suban sus pagos."}
            </p>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <PaymentReviewDialog
        receiptId={reviewDialog.receiptId}
        receiptName={reviewDialog.receiptName}
        open={reviewDialog.open}
        onOpenChange={(open) => setReviewDialog({ ...reviewDialog, open })}
        onSuccess={fetchReceipts}
      />
    </div>
  )
}
