import { getDashboardStats } from "@/lib/dashboard-data"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentCases } from "@/components/dashboard/recent-cases"

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-foreground">
            Bienvenido, {stats.userName?.split(" ")[0] || "Usuario"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de operaciones y actividad reciente
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Última actualización: {new Date().toLocaleDateString("es-CL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Stats */}
      <StatsCards
        totalCases={stats.totalCases}
        processingCases={stats.processingCases}
        completedCases={stats.completedCases}
        needsReview={stats.needsReview}
      />

      {/* Recent cases table */}
      <RecentCases cases={stats.recentCases} />
    </div>
  )
}
