"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Loader2, Brain, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

interface ThresholdSettings {
  autoApprovalThreshold: number
  escalationThreshold: number
  validationRules: {
    documentCompleteness: boolean
    dataConsistency: boolean
    amountValidation: boolean
    clientVerification: boolean
    duplicateDetection: boolean
  }
}

interface ThresholdSettingsProps {
  isAdmin: boolean
}

const validationRulesList = [
  { key: "documentCompleteness", label: "Completitud de documentos", description: "Verifica que todos los documentos requeridos estén presentes" },
  { key: "dataConsistency", label: "Consistencia de datos", description: "Valida que los datos entre documentos coincidan" },
  { key: "amountValidation", label: "Validación de montos", description: "Comprueba que los montos sean coherentes" },
  { key: "clientVerification", label: "Verificación de cliente", description: "Valida la información del cliente" },
  { key: "duplicateDetection", label: "Detección de duplicados", description: "Identifica posibles casos duplicados" },
] as const

export function ThresholdSettings({ isAdmin }: ThresholdSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<ThresholdSettings>({
    autoApprovalThreshold: 85,
    escalationThreshold: 60,
    validationRules: {
      documentCompleteness: true,
      dataConsistency: true,
      amountValidation: true,
      clientVerification: false,
      duplicateDetection: true,
    },
  })

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/agency")
      if (response.ok) {
        const data = await response.json()
        const settingsJson = (data.settings_json as Record<string, unknown>) || {}
        setSettings({
          autoApprovalThreshold: (settingsJson.autoApprovalThreshold as number) || 85,
          escalationThreshold: (settingsJson.escalationThreshold as number) || 60,
          validationRules: {
            documentCompleteness: (settingsJson.validationRules as Record<string, boolean>)?.documentCompleteness ?? true,
            dataConsistency: (settingsJson.validationRules as Record<string, boolean>)?.dataConsistency ?? true,
            amountValidation: (settingsJson.validationRules as Record<string, boolean>)?.amountValidation ?? true,
            clientVerification: (settingsJson.validationRules as Record<string, boolean>)?.clientVerification ?? false,
            duplicateDetection: (settingsJson.validationRules as Record<string, boolean>)?.duplicateDetection ?? true,
          },
        })
      }
    } catch (error) {
      console.error("Error fetching threshold settings:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])



  const handleSave = async () => {
    if (!isAdmin) return
    setSaving(true)
    try {
      const response = await fetch("/api/settings/agency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings_json: {
            autoApprovalThreshold: settings.autoApprovalThreshold,
            escalationThreshold: settings.escalationThreshold,
            validationRules: settings.validationRules,
          },
        }),
      })
      if (!response.ok) throw new Error("Error saving settings")
    } catch (error) {
      console.error("Error saving threshold settings:", error)
    } finally {
      setSaving(false)
    }
  }

  const toggleRule = (ruleKey: keyof ThresholdSettings["validationRules"]) => {
    if (!isAdmin) return
    setSettings({
      ...settings,
      validationRules: {
        ...settings.validationRules,
        [ruleKey]: !settings.validationRules[ruleKey],
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Auto-approval Threshold */}
      <Card className="bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Umbral de Auto-aprobación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-foreground">
                Confianza mínima para auto-aprobar
              </Label>
              <Badge
                variant="secondary"
                className={`${
                  settings.autoApprovalThreshold >= 90
                    ? "bg-green-500/10 text-green-600"
                    : settings.autoApprovalThreshold >= 75
                    ? "bg-yellow-500/10 text-yellow-600"
                    : "bg-orange-500/10 text-orange-600"
                }`}
              >
                {settings.autoApprovalThreshold}%
              </Badge>
            </div>
            <Slider
              value={[settings.autoApprovalThreshold]}
              onValueChange={(value: number[]) =>
                setSettings({ ...settings, autoApprovalThreshold: value[0] })
              }
              min={0}
              max={100}
              step={5}
              disabled={!isAdmin}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Los casos con una confianza de IA igual o superior a este valor serán
              aprobados automáticamente sin revisión humana.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Escalation Threshold */}
      <Card className="bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Umbral de Escalamiento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-foreground">
                Confianza mínima para escalamiento
              </Label>
              <Badge
                variant="secondary"
                className={`${
                  settings.escalationThreshold >= 70
                    ? "bg-green-500/10 text-green-600"
                    : settings.escalationThreshold >= 50
                    ? "bg-yellow-500/10 text-yellow-600"
                    : "bg-red-500/10 text-red-600"
                }`}
              >
                {settings.escalationThreshold}%
              </Badge>
            </div>
            <Slider
              value={[settings.escalationThreshold]}
              onValueChange={(value: number[]) =>
                setSettings({ ...settings, escalationThreshold: value[0] })
              }
              min={0}
              max={100}
              step={5}
              disabled={!isAdmin}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Los casos con una confianza de IA inferior a este valor serán
              escalados automáticamente para revisión prioritaria.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Validation Rules */}
      <Card className="bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Reglas de Validación IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {validationRulesList.map((rule) => (
              <div
                key={rule.key}
                className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border"
              >
                <Checkbox
                  id={rule.key}
                  checked={settings.validationRules[rule.key]}
                  onCheckedChange={() => toggleRule(rule.key)}
                  disabled={!isAdmin}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={rule.key}
                    className="text-foreground font-medium cursor-pointer"
                  >
                    {rule.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {rule.description}
                  </p>
                </div>
                {settings.validationRules[rule.key] ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Configuración"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
