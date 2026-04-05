"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, X, Pencil, History } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface FieldReview {
  id: string
  field_id: string
  original_value: string
  new_value: string
  reviewed_by: string
  reviewed_at: string
  reviewer_name?: string
}

interface FieldEditorProps {
  fieldId: string
  caseId: string
  initialValue: string
  fieldLabel: string
  onSave?: (newValue: string) => void
}

export function FieldEditor({
  fieldId,
  caseId,
  initialValue,
  fieldLabel,
  onSave,
}: FieldEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [editedValue, setEditedValue] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)
  const [hasBeenEdited, setHasBeenEdited] = useState(false)
  const [reviews, setReviews] = useState<FieldReview[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Fetch reviews to check if field has been edited
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/cases/${caseId}/fields?fieldId=${fieldId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.reviews && data.reviews.length > 0) {
            setReviews(data.reviews)
            setHasBeenEdited(true)
            // Set current value to the latest review's new_value
            const latestReview = data.reviews[0]
            setValue(latestReview.new_value)
          }
        }
      } catch (err) {
        console.error("Error fetching field reviews:", err)
      }
    }

    fetchReviews()
  }, [caseId, fieldId])

  const handleStartEdit = () => {
    setEditedValue(value)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedValue(value)
  }

  const handleSave = async () => {
    if (editedValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch(`/api/cases/${caseId}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldId,
          newValue: editedValue,
          originalValue: value,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al guardar cambios")
      }

      const data = await response.json()
      
      setValue(editedValue)
      setHasBeenEdited(true)
      if (data.review) {
        setReviews((prev) => [data.review, ...prev])
      }
      
      onSave?.(editedValue)
      setIsEditing(false)
    } catch (err) {
      console.error("Error saving field:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editedValue}
          onChange={(e) => setEditedValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="h-8 text-sm"
          placeholder={fieldLabel}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={handleSave}
          disabled={isSaving}
          className="h-8 w-8 text-emerald-600"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCancel}
          disabled={isSaving}
          className="h-8 w-8 text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="group flex items-center gap-2">
        <span
          className={`text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors ${
            hasBeenEdited ? "text-primary" : "text-foreground"
          }`}
          onClick={handleStartEdit}
        >
          {value || "—"}
        </span>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleStartEdit}
                  className="h-6 w-6"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              }
            />
            <TooltipContent>
              <p className="text-xs">Editar</p>
            </TooltipContent>
          </Tooltip>

          {hasBeenEdited && reviews.length > 0 && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowHistory(!showHistory)}
                    className="h-6 w-6"
                  >
                    <History className="h-3 w-3 text-primary" />
                  </Button>
                }
              />
              <TooltipContent>
                <p className="text-xs">Ver historial</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {hasBeenEdited && (
          <Tooltip>
            <TooltipTrigger
              render={<span className="flex h-1.5 w-1.5 rounded-full bg-primary" />}
            />
            <TooltipContent>
              <p className="text-xs">Campo editado manualmente</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* History Panel */}
      {showHistory && reviews.length > 0 && (
        <div className="mt-2 p-3 rounded-lg bg-card border border-border text-xs">
          <p className="font-medium text-foreground mb-2">Historial de cambios</p>
          <div className="space-y-2">
            {reviews.map((review, idx) => (
              <div key={review.id} className="flex items-center gap-2">
                <span className="text-muted-foreground line-through">
                  {review.original_value || "—"}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-emerald-600">{review.new_value}</span>
                <span className="text-muted-foreground/60 ml-auto">
                  {new Date(review.reviewed_at).toLocaleDateString("es-ES")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </TooltipProvider>
  )
}
