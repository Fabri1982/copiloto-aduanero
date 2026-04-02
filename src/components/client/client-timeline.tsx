"use client"

import { CheckCircle, Circle, Clock } from "lucide-react"

interface TimelineStep {
  label: string
  completed: boolean
  current?: boolean
}

interface ClientTimelineProps {
  steps: TimelineStep[]
}

export function ClientTimeline({ steps }: ClientTimelineProps) {
  return (
    <div className="relative">
      {/* Línea de progreso */}
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-[var(--border)]" />
      
      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={index} className="relative flex items-start gap-4">
            {/* Indicador */}
            <div className={`
              relative z-10 w-8 h-8 rounded-full flex items-center justify-center
              ${step.completed 
                ? "bg-[var(--success)] text-[var(--text-inverse)]" 
                : step.current 
                  ? "bg-[var(--primary)] text-[var(--text-inverse)] ring-4 ring-[var(--primary-soft)]"
                  : "bg-[var(--surface-2)] text-[var(--text-faint)] border border-[var(--border)]"
              }
            `}>
              {step.completed ? (
                <CheckCircle className="w-4 h-4" />
              ) : step.current ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>
            
            {/* Texto */}
            <div className="flex-1 pt-1">
              <p className={`
                text-sm font-medium
                ${step.completed || step.current 
                  ? "text-[var(--text)]" 
                  : "text-[var(--text-muted)]"
                }
              `}>
                {step.label}
              </p>
              {step.current && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  En este paso
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
