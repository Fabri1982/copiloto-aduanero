"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"

const CURRENT_YEAR = 2026

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Logo y branding */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <Package className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">
          Portal de Clientes
        </h1>
        <p className="text-muted-foreground">
          Accede a tus operaciones y documentos
        </p>
      </div>

      <Card className="w-full max-w-sm bg-card border-border shadow-xl">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg text-foreground text-center">
            Iniciar sesión
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground text-sm">
            Ingresa tus credenciales para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground text-sm">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-border h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground text-sm">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background border-border h-11"
              />
            </div>
            
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base font-medium"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              ¿Problemas para acceder?{" "}
              <a href="#" className="text-primary hover:underline">
                Contacta a tu agencia
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-muted-foreground">
        © {CURRENT_YEAR} Copiloto Aduanero
      </p>
    </div>
  )
}
