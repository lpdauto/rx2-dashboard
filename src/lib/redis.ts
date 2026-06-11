import 'server-only'
import { Redis } from '@upstash/redis'
import type { TelemetryNode, VehiclePacket, MpptPacket } from '@/types/telemetry'

type RedisRow = {
  node: TelemetryNode
  payload: unknown
  updated_at: string
}

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

  if (!url || !token) {
    return null
  }

  return new Redis({ url, token })
}

async function readLatest(node: TelemetryNode): Promise<{ payload: unknown; updatedAt: string } | null> {
  const redis = getRedisClient()
  if (!redis) return null

  const row = await redis.get<RedisRow>(`latest:${node}`)
  if (!row) return null

  return { payload: row.payload, updatedAt: row.updated_at }
}

export async function readVehicleTelemetry(): Promise<{ data: VehiclePacket; updatedAt: string } | null> {
  const result = await readLatest('vehicle')
  if (!result) return null

  return { data: result.payload as VehiclePacket, updatedAt: result.updatedAt }
}

export async function readMpptTelemetry(): Promise<{ data: MpptPacket; updatedAt: string } | null> {
  const result = await readLatest('mppt')
  if (!result) return null

  return { data: result.payload as MpptPacket, updatedAt: result.updatedAt }
}

export async function readSpareBatteryTelemetry(): Promise<{ data: MpptPacket; updatedAt: string } | null> {
  const result = await readLatest('spare-battery')
  if (!result) return null

  return { data: result.payload as MpptPacket, updatedAt: result.updatedAt }
}
