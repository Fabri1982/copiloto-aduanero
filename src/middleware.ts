import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     * - Supabase Storage (don't intercept file uploads/downloads)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/inngest|storage/v1|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
