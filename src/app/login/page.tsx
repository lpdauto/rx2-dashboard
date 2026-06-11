'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()
  const params   = useSearchParams()

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      const from = params.get('from') ?? '/'
      router.push(from)
      router.refresh()
    } else {
      setError('Incorrect password')
      setPassword('')
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4">
      <div className="w-full max-w-xs">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-amber-400">RX2</p>
          <h1 className="mt-1 text-2xl font-black text-white">Race Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">2026 Cross-Texas Solar Car Challenge</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
              Password
            </label>
            <input
              ref={inputRef}
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter team password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-white placeholder-slate-600 outline-none ring-0 transition focus:border-amber-400/60 focus:bg-white/[0.08]"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-red-400">
              <span>▲</span> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="mt-1 h-11 rounded-lg bg-amber-400 font-bold text-black transition hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
