import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/auth"
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
import { ProvisionStatusBadge } from "@/components/provisions/provision-status-badge"
import { Search, Filter, FileText, DollarSign, Eye, ArrowRight } from "lucide-react"
import { ProvisionStatus } from "@/types/database"

interface ProvisionWithCase {
  id: string
  case_id: string
  status: ProvisionStatus
  subtotal: number
  total: number
  currency: string
  notes: string | null
  sent_at: string | null
  created_at: string
  operation_cases: {
    client_name: string
    reference_code: string | null
  } | null
}

interface ProvisionsPageProps {
  searchParams: Promise<{ status?: string; search?: string }>
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(amount)
}

export default async function ProvisionsPage({ searchParams }: ProvisionsPageProps) {
  const { profile } = await getUserProfile()
  const supabase = await createClient()
  const params = await searchParams
  const statusFilter = params.status || "all"
  const searchQuery = params.search || ""

  // Build query — provisions accessed via RLS through operation_cases FK
  let query = supabase
    .from("provisions")
    .select(`
      id,
      case_id,
      status,
      subtotal,
      total,
      currency,
      notes,
      created_at,
      operation_cases (client_name, reference_code)
    `)
    .order("created_at", { ascending: false })

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter)
  }

  const { data: provisions, error } = await query

  if (error) {
    console.error("Error fetching provisions:", error)
  }

  // Filter by search query client-side (since we need to search in joined data)
  let filteredProvisions = (provisions || []) as unknown as ProvisionWithCase[]
  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase()
    filteredProvisions = filteredProvisions.filter(
      (p) =>
        p.operation_cases?.client_name?.toLowerCase().includes(lowerQuery) ||
        p.operation_cases?.reference_code?.toLowerCase().includes(lowerQuery)
    )
  }

  // Calculate stats
  const draftCount = filteredProvisions.filter((p) => p.status === "draft").length
  const sentCount = filteredProvisions.filter((p) => ["sent", "viewed", "payment_pending"].includes(p.status)).length
  const paidCount = filteredProvisions.filter((p) => ["payment_uploaded", "payment_validated"].includes(p.status)).length
  const totalAmount = filteredProvisions.reduce((sum, p) => sum + (p.total || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Provisiones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestión de provisiones y garantías aduaneras
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
                <p className="text-2xl font-semibold text-foreground">{filteredProvisions.length}</p>
                <p className="text-xs text-muted-foreground">Total provisiones</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(totalAmount, "EUR")}
                </p>
                <p className="text-xs text-muted-foreground">Monto total</p>
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
                <p className="text-2xl font-semibold text-foreground">{sentCount}</p>
                <p className="text-xs text-muted-foreground">Pendientes de pago</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{paidCount}</p>
                <p className="text-xs text-muted-foreground">Pagadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <form className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Buscar por cliente o referencia..."
                defaultValue={searchQuery}
                className="pl-9 bg-background border-border"
              />
            </div>
            <div className="flex gap-4">
              <Select name="status" defaultValue={statusFilter}>
                <SelectTrigger className="w-[180px] bg-background border-border">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="ready_to_send">Listo para enviar</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="viewed">Visto</SelectItem>
                  <SelectItem value="payment_pending">Pago pendiente</SelectItem>
                  <SelectItem value="payment_uploaded">Pago cargado</SelectItem>
                  <SelectItem value="payment_validated">Pagado</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" variant="outline">
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Provisions Table */}
      <div className="rounded-xl border border-border bg-card">
        {filteredProvisions.length > 0 ? (
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
                  Monto
                </TableHead>
                <TableHead className="text-muted-foreground font-medium">
                  Estado
                </TableHead>
                <TableHead className="text-muted-foreground font-medium">
                  Fecha
                </TableHead>
                <TableHead className="text-muted-foreground font-medium w-[60px]">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProvisions.map((provision) => (
                <TableRow
                  key={provision.id}
                  className="border-border hover:bg-sidebar-accent"
                >
                  <TableCell>
                    <Link
                      href={`/provisions/${provision.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {provision.operation_cases?.reference_code || "Sin referencia"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-foreground">
                    {provision.operation_cases?.client_name}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">
                      {formatCurrency(provision.total, provision.currency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ProvisionStatusBadge status={provision.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(provision.created_at)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/provisions/${provision.id}`}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver detalle</span>
                      </Button>
                    </Link>
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
              No hay provisiones
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery || statusFilter !== "all"
                ? "No se encontraron provisiones que coincidan con los filtros."
                : "Las provisiones se generarán automáticamente desde los expedientes."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
