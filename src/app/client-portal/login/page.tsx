"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"

export default function ClientLoginPage() {
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

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError("Correo o contraseña incorrectos.")
        setLoading(false)
        return
      }

      // Verificar que el usuario sea cliente
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        
        if (profile?.role !== "cliente") {
          await supabase.auth.signOut()
          setError("Este portal es exclusivo para clientes.")
          setLoading(false)
          return
        }
      }

      router.push("/client-portal/dashboard")
      router.refresh()
    } catch {
      setError("Ocurrió un error al iniciar sesión.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] p-4">
      {/* Logo y branding */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--primary)] flex items-center justify-center shadow-lg">
          <Package className="w-8 h-8 text-[var(--text-inverse)]" />
        </div>
        <h1 className="text-2xl font-semibold text-[var(--text)] mb-1">
          Portal de Clientes
        </h1>
        <p className="text-[var(--text-muted)]">
          Accede a tus operaciones y documentos
        </p>
      </div>

      <Card className="w-full max-w-sm bg-[var(--surface)] border-[var(--border)] shadow-xl">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg text-[var(--text)] text-center">
            Iniciar sesión
          </CardTitle>
          <CardDescription className="text-center text-[var(--text-muted)] text-sm">
            Ingresa tus credenciales para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--text)] text-sm">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[var(--bg)] border-[var(--border)] h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[var(--text)] text-sm">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[var(--bg)] border-[var(--border)] h-11"
              />
            </div>
            
            {error && (
              <div className="p-3 rounded-lg bg-[var(--error-soft)] text-[var(--error)] text-sm">
                {error}
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full bg-[var(--primary)] text-[var(--text-inverse)] hover:bg-[var(--primary-hover)] h-11 text-base font-medium"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              ¿Problemas para acceder?{" "}
              <a href="#" className="text-[var(--primary)] hover:underline">
                Contacta a tu agencia
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-[var(--text-faint)]">
        © {new Date().getFullYear()} Copiloto Aduanero
      </p>
    </div>
  )
}
