"use client"

import { useState } from "react"
import { AuditEvent } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileUp,
  FileCheck,
  AlertCircle,
  Send,
  DollarSign,
  CheckCircle,
  Clock,
  User,
  Bot,
  Settings,
  Edit3,
  Sparkles,
  Download,
  ChevronDown,
  ChevronUp,
  Filter,
  Brain,
  Eye,
  XCircle,
} from "lucide-react"

interface CaseReview {
  id: string
  field_id: string
  original_value: string
  new_value: string
  reviewed_by: string
  reviewed_at: string
  reviewer_name?: string
}

interface CaseTimelineProps {
  events: AuditEvent[]
  reviews?: CaseReview[]
}

type EventTypeFilter = "all" | "upload" | "processing" | "validation" | "provision" | "payment" | "export"
type ActorFilter = "all" | "human" | "ai" | "system"

interface EventTypeConfig {
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
  category: EventTypeFilter
}

const eventTypeConfigs: Record<string, EventTypeConfig> = {
  document_uploaded: {
    icon: <FileUp className="h-4 w-4" />,
    label: "Documento subido",
    color: "text-blue-500",
    bgColor: "bg-blue-500",
    category: "upload",
  },
  document_processed: {
    icon: <Sparkles className="h-4 w-4" />,
    label: "Documento procesado por IA",
    color: "text-purple-500",
    bgColor: "bg-purple-500",
    category: "processing",
  },
  validation_completed: {
    icon: <CheckCircle className="h-4 w-4" />,
    label: "Validación completada",
    color: "text-green-500",
    bgColor: "bg-green-500",
    category: "validation",
  },
  validation_failed: {
    icon: <XCircle className="h-4 w-4" />,
    label: "Validación fallida",
    color: "text-red-500",
    bgColor: "bg-red-500",
    category: "validation",
  },
  field_edited: {
    icon: <Edit3 className="h-4 w-4" />,
    label: "Campo editado manualmente",
    color: "text-orange-500",
    bgColor: "bg-orange-500",
    category: "validation",
  },
  provision_sent: {
    icon: <Send className="h-4 w-4" />,
    label: "Provisión enviada",
    color: "text-purple-500",
    bgColor: "bg-purple-500",
    category: "provision",
  },
  payment_uploaded: {
    icon: <DollarSign className="h-4 w-4" />,
    label: "Pago cargado",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500",
    category: "payment",
  },
  payment_validated: {
    icon: <CheckCircle className="h-4 w-4" />,
    label: "Pago validado",
    color: "text-green-500",
    bgColor: "bg-green-500",
    category: "payment",
  },
  case_created: {
    icon: <Clock className="h-4 w-4" />,
    label: "Expediente creado",
    color: "text-gray-500",
    bgColor: "bg-gray-500",
    category: "upload",
  },
  case_updated: {
    icon: <Settings className="h-4 w-4" />,
    label: "Expediente actualizado",
    color: "text-gray-500",
    bgColor: "bg-gray-500",
    category: "upload",
  },
  case_exported: {
    icon: <Download className="h-4 w-4" />,
    label: "Expediente exportado",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500",
    category: "export",
  },
  ai_suggestion_accepted: {
    icon: <Brain className="h-4 w-4" />,
    label: "Sugerencia de IA aceptada",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500",
    category: "processing",
  },
  ai_suggestion_rejected: {
    icon: <XCircle className="h-4 w-4" />,
    label: "Sugerencia de IA rechazada",
    color: "text-red-400",
    bgColor: "bg-red-400",
    category: "processing",
  },
  manual_review_requested: {
    icon: <Eye className="h-4 w-4" />,
    label: "Revisión manual solicitada",
    color: "text-amber-500",
    bgColor: "bg-amber-500",
    category: "validation",
  },
}

const defaultConfig: EventTypeConfig = {
  icon: <Clock className="h-4 w-4" />,
  label: "Evento",
  color: "text-gray-500",
  bgColor: "bg-gray-500",
  category: "upload",
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "Hace unos segundos"
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `Hace ${diffInHours} h`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `Hace ${diffInDays} d`
  return formatDate(dateString)
}

function getActorBadge(actorType: string) {
  switch (actorType) {
    case "user":
      return (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 gap-1">
          <User className="h-3 w-3" />
          Humano
        </Badge>
      )
    case "agent":
      return (
        <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 gap-1">
          <Bot className="h-3 w-3" />
          IA
        </Badge>
      )
    case "system":
      return (
        <Badge variant="secondary" className="bg-gray-500/10 text-gray-600 gap-1">
          <Settings className="h-3 w-3" />
          Sistema
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="bg-gray-500/10 text-gray-600 gap-1">
          <User className="h-3 w-3" />
          {actorType}
        </Badge>
      )
  }
}

function DiffView({ before, after, label }: { before: string; after: string; label?: string }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
      {label && <p className="text-xs font-medium text-[var(--text-muted)] mb-2">{label}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-[var(--text-faint)] mb-1">Antes</p>
          <p className="text-sm text-[var(--text-muted)] line-through decoration-red-400">{before || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-faint)] mb-1">Después</p>
          <p className="text-sm text-[var(--text)]">{after || "-"}</p>
        </div>
      </div>
    </div>
  )
}

interface TimelineEventProps {
  event: AuditEvent
  review?: CaseReview
  isExpanded: boolean
  onToggle: () => void
}

function TimelineEvent({ event, review, isExpanded, onToggle }: TimelineEventProps) {
  const config = eventTypeConfigs[event.event_name] || defaultConfig
  const hasDetails = Object.keys(event.event_payload_json).length > 0 || review

  return (
    <div className="relative flex gap-4 group">
      {/* Icon circle */}
      <div
        className={`relative z-10 w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center text-white shrink-0 shadow-sm`}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 pt-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[var(--text)]">
                {config.label}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {formatRelativeTime(event.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {getActorBadge(event.actor_type)}
              {event.actor_type === "user" && typeof event.event_payload_json.actor_name === "string" && (
                <span className="text-xs text-[var(--text-muted)]">
                  por {event.event_payload_json.actor_name}
                </span>
              )}
            </div>
          </div>
          {hasDetails && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggle}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 space-y-3">
            {/* Show diff for field edits */}
            {event.event_name === "field_edited" && (
              <DiffView
                before={String(event.event_payload_json.original_value || "")}
                after={String(event.event_payload_json.new_value || "")}
                label={`Campo: ${String(event.event_payload_json.field_name || "")}`}
              />
            )}

            {/* Show review diff if available */}
            {review && (
              <DiffView
                before={review.original_value}
                after={review.new_value}
                label={review.reviewer_name ? `Revisado por ${review.reviewer_name}` : "Revisión"}
              />
            )}

            {/* Event payload */}
            {Object.keys(event.event_payload_json).length > 0 &&
              event.event_name !== "field_edited" && (
                <div className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                  <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Detalles</p>
                  <div className="space-y-1">
                    {Object.entries(event.event_payload_json).map(([key, value]) => {
                      // Skip internal fields
                      if (["actor_name", "original_value", "new_value", "field_name"].includes(key)) {
                        return null
                      }
                      return (
                        <div key={key} className="text-xs">
                          <span className="font-medium text-[var(--text-muted)]">{key}:</span>{" "}
                          <span className="text-[var(--text)]">{String(value)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  )
}

export function CaseTimeline({ events, reviews = [] }: CaseTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>("all")
  const [actorFilter, setActorFilter] = useState<ActorFilter>("all")

  const toggleExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  // Filter events
  const filteredEvents = events.filter((event) => {
    // Filter by event type
    if (eventTypeFilter !== "all") {
      const config = eventTypeConfigs[event.event_name]
      if (!config || config.category !== eventTypeFilter) {
        return false
      }
    }

    // Filter by actor
    if (actorFilter !== "all") {
      if (actorFilter === "human" && event.actor_type !== "user") return false
      if (actorFilter === "ai" && event.actor_type !== "agent") return false
      if (actorFilter === "system") return false // system actor_type doesn't exist in schema
    }

    return true
  })

  // Create a map of reviews by field_id for quick lookup
  const reviewsByFieldId = new Map<string, CaseReview>()
  reviews.forEach((review) => {
    reviewsByFieldId.set(review.field_id, review)
  })

  if (events.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-base font-medium text-[var(--text)] mb-1">
          Sin actividad
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          No hay eventos registrados para este expediente.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-muted)]">Filtrar por:</span>
        </div>
        <Select value={eventTypeFilter} onValueChange={(v) => setEventTypeFilter(v as EventTypeFilter)}>
          <SelectTrigger className="h-8 w-[140px] bg-[var(--surface)] border-[var(--border)] text-xs">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los eventos</SelectItem>
            <SelectItem value="upload">Carga</SelectItem>
            <SelectItem value="processing">Procesamiento IA</SelectItem>
            <SelectItem value="validation">Validación</SelectItem>
            <SelectItem value="provision">Provisión</SelectItem>
            <SelectItem value="payment">Pago</SelectItem>
            <SelectItem value="export">Exportación</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actorFilter} onValueChange={(v) => setActorFilter(v as ActorFilter)}>
          <SelectTrigger className="h-8 w-[130px] bg-[var(--surface)] border-[var(--border)] text-xs">
            <SelectValue placeholder="Actor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="human">Humano</SelectItem>
            <SelectItem value="ai">IA</SelectItem>
            <SelectItem value="system">Sistema</SelectItem>
          </SelectContent>
        </Select>
        {(eventTypeFilter !== "all" || actorFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEventTypeFilter("all")
              setActorFilter("all")
            }}
            className="h-8 text-xs"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
        <Badge variant="outline" className="gap-1">
          <Bot className="h-3 w-3" />
          {events.filter((e) => e.actor_type === "agent").length} acciones IA
        </Badge>
        <Badge variant="outline" className="gap-1">
          <User className="h-3 w-3" />
          {events.filter((e) => e.actor_type === "user").length} acciones humanas
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Edit3 className="h-3 w-3" />
          {events.filter((e) => e.event_name === "field_edited").length} ediciones
        </Badge>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-2 bottom-2 w-px bg-[var(--border)]" />

        <div className="space-y-6">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--text-muted)]">
                No hay eventos que coincidan con los filtros seleccionados
              </p>
            </div>
          ) : (
            filteredEvents.map((event) => {
              // Find related review if this is a field edit
              const relatedReview =
                event.event_name === "field_edited" && event.event_payload_json.field_id
                  ? reviewsByFieldId.get(String(event.event_payload_json.field_id))
                  : undefined

              return (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  review={relatedReview}
                  isExpanded={expandedEvents.has(event.id)}
                  onToggle={() => toggleExpanded(event.id)}
                />
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
