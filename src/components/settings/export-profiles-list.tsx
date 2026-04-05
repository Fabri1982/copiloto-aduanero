"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, MoreHorizontal, FileJson, FileSpreadsheet, FileCode, Edit, Trash2, Power, PowerOff } from "lucide-react"
import { ExportProfileEditor } from "./export-profile-editor"

interface ExportProfile {
  id: string
  name: string
  target_system: string
  format: "csv" | "xlsx" | "json" | "xml"
  field_mapping: Record<string, string>
  is_active: boolean
  created_at: string
}

interface ExportProfilesListProps {
  isAdmin: boolean
}

const formatIcons: Record<string, React.ReactNode> = {
  csv: <FileSpreadsheet className="h-4 w-4" />,
  xlsx: <FileSpreadsheet className="h-4 w-4" />,
  json: <FileJson className="h-4 w-4" />,
  xml: <FileCode className="h-4 w-4" />,
}

const formatLabels: Record<string, string> = {
  csv: "CSV",
  xlsx: "Excel",
  json: "JSON",
  xml: "XML",
}

export function ExportProfilesList({ isAdmin }: ExportProfilesListProps) {
  const [profiles, setProfiles] = useState<ExportProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProfile, setEditingProfile] = useState<ExportProfile | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      const response = await fetch("/api/settings/export-profiles")
      if (response.ok) {
        const data = await response.json()
        setProfiles(data)
      }
    } catch (error) {
      console.error("Error fetching export profiles:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (profile: ExportProfile) => {
    try {
      const response = await fetch(`/api/settings/export-profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !profile.is_active }),
      })
      if (response.ok) {
        setProfiles(
          profiles.map((p) => (p.id === profile.id ? { ...p, is_active: !p.is_active } : p))
        )
      }
    } catch (error) {
      console.error("Error toggling profile:", error)
    }
  }

  const handleDelete = async (profileId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este perfil?")) return
    try {
      const response = await fetch(`/api/settings/export-profiles/${profileId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setProfiles(profiles.filter((p) => p.id !== profileId))
      }
    } catch (error) {
      console.error("Error deleting profile:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (editingProfile || isCreating) {
    return (
      <ExportProfileEditor
        profile={editingProfile}
        onSave={() => {
          setEditingProfile(null)
          setIsCreating(false)
          fetchProfiles()
        }}
        onCancel={() => {
          setEditingProfile(null)
          setIsCreating(false)
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-foreground">Perfiles de Exportación</h3>
        {(isAdmin || true) && (
          <Button onClick={() => setIsCreating(true)}>
            Nuevo Perfil
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {profiles.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay perfiles de exportación configurados
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Crea un perfil para exportar datos a sistemas externos
              </p>
            </CardContent>
          </Card>
        ) : (
          profiles.map((profile) => (
            <Card
              key={profile.id}
              className={`bg-card border-border transition-opacity ${
                !profile.is_active ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center">
                      {formatIcons[profile.format]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{profile.name}</h4>
                        <Badge variant="secondary" className="bg-sidebar-accent">
                          {formatLabels[profile.format]}
                        </Badge>
                        {!profile.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {profile.target_system}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {Object.keys(profile.field_mapping).length} campos mapeados
                    </span>
                    {(isAdmin || true) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingProfile(profile)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(profile)}>
                            {profile.is_active ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(profile.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
