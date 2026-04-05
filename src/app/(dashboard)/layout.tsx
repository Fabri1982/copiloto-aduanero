import { AppShell } from "@/components/layout/app-shell"
import { getAuthUser } from "@/lib/supabase/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await getAuthUser()
  
  return <AppShell>{children}</AppShell>
}
