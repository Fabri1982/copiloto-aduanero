import { getUserProfile } from "@/lib/supabase/auth"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AgencySettings } from "@/components/settings/agency-settings"
import { UsersTable } from "@/components/settings/users-table"
import { ExportProfilesList } from "@/components/settings/export-profiles-list"
import { ThresholdSettings } from "@/components/settings/threshold-settings"
import {
  Building2,
  Users,
  FileOutput,
  Brain,
  Shield,
  User,
} from "lucide-react"

export default async function SettingsPage() {
  const { profile } = await getUserProfile()
  const isAdmin = profile.role === "admin"
  const isSupervisor = profile.role === "supervisor" || isAdmin

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)]">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Gestiona la configuración de tu agencia y preferencias del sistema
        </p>
      </div>

      {/* User Info Card */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
          {isAdmin ? (
            <Shield className="h-6 w-6 text-[var(--primary)]" />
          ) : (
            <User className="h-6 w-6 text-[var(--primary)]" />
          )}
        </div>
        <div>
          <p className="font-medium text-[var(--text)]">
            {isAdmin ? "Administrador" : isSupervisor ? "Supervisor" : "Usuario"}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {isAdmin
              ? "Tienes acceso completo a todas las configuraciones"
              : isSupervisor
              ? "Puedes gestionar perfiles de exportación"
              : "Visualización de configuraciones"}
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="agency" className="w-full">
        <TabsList className="bg-[var(--surface)] border border-[var(--border)] p-1 rounded-xl">
          <TabsTrigger value="agency" className="gap-2 data-[state=active]:bg-[var(--bg)]">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Agencia</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-[var(--bg)]">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2 data-[state=active]:bg-[var(--bg)]">
            <FileOutput className="h-4 w-4" />
            <span className="hidden sm:inline">Exportación</span>
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="gap-2 data-[state=active]:bg-[var(--bg)]">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Umbrales IA</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agency" className="mt-6">
          <AgencySettings isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UsersTable isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <ExportProfilesList isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="thresholds" className="mt-6">
          <ThresholdSettings isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
