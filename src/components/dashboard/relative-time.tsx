"use client"

interface RelativeTimeProps {
  dateString: string
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
  
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short"
  })
}

export function RelativeTime({ dateString }: RelativeTimeProps) {
  return (
    <span suppressHydrationWarning>
      {formatRelativeTime(dateString)}
    </span>
  )
}
