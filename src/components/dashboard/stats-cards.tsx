import { FolderOpen, Loader2, CheckCircle2, Eye } from "lucide-react"

interface StatsCardsProps {
  totalCases: number
  processingCases: number
  completedCases: number
  needsReview: number
}

const stats = [
  {
    label: "Total Expedientes",
    icon: FolderOpen,
    color: "text-foreground",
    bg: "bg-primary/10",
  },
  {
    label: "En Proceso",
    icon: Loader2,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "Completados",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-600/10",
  },
  {
    label: "Requieren Revisión",
    icon: Eye,
    color: "text-amber-600",
    bg: "bg-amber-600/10",
  },
]

export function StatsCards({ totalCases, processingCases, completedCases, needsReview }: StatsCardsProps) {
  const values = [totalCases, processingCases, completedCases, needsReview]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="rounded-md border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div className={`rounded-md p-1.5 ${stat.bg}`}>
                <Icon className={`h-4 w-4 ${stat.color} ${i === 1 ? "animate-spin" : ""}`} strokeWidth={1.5} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {values[i]}
            </p>
          </div>
        )
      })}
    </div>
  )
}
