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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CaseStatusBadge } from "@/components/cases/case-status-badge"
import { PriorityBadge } from "@/components/cases/priority-badge"
import { CreateCaseDialog } from "@/components/cases/create-case-dialog"
import { OperationCase } from "@/types/database"
import { MoreHorizontal, Search, FileText, Eye, Edit } from "lucide-react"

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

interface CasesPageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const { profile } = await getUserProfile()
  const supabase = await createClient()
  const params = await searchParams
  const searchQuery = params.search || ""

  let query = supabase
    .from("operation_cases")
    .select("*")
    .eq("agency_id", profile.agency_id)
    .order("created_at", { ascending: false })

  if (searchQuery) {
    query = query.or(
      `client_name.ilike.%${searchQuery}%,reference_code.ilike.%${searchQuery}%`
    )
  }

  const { data: cases, error } = await query

  if (error) {
    console.error("Error fetching cases:", error)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">
            Expedientes
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Gestión de expedientes aduaneros
          </p>
        </div>
        <CreateCaseDialog />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <form action="/cases" method="GET">
          <Input
            name="search"
            placeholder="Buscar por cliente o referencia..."
            defaultValue={searchQuery}
            className="pl-10 bg-[var(--surface)] border-[var(--border)]"
          />
        </form>
      </div>

      {/* Cases Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {cases && cases.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--border)] hover:bg-transparent">
                <TableHead className="text-[var(--text-muted)] font-medium">
                  Referencia
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-medium">
                  Cliente
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-medium">
                  Estado
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-medium">
                  Prioridad
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-medium">
                  Fecha
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-medium w-[60px]">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((caseItem: OperationCase) => (
                <TableRow
                  key={caseItem.id}
                  className="border-[var(--border)] hover:bg-[var(--surface-2)]"
                >
                  <TableCell>
                    <Link
                      href={`/cases/${caseItem.id}`}
                      className="font-medium text-[var(--text)] hover:text-[var(--primary)] transition-colors"
                    >
                      {caseItem.reference_code || "Sin referencia"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[var(--text)]">
                    {caseItem.client_name}
                  </TableCell>
                  <TableCell>
                    <CaseStatusBadge status={caseItem.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={caseItem.priority} />
                  </TableCell>
                  <TableCell className="text-[var(--text-muted)]">
                    {formatDate(caseItem.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={
                            <Link
                              href={`/cases/${caseItem.id}`}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </Link>
                          }
                        />
                        <DropdownMenuItem
                          render={
                            <Link
                              href={`/cases/${caseItem.id}?edit=true`}
                              className="flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Editar
                            </Link>
                          }
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-base font-medium text-[var(--text)] mb-1">
              No hay expedientes
            </h3>
            <p className="text-sm text-[var(--text-muted)] text-center max-w-sm">
              {searchQuery
                ? "No se encontraron expedientes que coincidan con tu búsqueda."
                : "Comienza creando tu primer expediente haciendo clic en el botón 'Nuevo expediente'."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
