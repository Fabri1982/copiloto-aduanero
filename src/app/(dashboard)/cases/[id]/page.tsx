import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/auth"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { ArrowLeft, FileText, Database, CheckCircle, Clock, List, AlertTriangle, Download } from "lucide-react"

interface CaseDetailPageProps {
  params: Promise<{ id: string }>
}

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

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/cases"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a expedientes
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-[var(--text)]">
              {caseItem.reference_code || "Sin referencia"}
            </h1>
            <CaseStatusBadge status={caseItem.status} />
          </div>
          <p className="mt-1 text-lg text-[var(--text-muted)]">
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
      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="bg-[var(--surface)] border border-[var(--border)]">
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            Datos
          </TabsTrigger>
          <TabsTrigger value="nomenclature" className="gap-2">
            <List className="h-4 w-4" />
            Nomenclatura
          </TabsTrigger>
          <TabsTrigger value="validations" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Validaciones
            {unresolvedAlertsCount > 0 && (
              <Badge
                variant="destructive"
                className="h-5 min-w-5 px-1.5 text-xs bg-[var(--error)] text-[var(--text-inverse)]"
              >
                {unresolvedAlertsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <Clock className="h-4 w-4" />
            Línea de tiempo
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-medium text-[var(--text)]">
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

          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-medium text-[var(--text)]">
                Estado de procesamiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessingStatus
                caseId={caseItem.id}
                documents={documents || []}
              />
            </CardContent>
          </Card>

          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-medium text-[var(--text)]">
                Documentos cargados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentList documents={documents || []} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data">
          <DualView caseId={caseItem.id} documents={documents || []} />
        </TabsContent>

        {/* Nomenclature Tab */}
        <TabsContent value="nomenclature">
          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-medium text-[var(--text)]">
                Nomenclatura arancelaria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ItemsGrid caseId={caseItem.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validations Tab */}
        <TabsContent value="validations" className="space-y-6">
          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-medium text-[var(--text)] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                Alertas de validación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AlertsPanel caseId={caseItem.id} />
            </CardContent>
          </Card>

          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-medium text-[var(--text)] flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--primary)]" />
                Conflictos entre documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConflictsPanel caseId={caseItem.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-medium text-[var(--text)]">
                Historial de actividad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CaseTimeline events={auditEvents || []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
