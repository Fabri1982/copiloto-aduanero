"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, Upload } from "lucide-react"

interface BillingConcept {
  id: string
  label: string
  defaultAmount: number
}

interface AgencySettings {
  name: string
  defaultCurrency: string
  billingConcepts: BillingConcept[]
  logo?: string
}

interface AgencySettingsProps {
  isAdmin: boolean
}

export function AgencySettings({ isAdmin }: AgencySettingsProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AgencySettings>({
    name: "",
    defaultCurrency: "CLP",
    billingConcepts: [],
  })
  const [newConcept, setNewConcept] = useState({ label: "", defaultAmount: "" })

  useEffect(() => {
    fetchAgencySettings()
  }, [])

  const fetchAgencySettings = async () => {
    try {
      const response = await fetch("/api/settings/agency")
      if (response.ok) {
        const data = await response.json()
        const settingsJson = (data.settings_json as Record<string, unknown>) || {}
        setSettings({
          name: data.name || "",
          defaultCurrency: (settingsJson.defaultCurrency as string) || "CLP",
          billingConcepts: (settingsJson.billingConcepts as BillingConcept[]) || [],
          logo: (settingsJson.logo as string) || undefined,
        })
      }
    } catch (error) {
      console.error("Error fetching agency settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!isAdmin) return
    setSaving(true)
    try {
      const response = await fetch("/api/settings/agency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          settings_json: {
            defaultCurrency: settings.defaultCurrency,
            billingConcepts: settings.billingConcepts,
            logo: settings.logo,
          },
        }),
      })
      if (!response.ok) throw new Error("Error saving settings")
    } catch (error) {
      console.error("Error saving agency settings:", error)
    } finally {
      setSaving(false)
    }
  }

  const addBillingConcept = () => {
    if (!newConcept.label || !newConcept.defaultAmount) return
    const concept: BillingConcept = {
      id: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()),
      label: newConcept.label,
      defaultAmount: parseFloat(newConcept.defaultAmount),
    }
    setSettings({ ...settings, billingConcepts: [...settings.billingConcepts, concept] })
    setNewConcept({ label: "", defaultAmount: "" })
  }

  const removeBillingConcept = (id: string) => {
    setSettings({
      ...settings,
      billingConcepts: settings.billingConcepts.filter((c) => c.id !== id),
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
      {/* Agency Info */}
      <Card className="bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-foreground">Información de la Agencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="agencyName" className="text-foreground">
              Nombre de la Agencia
            </Label>
            <Input
              id="agencyName"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              disabled={!isAdmin}
              className="bg-background border-border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="currency" className="text-foreground">
              Moneda por Defecto
            </Label>
            <Select
              value={settings.defaultCurrency}
              onValueChange={(value) => setSettings({ ...settings, defaultCurrency: value || "CLP" })}
              disabled={!isAdmin}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLP">CLP - Peso Chileno</SelectItem>
                <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-foreground">Logo</Label>
            <div className="flex items-center gap-4">
              {settings.logo ? (
                <div className="w-16 h-16 rounded-lg bg-sidebar-accent flex items-center justify-center overflow-hidden">
                  <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-sidebar-accent flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <Button variant="outline" disabled={!isAdmin} className="border-border">
                <Upload className="h-4 w-4 mr-2" />
                Subir Logo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Concepts */}
      <Card className="bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-foreground">Conceptos de Cobro Predefinidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin && (
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del concepto"
                value={newConcept.label}
                onChange={(e) => setNewConcept({ ...newConcept, label: e.target.value })}
                className="flex-1 bg-background border-border"
              />
              <Input
                placeholder="Monto"
                type="number"
                value={newConcept.defaultAmount}
                onChange={(e) => setNewConcept({ ...newConcept, defaultAmount: e.target.value })}
                className="w-32 bg-background border-border"
              />
              <Button onClick={addBillingConcept} disabled={!newConcept.label || !newConcept.defaultAmount}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {settings.billingConcepts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay conceptos de cobro configurados
              </p>
            ) : (
              settings.billingConcepts.map((concept) => (
                <div
                  key={concept.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-foreground">{concept.label}</span>
                    <Badge variant="secondary" className="bg-sidebar-accent">
                      {settings.defaultCurrency} {concept.defaultAmount.toLocaleString()}
                    </Badge>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeBillingConcept(concept.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
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
              "Guardar Cambios"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
