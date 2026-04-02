"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { ConfidenceIndicator } from "@/components/shared/confidence-indicator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, AlertTriangle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CaseItem {
  id: string
  case_id: string
  item_number: number
  description: string
  quantity: number | null
  unit: string | null
  unit_price: number | null
  total_price: number | null
  currency: string | null
  created_at: string
}

interface TariffClassification {
  id: string
  case_item_id: string
  chile_hs_code_8: string | null
  short_description: string | null
  long_description: string | null
  normalized_composition: string | null
  confidence: number
  needs_human_review: boolean
  created_at: string
}

interface ItemsGridProps {
  caseId: string
}

export function ItemsGrid({ caseId }: ItemsGridProps) {
  const [items, setItems] = useState<(CaseItem & { tariff?: TariffClassification })[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCell, setEditingCell] = useState<{
    itemId: string
    field: string
  } | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch case items
      const { data: itemsData, error: itemsError } = await supabase
        .from("case_items")
        .select("*")
        .eq("case_id", caseId)
        .order("item_number", { ascending: true })

      if (itemsError) throw itemsError

      // Fetch tariff classifications
      const itemIds = itemsData?.map((item) => item.id) || []
      let tariffMap: Record<string, TariffClassification> = {}

      if (itemIds.length > 0) {
        const { data: tariffData, error: tariffError } = await supabase
          .from("tariff_classifications")
          .select("*")
          .in("case_item_id", itemIds)

        if (tariffError) throw tariffError

        tariffData?.forEach((t) => {
          tariffMap[t.case_item_id] = t
        })
      }

      // Combine items with their tariff classifications
      const combinedItems =
        itemsData?.map((item) => ({
          ...item,
          tariff: tariffMap[item.id],
        })) || []

      setItems(combinedItems)
    } catch (err) {
      console.error("Error fetching items:", err)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleCellEdit = async (
    itemId: string,
    tariffId: string | undefined,
    field: string,
    value: string
  ) => {
    if (!tariffId) return

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("tariff_classifications")
        .update({ [field]: value })
        .eq("id", tariffId)

      if (error) throw error

      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId && item.tariff
            ? {
                ...item,
                tariff: { ...item.tariff, [field]: value },
              }
            : item
        )
      )
    } catch (err) {
      console.error("Error updating tariff:", err)
    }
  }

  const handleBlur = (
    itemId: string,
    tariffId: string | undefined,
    field: string,
    value: string
  ) => {
    setEditingCell(null)
    handleCellEdit(itemId, tariffId, field, value)
  }

  const renderEditableCell = (
    item: CaseItem & { tariff?: TariffClassification },
    field: keyof TariffClassification,
    placeholder: string = "—"
  ) => {
    const tariffId = item.tariff?.id
    const value = item.tariff?.[field] || ""
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field

    if (isEditing) {
      return (
        <Input
          type="text"
          defaultValue={value as string}
          className="h-8 text-sm bg-[var(--surface)] border-[var(--border)]"
          autoFocus
          onBlur={(e) => handleBlur(item.id, tariffId, field, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleBlur(item.id, tariffId, field, e.currentTarget.value)
            }
          }}
        />
      )
    }

    return (
      <div
        onClick={() => setEditingCell({ itemId: item.id, field })}
        className="cursor-pointer hover:bg-[var(--surface-2)] rounded px-2 py-1 -mx-2 transition-colors min-h-[32px] flex items-center"
      >
        <span className={value ? "text-[var(--text)]" : "text-[var(--text-muted)]"}>
          {(value as string) || placeholder}
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">Cargando ítems...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
          <Package className="h-6 w-6 text-[var(--text-muted)]" />
        </div>
        <p className="text-sm text-[var(--text-muted)] text-center">
          Los ítems aparecerán después del procesamiento documental.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border)] hover:bg-transparent">
                <TableHead className="w-12 text-[var(--text-muted)]">#</TableHead>
                <TableHead className="text-[var(--text-muted)]">Descripción origen</TableHead>
                <TableHead className="w-28 text-[var(--text-muted)]">Partida</TableHead>
                <TableHead className="w-40 text-[var(--text-muted)]">Glosa corta</TableHead>
                <TableHead className="w-48 text-[var(--text-muted)]">Glosa larga</TableHead>
                <TableHead className="w-40 text-[var(--text-muted)]">Composición</TableHead>
                <TableHead className="w-24 text-[var(--text-muted)]">Confianza</TableHead>
                <TableHead className="w-24 text-[var(--text-muted)]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className={`border-b border-[var(--border)] hover:bg-[var(--surface-2)] ${
                    item.tariff?.needs_human_review
                      ? "bg-[var(--warning)]/5"
                      : ""
                  }`}
                >
                  <TableCell className="font-medium text-[var(--text)]">
                    {item.item_number}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger render={<span className="text-sm text-[var(--text)] truncate max-w-[200px] cursor-help block">
                          {item.description}
                        </span>} />
                      <TooltipContent side="top">
                        <p className="text-xs max-w-xs">{item.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(item, "chile_hs_code_8", "—")}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(item, "short_description", "—")}
                  </TableCell>
                  <TableCell>
                    {item.tariff?.long_description ? (
                      <Tooltip>
                        <TooltipTrigger render={<div>{renderEditableCell(item, "long_description", "—")}</div>} />
                        <TooltipContent side="top">
                          <p className="text-xs max-w-sm">
                            {item.tariff.long_description}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      renderEditableCell(item, "long_description", "—")
                    )}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(item, "normalized_composition", "—")}
                  </TableCell>
                  <TableCell>
                    {item.tariff ? (
                      <ConfidenceIndicator
                        value={item.tariff.confidence}
                        showLabel={false}
                      />
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.tariff?.needs_human_review ? (
                      <Badge
                        variant="outline"
                        className="text-xs border-[var(--warning)] text-[var(--warning)] bg-[var(--warning)]/10"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Revisar
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs border-[var(--success)] text-[var(--success)] bg-[var(--success)]/10"
                      >
                        OK
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  )
}
