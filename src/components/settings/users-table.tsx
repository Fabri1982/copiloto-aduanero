"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, MoreHorizontal, UserCheck, UserX, Shield, User, Briefcase } from "lucide-react"
import { InviteUserDialog } from "./invite-user-dialog"

interface UserData {
  id: string
  email: string
  name: string
  role: "admin" | "supervisor" | "operador" | "backoffice"
  status: "active" | "inactive"
  created_at: string
}

interface UsersTableProps {
  isAdmin: boolean
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  operador: "Operador",
  backoffice: "Backoffice",
}

const roleIcons: Record<string, React.ReactNode> = {
  admin: <Shield className="h-4 w-4" />,
  supervisor: <UserCheck className="h-4 w-4" />,
  operador: <User className="h-4 w-4" />,
  backoffice: <Briefcase className="h-4 w-4" />,
}

export function UsersTable({ isAdmin }: UsersTableProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/settings/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string | null) => {
    if (!newRole) return
    setUpdating(userId)
    try {
      const response = await fetch(`/api/settings/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      if (response.ok) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole as UserData["role"] } : u)))
      }
    } catch (error) {
      console.error("Error updating user role:", error)
    } finally {
      setUpdating(null)
    }
  }

  const handleDeactivate = async (userId: string) => {
    if (!confirm("¿Estás seguro de que deseas desactivar este usuario?")) return
    setUpdating(userId)
    try {
      const response = await fetch(`/api/settings/users/${userId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, status: "inactive" } : u)))
      }
    } catch (error) {
      console.error("Error deactivating user:", error)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-[var(--text)]">
          Usuarios de la Agencia
        </h3>
        {isAdmin && <InviteUserDialog onUserInvited={fetchUsers} />}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)] hover:bg-transparent">
              <TableHead className="text-[var(--text-muted)] font-medium">Usuario</TableHead>
              <TableHead className="text-[var(--text-muted)] font-medium">Rol</TableHead>
              <TableHead className="text-[var(--text-muted)] font-medium">Estado</TableHead>
              <TableHead className="text-[var(--text-muted)] font-medium w-[60px]">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="border-[var(--border)] hover:bg-[var(--surface-2)]">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-[var(--text)]">{user.name}</span>
                    <span className="text-sm text-[var(--text-muted)]">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {isAdmin ? (
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                      disabled={updating === user.id}
                    >
                      <SelectTrigger className="w-[160px] bg-[var(--bg)] border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          {roleIcons[user.role]}
                          <span>{roleLabels[user.role]}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Administrador
                          </div>
                        </SelectItem>
                        <SelectItem value="supervisor">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            Supervisor
                          </div>
                        </SelectItem>
                        <SelectItem value="operador">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Operador
                          </div>
                        </SelectItem>
                        <SelectItem value="backoffice">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Backoffice
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="bg-[var(--surface-2)]">
                      <div className="flex items-center gap-1">
                        {roleIcons[user.role]}
                        {roleLabels[user.role]}
                      </div>
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.status === "active" ? "default" : "secondary"}
                    className={
                      user.status === "active"
                        ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                        : "bg-gray-500/10 text-gray-600"
                    }
                  >
                    {user.status === "active" ? (
                      <>
                        <UserCheck className="h-3 w-3 mr-1" />
                        Activo
                      </>
                    ) : (
                      <>
                        <UserX className="h-3 w-3 mr-1" />
                        Inactivo
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isAdmin && user.status === "active" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDeactivate(user.id)}
                          className="text-[var(--error)]"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Desactivar usuario
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
