import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CaseStatusBadge } from "@/components/cases/case-status-badge"
import { CaseTimeline } from "@/components/cases/case-timeline"
import { ExportCaseDialog } from "@/components/cases/export-case-dialog"
import { GenerateProvisionButton } from "@/components/cases/generate-provision-button"
import { DocumentUpload } from "@/components/documents/document-upload"
import { DocumentList } from "@/components/documents/document-list"
import { ProcessingStatus } from "@/components/documents/processing-status"
import { DualView } from "@/components/documents/dual-view"
import { ItemsGrid } from "@/components/cases/items-grid"
import { AlertsPanel } from "@/components/exceptions/alerts-panel"
import { ConflictsPanel } from "@/components/exceptions/conflicts-panel"
import { CaseDetailTabs } from "@/components/cases/case-detail-tabs"
import { ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react"

interface CaseDetailPageProps {
  params: Promise<{ id: string }>
}

// Revalidate every 5 seconds to pick up document processing changes
export const revalidate = 5

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { profile } = await getUserProfile()
  const supabase = await createClient()
  const { id } = await params

  // Fetch case
  const { data: caseItem } = await supabase
    .from("operation_cases")
    .select("*")
    .eq("id", id)
    .eq("agency_id", profile.agency_id)
    .single()

  if (!caseItem) {
    notFound()
  }

  // Fetch documents
  const { data: documents } = await supabase
    .from("case_documents")
    .select("*")
    .eq("case_id", id)
    .order("created_at", { ascending: false })

  // Fetch audit events
  const { data: auditEvents } = await supabase
    .from("audit_events")
    .select("*")
    .eq("case_id", id)
    .order("created_at", { ascending: false })

  // Fetch unresolved alerts count for badge
  const { data: alertsData } = await supabase
    .from("validation_alerts")
    .select("id")
    .eq("case_id", id)
    .eq("resolved", false)

  const unresolvedAlertsCount = alertsData?.length || 0

  // Check if case has extracted fields for provision generation
  const { data: extractedFieldsData } = await supabase
    .from("extracted_fields")
    .select("id")
    .eq("case_id", id)
    .limit(1)

  const hasExtractedData = (extractedFieldsData?.length || 0) > 0

  const tabContents = {
    documents: (
      <div className="space-y-6">
        <Card className="bg-card border-border rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">
              Subir documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentUpload
              caseId={caseItem.id}
              agencyId={profile.agency_id}
              userId={profile.id}
            />
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">
              Estado de procesamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProcessingStatus caseId={caseItem.id} documents={documents || []} agencyId={profile.agency_id} />
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">
              Documentos cargados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentList documents={documents || []} />
          </CardContent>
        </Card>
      </div>
    ),
    data: <DualView caseId={caseItem.id} documents={documents || []} />,
    nomenclature: (
      <Card className="bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Nomenclatura arancelaria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ItemsGrid caseId={caseItem.id} />
        </CardContent>
      </Card>
    ),
    validations: (
      <div className="space-y-6">
        <Card className="bg-card border-border rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Alertas de validación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertsPanel caseId={caseItem.id} />
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Conflictos entre documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConflictsPanel caseId={caseItem.id} />
          </CardContent>
        </Card>
      </div>
    ),
    timeline: (
      <Card className="bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Historial de actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CaseTimeline events={auditEvents || []} />
        </CardContent>
      </Card>
    ),
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/cases"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a expedientes
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground">
              {caseItem.reference_code || "Sin referencia"}
            </h1>
            <CaseStatusBadge status={caseItem.status} />
          </div>
          <p className="mt-1 text-lg text-muted-foreground">
            {caseItem.client_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GenerateProvisionButton
            caseId={caseItem.id}
            caseStatus={caseItem.status}
            hasExtractedData={hasExtractedData}
          />
          <ExportCaseDialog
            caseId={caseItem.id}
            caseName={caseItem.reference_code || "Sin referencia"}
          />
          <Button variant="outline">Editar expediente</Button>
        </div>
      </div>

      {/* Tabs */}
      <CaseDetailTabs
        alertsCount={unresolvedAlertsCount}
        tabContents={tabContents}
      />
    </div>
  )
}
