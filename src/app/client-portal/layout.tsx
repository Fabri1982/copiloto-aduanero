import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect("/client-portal/login")
  }
  
  // Verificar que el usuario tenga rol 'cliente'
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name, agency_id")
    .eq("id", user.id)
    .single()
  
  if (!profile || profile.role !== "cliente") {
    redirect("/client-portal/login")
  }
  
  // Obtener nombre de la agencia
  const { data: agency } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", profile.agency_id)
    .single()

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {/* Header simple */}
      <header className="sticky top-0 z-50 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <span className="text-[var(--text-inverse)] font-semibold text-sm">CA</span>
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-[var(--text)] text-sm leading-tight">
                Copiloto Aduanero
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {agency?.name || "Portal Cliente"}
              </span>
            </div>
          </div>
          
          <form action="/api/auth/logout" method="POST">
            <Button 
              type="submit" 
              variant="ghost" 
              size="sm"
              className="text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer discreto */}
      <footer className="bg-[var(--surface)] border-t border-[var(--border)] py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} {agency?.name || "Copiloto Aduanero"} — Portal de Clientes
          </p>
        </div>
      </footer>
    </div>
  )
}
