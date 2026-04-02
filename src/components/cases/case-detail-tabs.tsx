"use client"

import { useState, type ReactNode } from "react"
import { FileText, Database, List, CheckCircle, Clock } from "lucide-react"

interface Tab {
  id: string
  label: string
  icon: typeof FileText
  badge?: number
}

interface CaseDetailTabsProps {
  alertsCount: number
  tabContents: Record<string, ReactNode>
}

const tabs: Tab[] = [
  { id: "documents", label: "Documentos", icon: FileText },
  { id: "data", label: "Datos", icon: Database },
  { id: "nomenclature", label: "Nomenclatura", icon: List },
  { id: "validations", label: "Validaciones", icon: CheckCircle },
  { id: "timeline", label: "Línea de tiempo", icon: Clock },
]

export function CaseDetailTabs({ alertsCount, tabContents }: CaseDetailTabsProps) {
  const [active, setActive] = useState("documents")

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="border-b border-[var(--border)]">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = active === tab.id
            const badgeCount = tab.id === "validations" ? alertsCount : 0

            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-[var(--primary)] text-[var(--primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {badgeCount > 0 && (
                  <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--error)] px-1.5 text-xs font-medium text-white">
                    {badgeCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>{tabContents[active]}</div>
    </div>
  )
}
