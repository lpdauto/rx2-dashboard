import { NextResponse } from 'next/server'

const AUTH_COOKIE = 'rx2-auth'

async function makeToken(password: string): Promise<string> {
  const secret = process.env.COOKIE_SECRET ?? 'rx2-race-2026'
  const data   = new TextEncoder().encode(password + secret)
  const hash   = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const submitted = typeof body.password === 'string' ? body.password : ''
  const expected  = process.env.DASHBOARD_PASSWORD ?? ''

  if (!expected || submitted !== expected) {
    // Delay slightly to slow brute-force
    await new Promise((r) => setTimeout(r, 500))
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token    = await makeToken(submitted)
  const response = NextResponse.json({ ok: true })

  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,  // 7 days
    path: '/',
  })

  return response
}

// Logout
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(AUTH_COOKIE, '', { maxAge: 0, path: '/' })
  return response
}
