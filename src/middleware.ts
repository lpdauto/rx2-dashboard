import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE = 'rx2-auth'

async function expectedToken(): Promise<string> {
  const pwd    = process.env.DASHBOARD_PASSWORD ?? ''
  const secret = process.env.COOKIE_SECRET ?? 'rx2-race-2026'
  const data   = new TextEncoder().encode(pwd + secret)
  const hash   = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow login page and auth API through
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const token    = request.cookies.get(AUTH_COOKIE)?.value
  const expected = await expectedToken()

  if (token !== expected) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Exclude Next.js internals and static public files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|kml)$).*)'],
}
