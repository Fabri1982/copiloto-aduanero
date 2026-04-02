import { AppShell } from "@/components/layout/app-shell"
import { getAuthUser } from "@/lib/supabase/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This will redirect to /login if not authenticated
  await getAuthUser()
  
  return <AppShell>{children}</AppShell>
}
