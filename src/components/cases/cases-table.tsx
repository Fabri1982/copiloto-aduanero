"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { CaseStatusBadge } from "@/components/cases/case-status-badge"
import { PriorityBadge } from "@/components/cases/priority-badge"
import { OperationCase } from "@/types/database"
import { MoreHorizontal, Eye, Edit, Trash2, Check, X } from "lucide-react"

interface CasesTableProps {
  cases: OperationCase[]
  searchQuery?: string
}

export function CasesTable({ cases, searchQuery }: CasesTableProps) {
  const router = useRouter()
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const toggleSelectCase = (caseId: string) => {
    const newSelected = new Set(selectedCases)
    if (newSelected.has(caseId)) {
      newSelected.delete(caseId)
    } else {
      newSelected.add(caseId)
    }
    setSelectedCases(newSelected)
    
    // Exit selection mode if no cases selected
    if (newSelected.size === 0) {
      setIsSelectionMode(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedCases.size === cases.length) {
      setSelectedCases(new Set())
      setIsSelectionMode(false)
    } else {
      setSelectedCases(new Set(cases.map(c => c.id)))
      setIsSelectionMode(true)
    }
  }

  const handleDeleteSelected = async () => {
    setIsDeleting(true)
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from("operation_cases")
        .delete()
        .in("id", Array.from(selectedCases))
      
      if (error) throw error
      
      // Reset selection and refresh
      setSelectedCases(new Set())
      setIsSelectionMode(false)
      setShowDeleteDialog(false)
      router.refresh()
    } catch (err) {
      console.error("Error deleting cases:", err)
      alert("Error al eliminar los expedientes seleccionados")
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmDelete = () => {
    setShowDeleteDialog(true)
  }

  return (
    <>
      {/* Selection Toolbar */}
      {isSelectionMode && (
        <div className="flex items-center justify-between p-4 mb-4 bg-sidebar-accent rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {selectedCases.size} expediente(s) seleccionado(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCases(new Set())
                setIsSelectionMode(false)
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-[50px]">
              <Checkbox
                checked={cases.length > 0 && selectedCases.size === cases.length}
                onCheckedChange={toggleSelectAll}
                aria-label="Seleccionar todos"
              />
            </TableHead>
            <TableHead className="text-muted-foreground font-medium">
              Referencia
            </TableHead>
            <TableHead className="text-muted-foreground font-medium">
              Cliente
            </TableHead>
            <TableHead className="text-muted-foreground font-medium">
              Estado
            </TableHead>
            <TableHead className="text-muted-foreground font-medium">
              Prioridad
            </TableHead>
            <TableHead className="text-muted-foreground font-medium">
              Fecha
            </TableHead>
            <TableHead className="text-muted-foreground font-medium w-[60px]">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseItem: OperationCase) => (
            <TableRow
              key={caseItem.id}
              className={`border-border transition-colors ${
                selectedCases.has(caseItem.id)
                  ? "bg-primary/10"
                  : "hover:bg-sidebar-accent"
              }`}
            >
              <TableCell>
                <Checkbox
                  checked={selectedCases.has(caseItem.id)}
                  onCheckedChange={() => toggleSelectCase(caseItem.id)}
                  aria-label={`Seleccionar ${caseItem.reference_code || caseItem.client_name}`}
                />
              </TableCell>
              <TableCell>
                <a
                  href={`/cases/${caseItem.id}`}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                  onClick={(e) => {
                    if (isSelectionMode) {
                      e.preventDefault()
                      toggleSelectCase(caseItem.id)
                    }
                  }}
                >
                  {caseItem.reference_code || "Sin referencia"}
                </a>
              </TableCell>
              <TableCell className="text-foreground">
                {caseItem.client_name}
              </TableCell>
              <TableCell>
                <CaseStatusBadge status={caseItem.status} />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={caseItem.priority} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(caseItem.created_at)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Acciones</span>
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      render={
                        <a
                          href={`/cases/${caseItem.id}`}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </a>
                      }
                    />
                    <DropdownMenuItem
                      render={
                        <a
                          href={`/cases/${caseItem.id}?edit=true`}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </a>
                      }
                    />
                    <DropdownMenuItem
                      render={
                        <button
                          className="flex items-center gap-2 text-destructive"
                          onClick={() => {
                            setSelectedCases(new Set([caseItem.id]))
                            setIsSelectionMode(true)
                            confirmDelete()
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      }
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar expedientes?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán permanentemente{" "}
              <strong>{selectedCases.size} expediente(s)</strong> y todos sus
              documentos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
