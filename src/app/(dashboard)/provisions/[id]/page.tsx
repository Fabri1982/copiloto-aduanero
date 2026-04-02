"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ProvisionStatusBadge } from "@/components/provisions/provision-status-badge"
import { ProvisionItemsEditor, ProvisionItem } from "@/components/provisions/provision-items-editor"
import { ProvisionSummary } from "@/components/provisions/provision-summary"
import {
  ArrowLeft,
  Send,
  Edit,
  CheckCircle,
  FileText,
  Loader2,
  RefreshCw,
  Eye,
  Save,
  X,
} from "lucide-react"
import { ProvisionStatus } from "@/types/database"

interface ProvisionItemData {
  id: string
  provision_id: string
  item_order: number
  label: string
  amount: number
  description: string | null
}

interface ProvisionData {
  id: string
  case_id: string
  agency_id: string
  status: ProvisionStatus
  subtotal: number
  total: number
  currency: string
  notes: string | null
  confidence: number
  sent_at: string | null
  created_at: string
  updated_at: string
  provision_items: ProvisionItemData[]
  operation_cases: {
    client_name: string
    reference_code: string
    status: string
  }
}

export default function ProvisionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const provisionId = params.id as string

  const [provision, setProvision] = useState<ProvisionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)

  // Edit state
  const [editItems, setEditItems] = useState<ProvisionItem[]>([])
  const [editNotes, setEditNotes] = useState("")

  useEffect(() => {
    fetchProvision()
  }, [provisionId])

  const fetchProvision = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/provisions/${provisionId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Provisión no encontrada")
        }
        throw new Error("Error al cargar la provisión")
      }

      const data = await response.json()
      setProvision(data.provision)
      
      // Initialize edit state
      setEditItems(data.provision.provision_items.map((item: ProvisionItemData) => ({
        id: item.id,
        label: item.label,
        amount: item.amount,
        description: item.description || undefined,
      })))
      setEditNotes(data.provision.notes || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!provision) return

    setSaving(true)
    try {
      const total = editItems.reduce((sum, item) => sum + (item.amount || 0), 0)
      
      const response = await fetch(`/api/provisions/${provisionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: editItems,
          total,
          subtotal: total,
          notes: editNotes,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al guardar los cambios")
      }

      setIsEditing(false)
      fetchProvision()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    if (!provision) return

    setSending(true)
    try {
      const response = await fetch(`/api/provisions/${provisionId}/send`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Error al enviar la provisión")
      }

      fetchProvision()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setSending(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!provision) return

    setMarkingPaid(true)
    try {
      const response = await fetch(`/api/provisions/${provisionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "payment_validated",
        }),
      })

      if (!response.ok) {
        throw new Error("Error al marcar como pagada")
      }

      fetchProvision()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setMarkingPaid(false)
    }
  }

  const calculateTotal = () => {
    return editItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error || !provision) {
    return (
      <div className="space-y-6">
        <Link
          href="/provisions"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a provisiones
        </Link>
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-base font-medium text-[var(--text)] mb-1">
            {error || "Provisión no encontrada"}
          </h3>
        </div>
      </div>
    )
  }

  const canEdit = ["draft", "ready_to_send"].includes(provision.status)
  const canSend = ["draft", "ready_to_send"].includes(provision.status)
  const canMarkPaid = ["sent", "viewed", "payment_pending", "payment_uploaded"].includes(provision.status)
  const isPaid = provision.status === "payment_validated"

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/provisions"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a provisiones
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-[var(--text)]">
              {provision.operation_cases?.reference_code || "Sin referencia"}
            </h1>
            <ProvisionStatusBadge status={provision.status} />
          </div>
          <p className="mt-1 text-lg text-[var(--text-muted)]">
            {provision.operation_cases?.client_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setEditItems(provision.provision_items.map((item) => ({
                    id: item.id,
                    label: item.label,
                    amount: item.amount,
                    description: item.description || undefined,
                  })))
                  setEditNotes(provision.notes || "")
                }}
                disabled={saving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar
              </Button>
            </>
          ) : (
            <>
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
              {canSend && (
                <Button
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Enviar al cliente
                </Button>
              )}
              {canMarkPaid && !isPaid && (
                <Button
                  onClick={handleMarkAsPaid}
                  disabled={markingPaid}
                  className="bg-[var(--success)] hover:bg-[var(--success)]/90"
                >
                  {markingPaid ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Marcar como pagada
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-[var(--error)] bg-[var(--error)]/10 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-medium text-[var(--text)]">
                Desglose de conceptos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <ProvisionItemsEditor
                  items={editItems}
                  onChange={setEditItems}
                  currency={provision.currency}
                />
              ) : (
                <ProvisionItemsEditor
                  items={provision.provision_items.map((item) => ({
                    id: item.id,
                    label: item.label,
                    amount: item.amount,
                    description: item.description || undefined,
                  }))}
                  onChange={() => {}}
                  currency={provision.currency}
                  readOnly
                />
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-medium text-[var(--text)]">
                Notas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  className="bg-[var(--bg)] border-[var(--border)] min-h-[100px]"
                />
              ) : (
                <p className="text-[var(--text)] whitespace-pre-wrap">
                  {provision.notes || "Sin notas"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ProvisionSummary provision={provision} />

          {/* Actions Card */}
          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-xl">
            <CardHeader>
              <CardTitle className="text-base font-medium text-[var(--text)]">
                Acciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/cases/${provision.case_id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver expediente
                </Button>
              </Link>
              {provision.status === "sent" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleSend}
                  disabled={sending}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reenviar al cliente
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
