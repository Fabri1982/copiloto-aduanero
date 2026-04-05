import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Route detection
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isClientLoginPage = request.nextUrl.pathname === '/client-portal/login'
  const isClientPortal = request.nextUrl.pathname.startsWith('/client-portal')
  const isClientProtectedRoute = isClientPortal && !isClientLoginPage
  const isPublicPage = request.nextUrl.pathname === '/' || isAuthPage || isClientLoginPage
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // Skip auth checks for API routes (they handle their own auth)
  if (isApiRoute) {
    return supabaseResponse
  }

  // Redirect unauthenticated users trying to access protected routes
  if (!user && !isPublicPage) {
    const url = request.nextUrl.clone()
    // Redirect to client login for client routes, admin login for others
    url.pathname = isClientPortal ? '/client-portal/login' : '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated clients away from client login page
  if (user && isClientLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/client-portal/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
