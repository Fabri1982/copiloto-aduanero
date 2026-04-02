"use client"

import { useState, useEffect } from "react"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Buenos días"
  if (hour < 18) return "Buenas tardes"
  return "Buenas noches"
}

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }
  return date.toLocaleDateString("es-ES", options)
}

interface GreetingSectionProps {
  userName: string | null | undefined
}

export function GreetingSection({ userName }: GreetingSectionProps) {
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState("Buenos días")
  const [dateString, setDateString] = useState("")

  useEffect(() => {
    setMounted(true)
    setGreeting(getGreeting())
    setDateString(formatDate(new Date()))
  }, [])

  if (!mounted) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)]">
          Hola, {userName?.split(" ")[0] || "Usuario"}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Cargando...
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--text)]">
        {greeting}, {userName?.split(" ")[0] || "Usuario"}
      </h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {dateString}
      </p>
    </div>
  )
}
