"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, GripVertical } from "lucide-react"

export interface ProvisionItem {
  id?: string
  label: string
  amount: number
  description?: string
}

interface ProvisionItemsEditorProps {
  items: ProvisionItem[]
  onChange: (items: ProvisionItem[]) => void
  currency?: string
  readOnly?: boolean
}

export function ProvisionItemsEditor({
  items,
  onChange,
  currency = "EUR",
  readOnly = false,
}: ProvisionItemsEditorProps) {
  const [newItemLabel, setNewItemLabel] = useState("")
  const [newItemAmount, setNewItemAmount] = useState("")

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(amount)
  }

  const handleAddItem = () => {
    if (!newItemLabel.trim() || !newItemAmount) return

    const newItem: ProvisionItem = {
      label: newItemLabel.trim(),
      amount: parseFloat(newItemAmount),
    }

    onChange([...items, newItem])
    setNewItemLabel("")
    setNewItemAmount("")
  }

  const handleRemoveItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    onChange(newItems)
  }

  const handleUpdateItem = (index: number, field: keyof ProvisionItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    onChange(newItems)
  }

  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0)

  if (readOnly) {
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
          >
            <span className="text-[var(--text)]">{item.label}</span>
            <span className="font-medium text-[var(--text)]">
              {formatCurrency(item.amount)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <span className="font-semibold text-[var(--text)]">Total</span>
          <span className="font-semibold text-lg text-[var(--primary)]">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Items List */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] group"
          >
            <GripVertical className="h-4 w-4 text-[var(--text-faint)] cursor-grab" />
            <div className="flex-1 grid grid-cols-2 gap-2">
              <Input
                value={item.label}
                onChange={(e) => handleUpdateItem(index, "label", e.target.value)}
                placeholder="Concepto"
                className="bg-[var(--surface)] border-[var(--border)]"
              />
              <Input
                type="number"
                step="0.01"
                value={item.amount}
                onChange={(e) => handleUpdateItem(index, "amount", parseFloat(e.target.value) || 0)}
                placeholder="Monto"
                className="bg-[var(--surface)] border-[var(--border)]"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => handleRemoveItem(index)}
              className="h-8 w-8 text-[var(--error)] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add New Item */}
      <div className="flex items-end gap-2 p-3 rounded-lg bg-[var(--surface-2)] border border-dashed border-[var(--border)]">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-[var(--text-muted)]">Concepto</Label>
            <Input
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              placeholder="Nuevo concepto"
              className="bg-[var(--surface)] border-[var(--border)]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddItem()
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--text-muted)]">Monto</Label>
            <Input
              type="number"
              step="0.01"
              value={newItemAmount}
              onChange={(e) => setNewItemAmount(e.target.value)}
              placeholder="0.00"
              className="bg-[var(--surface)] border-[var(--border)]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddItem()
                }
              }}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAddItem}
          disabled={!newItemLabel.trim() || !newItemAmount}
          className="h-10 w-10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
        <span className="text-sm text-[var(--text-muted)]">
          {items.length} {items.length === 1 ? "concepto" : "conceptos"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-muted)]">Total</span>
          <span className="font-semibold text-lg text-[var(--primary)]">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
