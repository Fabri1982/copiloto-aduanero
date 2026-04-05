"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"

export function CreateCaseDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    client_name: "",
    reference_code: "",
    priority: "medium" as "low" | "medium" | "high",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("No se encontró el usuario")
      }

      // Get user profile for agency_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", user.id)
        .single()

      if (!profile) {
        throw new Error("No se encontró el perfil del usuario")
      }

      // Create the case
      const { error: insertError } = await supabase.from("operation_cases").insert({
        agency_id: profile.agency_id,
        client_name: formData.client_name,
        reference_code: formData.reference_code || null,
        priority: formData.priority,
        status: "draft",
        created_by: user.id,
      })

      if (insertError) {
        throw insertError
      }

      setOpen(false)
      setFormData({
        client_name: "",
        reference_code: "",
        priority: "medium",
      })
      router.refresh()
    } catch (err) {
      console.error("Error creating case:", err)
      setError(
        err instanceof Error ? err.message : "Error al crear el expediente"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo expediente
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Crear nuevo expediente
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Completa los datos para crear un nuevo expediente aduanero.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client_name" className="text-foreground">
                Cliente <span className="text-destructive">*</span>
              </Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) =>
                  setFormData({ ...formData, client_name: e.target.value })
                }
                placeholder="Nombre del cliente"
                required
                className="bg-card border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reference_code" className="text-foreground">
                Referencia
              </Label>
              <Input
                id="reference_code"
                value={formData.reference_code}
                onChange={(e) =>
                  setFormData({ ...formData, reference_code: e.target.value })
                }
                placeholder="Código de referencia (opcional)"
                className="bg-card border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority" className="text-foreground">
                Prioridad
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: (value as "low" | "medium" | "high") || "medium" })
                }
              >
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Selecciona la prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear expediente"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
