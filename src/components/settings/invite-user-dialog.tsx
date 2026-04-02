"use client"

import { useState } from "react"
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
import { Plus, Loader2, UserPlus, Shield, UserCheck, User, Briefcase } from "lucide-react"

interface InviteUserDialogProps {
  onUserInvited: () => void
}

const roleOptions = [
  { value: "admin", label: "Administrador", icon: Shield, description: "Acceso completo al sistema" },
  { value: "supervisor", label: "Supervisor", icon: UserCheck, description: "Puede revisar y aprobar casos" },
  { value: "operador", label: "Operador", icon: User, description: "Gestiona expedientes diarios" },
  { value: "backoffice", label: "Backoffice", icon: Briefcase, description: "Soporte administrativo" },
]

export function InviteUserDialog({ onUserInvited }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "operador" as "admin" | "supervisor" | "operador" | "backoffice",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/settings/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al invitar usuario")
      }

      setOpen(false)
      setFormData({ email: "", name: "", role: "operador" })
      onUserInvited()
    } catch (err) {
      console.error("Error inviting user:", err)
      setError(err instanceof Error ? err.message : "Error al invitar usuario")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invitar Usuario
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-[var(--surface)] border-[var(--border)]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">Invitar Nuevo Usuario</DialogTitle>
            <DialogDescription className="text-[var(--text-muted)]">
              Envía una invitación para unirse a tu agencia.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-[var(--text)]">
                Correo Electrónico <span className="text-[var(--error)]">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@empresa.com"
                required
                className="bg-[var(--surface)] border-[var(--border)]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-[var(--text)]">
                Nombre
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del usuario"
                className="bg-[var(--surface)] border-[var(--border)]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role" className="text-[var(--text)]">
                Rol <span className="text-[var(--error)]">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as typeof formData.role })
                }
              >
                <SelectTrigger className="bg-[var(--surface)] border-[var(--border)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-start gap-3 py-1">
                        <role.icon className="h-4 w-4 mt-0.5 text-[var(--text-muted)]" />
                        <div className="flex flex-col">
                          <span className="font-medium">{role.label}</span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {role.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && (
              <div className="text-sm text-[var(--error)] bg-[var(--error)]/10 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Enviar Invitación
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
