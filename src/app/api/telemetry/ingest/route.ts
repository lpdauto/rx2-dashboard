import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import type { TelemetryNode } from '@/types/telemetry'

const VALID_NODES: TelemetryNode[] = ['vehicle', 'mppt', 'spare-battery']

function getRedis() {
  const url   = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function POST(request: Request) {
  const auth     = request.headers.get('Authorization') ?? ''
  const expected = `Bearer ${process.env.TELEMETRY_INGEST_TOKEN ?? 'rx2tc'}`
  if (auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Expected JSON object' }, { status: 400 })
  }

  const { node, payload } = body as Record<string, unknown>

  if (typeof node !== 'string' || !VALID_NODES.includes(node as TelemetryNode)) {
    return NextResponse.json({ error: `Invalid node: ${node}` }, { status: 400 })
  }
  if (typeof payload !== 'object' || payload === null) {
    return NextResponse.json({ error: 'payload must be an object' }, { status: 400 })
  }

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 500 })
  }

  await redis.set(`latest:${node}`, {
    node,
    payload,
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, node })
}
