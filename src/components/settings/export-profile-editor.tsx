"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react"

interface ExportProfile {
  id?: string
  name: string
  target_system: string
  format: "csv" | "xlsx" | "json" | "xml"
  field_mapping: Record<string, string>
  is_active: boolean
}

interface ExportProfileEditorProps {
  profile: ExportProfile | null
  onSave: () => void
  onCancel: () => void
}

const availableFields = [
  { value: "reference_code", label: "Código de Referencia" },
  { value: "client_name", label: "Nombre del Cliente" },
  { value: "status", label: "Estado" },
  { value: "priority", label: "Prioridad" },
  { value: "created_at", label: "Fecha de Creación" },
  { value: "updated_at", label: "Fecha de Actualización" },
  { value: "total_amount", label: "Monto Total" },
  { value: "currency", label: "Moneda" },
  { value: "custom_field_1", label: "Campo Personalizado 1" },
  { value: "custom_field_2", label: "Campo Personalizado 2" },
]

export function ExportProfileEditor({ profile, onSave, onCancel }: ExportProfileEditorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<ExportProfile>({
    name: profile?.name || "",
    target_system: profile?.target_system || "",
    format: profile?.format || "csv",
    field_mapping: profile?.field_mapping || {},
    is_active: profile?.is_active ?? true,
  })
  const [newMapping, setNewMapping] = useState({ source: "", target: "" })

  const handleSave = async () => {
    if (!formData.name || !formData.target_system) {
      setError("Nombre y sistema destino son requeridos")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = profile?.id
        ? `/api/settings/export-profiles/${profile.id}`
        : "/api/settings/export-profiles"
      const method = profile?.id ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al guardar el perfil")
      }

      onSave()
    } catch (err) {
      console.error("Error saving export profile:", err)
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  const addMapping = () => {
    if (!newMapping.source || !newMapping.target) return
    setFormData({
      ...formData,
      field_mapping: {
        ...formData.field_mapping,
        [newMapping.source]: newMapping.target,
      },
    })
    setNewMapping({ source: "", target: "" })
  }

  const removeMapping = (source: string) => {
    const newMappings = { ...formData.field_mapping }
    delete newMappings[source]
    setFormData({ ...formData, field_mapping: newMappings })
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onCancel} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Volver a la lista
      </Button>

      <Card className="bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-foreground">
            {profile ? "Editar Perfil de Exportación" : "Nuevo Perfil de Exportación"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-foreground">
                Nombre del Perfil <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Exportación SAP"
                className="bg-background border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target_system" className="text-foreground">
                Sistema Destino <span className="text-destructive">*</span>
              </Label>
              <Input
                id="target_system"
                value={formData.target_system}
                onChange={(e) => setFormData({ ...formData, target_system: e.target.value })}
                placeholder="Ej: SAP, Oracle, etc."
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="format" className="text-foreground">
                Formato de Exportación
              </Label>
              <Select
                value={formData.format}
                onValueChange={(value) =>
                  setFormData({ ...formData, format: value as ExportProfile["format"] })
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label className="text-foreground cursor-pointer">
                Perfil activo
              </Label>
            </div>
          </div>

          {/* Field Mapping */}
          <div className="space-y-4">
            <Label className="text-foreground">Mapeo de Campos</Label>
            <div className="flex gap-2">
              <Select
                value={newMapping.source}
                onValueChange={(value) => setNewMapping({ ...newMapping, source: value || "" })}
              >
                <SelectTrigger className="flex-1 bg-background border-border">
                  <SelectValue placeholder="Campo origen" />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Nombre en destino"
                value={newMapping.target}
                onChange={(e) => setNewMapping({ ...newMapping, target: e.target.value })}
                className="flex-1 bg-background border-border"
              />
              <Button
                onClick={addMapping}
                disabled={!newMapping.source || !newMapping.target}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {Object.entries(formData.field_mapping).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay campos mapeados. Agrega al menos uno.
                </p>
              ) : (
                Object.entries(formData.field_mapping).map(([source, target]) => {
                  const fieldLabel = availableFields.find((f) => f.value === source)?.label || source
                  return (
                    <div
                      key={source}
                      className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-foreground">{fieldLabel}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium text-foreground">{target}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeMapping(source)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* JSON Editor (Advanced) */}
          <div className="grid gap-2">
            <Label htmlFor="jsonEditor" className="text-foreground">
              Editor JSON (Avanzado)
            </Label>
            <Textarea
              id="jsonEditor"
              value={JSON.stringify(formData.field_mapping, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  setFormData({ ...formData, field_mapping: parsed })
                  setError(null)
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              className="font-mono text-sm bg-background border-border min-h-[150px]"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Perfil"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
