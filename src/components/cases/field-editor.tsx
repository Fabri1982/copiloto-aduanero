"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Check, X, Loader2 } from "lucide-react"
import { useUser } from "@/hooks/use-user"

interface FieldEditorProps {
  fieldId: string
  fieldName: string
  fieldLabel: string
  currentValue: string
  caseId: string
  documentId: string | null
  onSave?: (newValue: string) => void
  showEditIndicator?: boolean
}

export function FieldEditor({
  fieldId,
  fieldName,
  fieldLabel,
  currentValue,
  caseId,
  documentId,
  onSave,
  showEditIndicator = false,
}: FieldEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(currentValue)
  const [isSaving, setIsSaving] = useState(false)
  const [wasEdited, setWasEdited] = useState(showEditIndicator)
  const { profile } = useUser()

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    const supabase = createClient()

    try {
      // 1. Get current field data for before_json
      const { data: currentField, error: fetchError } = await supabase
        .from("extracted_fields")
        .select("*")
        .eq("id", fieldId)
        .single()

      if (fetchError) throw fetchError

      // 2. Update the extracted_fields record
      const { error: updateError } = await supabase
        .from("extracted_fields")
        .update({
          extracted_value: editValue,
          manually_corrected: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fieldId)

      if (updateError) throw updateError

      // 3. Create case_reviews record with before/after
      const { error: reviewError } = await supabase.from("case_reviews").insert({
        case_id: caseId,
        field_id: fieldId,
        document_id: documentId,
        reviewer_id: profile.id,
        before_json: {
          field_name: fieldName,
          field_label: fieldLabel,
          extracted_value: currentField.extracted_value,
          confidence: currentField.confidence,
        },
        after_json: {
          field_name: fieldName,
          field_label: fieldLabel,
          extracted_value: editValue,
          confidence: 1.0, // Manual correction has max confidence
        },
        review_type: "manual_correction",
        notes: `Campo "${fieldLabel}" corregido manualmente`,
      })

      if (reviewError) throw reviewError

      // 4. Create audit_event
      const { error: auditError } = await supabase.from("audit_events").insert({
        agency_id: profile.agency_id,
        case_id: caseId,
        actor_type: "user",
        actor_id: profile.id,
        event_name: "field_manually_corrected",
        event_payload_json: {
          field_id: fieldId,
          field_name: fieldName,
          field_label: fieldLabel,
          old_value: currentField.extracted_value,
          new_value: editValue,
          document_id: documentId,
        },
      })

      if (auditError) throw auditError

      // Success - update local state
      setWasEdited(true)
      setIsEditing(false)
      onSave?.(editValue)
    } catch (err) {
      console.error("Error saving field edit:", err)
      // Revert to original value on error
      setEditValue(currentValue)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(currentValue)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="h-8 text-sm bg-[var(--bg)] border-[var(--border)]"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") handleCancel()
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-[var(--success)]"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-[var(--error)]"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-2">
      <span className="text-sm font-medium text-[var(--text)] truncate">
        {currentValue || "—"}
      </span>
      {wasEdited && (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-4 bg-[var(--primary-soft)] text-[var(--primary)]"
        >
          editado
        </Badge>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--primary)]"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  )
}
