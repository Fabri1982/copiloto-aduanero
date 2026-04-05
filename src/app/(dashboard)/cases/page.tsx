import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CasesTable } from "@/components/cases/cases-table"
import { CreateCaseDialog } from "@/components/cases/create-case-dialog"
import { OperationCase } from "@/types/database"
import { Search, FileText } from "lucide-react"

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
          <h1 className="text-2xl font-semibold text-foreground">
            Expedientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestión de expedientes aduaneros
          </p>
        </div>
        <CreateCaseDialog />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <form action="/cases" method="GET">
          <Input
            name="search"
            placeholder="Buscar por cliente o referencia..."
            defaultValue={searchQuery}
            className="pl-10 bg-card border-border"
          />
        </form>
      </div>

      {/* Cases Table with Selection */}
      <div className="rounded-xl border border-border bg-card">
        {cases && cases.length > 0 ? (
          <CasesTable cases={cases} searchQuery={searchQuery} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-sidebar-accent flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-1">
              No hay expedientes
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
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
