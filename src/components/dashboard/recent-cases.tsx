import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface Case {
  id: string
  client_name: string
  reference_code: string | null
  status: string
  created_at: string
  updated_at: string
}

interface RecentCasesProps {
  cases: Case[]
}

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  documents_uploaded: "Documentos subidos",
  processing: "Procesando",
  needs_review: "Requiere revisión",
  ready_for_provision: "Listo para provisión",
  provision_sent: "Provisión enviada",
  payment_uploaded: "Pago subido",
  payment_under_validation: "Pago en validación",
  closed: "Cerrado",
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  draft: "secondary",
  documents_uploaded: "secondary",
  processing: "default",
  needs_review: "destructive",
  ready_for_provision: "default",
  provision_sent: "secondary",
  payment_uploaded: "secondary",
  payment_under_validation: "default",
  closed: "secondary",
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function RecentCases({ cases }: RecentCasesProps) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">Expedientes Recientes</h2>
        <Link
          href="/cases"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver todos
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No hay expedientes aún
          </p>
          <Link
            href="/cases"
            className="mt-3 text-xs text-primary hover:underline"
          >
            Crear primer expediente
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Cliente
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                  Referencia
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Estado
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">
                  Creado
                </th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseItem) => (
                <tr
                  key={caseItem.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/cases/${caseItem.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {caseItem.client_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {caseItem.reference_code || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={statusVariant[caseItem.status] || "secondary"}
                      className="text-xs"
                    >
                      {statusLabels[caseItem.status] || caseItem.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {formatDate(caseItem.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
