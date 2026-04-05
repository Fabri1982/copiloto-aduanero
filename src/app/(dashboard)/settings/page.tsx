"use client"

import { useState } from "react"
import { AgencySettings } from "@/components/settings/agency-settings"
import { UsersTable } from "@/components/settings/users-table"
import { ExportProfilesList } from "@/components/settings/export-profiles-list"
import { ThresholdSettings } from "@/components/settings/threshold-settings"
import {
  Building2,
  Users,
  FileOutput,
  Brain,
} from "lucide-react"

const sections = [
  {
    id: "agency",
    label: "Agencia",
    description: "Nombre, moneda y conceptos de cobro",
    icon: Building2,
  },
  {
    id: "users",
    label: "Usuarios",
    description: "Gestión de equipo e invitaciones",
    icon: Users,
  },
  {
    id: "export",
    label: "Exportación",
    description: "Perfiles y mapeo de campos",
    icon: FileOutput,
  },
  {
    id: "thresholds",
    label: "Umbrales IA",
    description: "Confianza, escalamiento y reglas",
    icon: Brain,
  },
]

export default function SettingsPage() {
  const [active, setActive] = useState("agency")
  const isAdmin = true // TODO: get from profile in server component wrapper

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona la configuración de tu agencia y preferencias del sistema
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <nav className="lg:w-64 flex-shrink-0">
          <div className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = active === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActive(section.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    isActive
                      ? "bg-card border border-border shadow-sm"
                      : "hover:bg-card border border-transparent"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      isActive
                        ? "bg-primary text-white"
                        : "bg-sidebar-accent text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isActive ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {section.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {section.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {active === "agency" && <AgencySettings isAdmin={isAdmin} />}
          {active === "users" && <UsersTable isAdmin={isAdmin} />}
          {active === "export" && <ExportProfilesList isAdmin={isAdmin} />}
          {active === "thresholds" && <ThresholdSettings isAdmin={isAdmin} />}
        </div>
      </div>
    </div>
  )
}
