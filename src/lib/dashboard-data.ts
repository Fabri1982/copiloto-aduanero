import { createClient } from "@/lib/supabase/server"

export async function getDashboardStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) return null

  const { data: cases } = await supabase
    .from("operation_cases")
    .select("id, status")
    .eq("agency_id", profile.agency_id)

  const { data: recentCases } = await supabase
    .from("operation_cases")
    .select("*")
    .eq("agency_id", profile.agency_id)
    .order("created_at", { ascending: false })
    .limit(5)

  const { data: documents } = await supabase
    .from("case_documents")
    .select("*")
    .eq("case_id", cases?.map(c => c.id) || [])

  const totalCases = cases?.length || 0
  const processingCases = cases?.filter(c => c.status === "processing").length || 0
  const completedCases = cases?.filter(c => c.status === "ready_for_provision" || c.status === "closed").length || 0
  const needsReview = cases?.filter(c => c.status === "needs_review").length || 0

  return {
    userName: profile.name,
    totalCases,
    processingCases,
    completedCases,
    needsReview,
    recentCases: recentCases || [],
    totalDocuments: documents?.length || 0,
  }
}
