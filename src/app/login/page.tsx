"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Credenciales inválidas. Intenta de nuevo.")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <Card className="w-full max-w-md bg-[var(--surface)] border-[var(--border)]">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
              Copiloto Aduanero
            </h1>
          </div>
          <CardTitle className="text-xl text-[var(--text)]">
            Iniciar sesión
          </CardTitle>
          <CardDescription className="text-[var(--text-muted)]">
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--text)]">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@agencia.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[var(--surface-2)] border-[var(--border)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[var(--text)]">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[var(--surface-2)] border-[var(--border)]"
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--error)]">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-[var(--primary)] text-[var(--text-inverse)] hover:bg-[var(--primary-hover)]"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
