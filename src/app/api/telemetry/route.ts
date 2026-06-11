import { NextResponse } from 'next/server'
import { readVehicleTelemetry, readMpptTelemetry, readSpareBatteryTelemetry } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const now = Date.now()

  try {
    const [vehicle, mppt, spare] = await Promise.all([
      readVehicleTelemetry(),
      readMpptTelemetry(),
      readSpareBatteryTelemetry(),
    ])

    return NextResponse.json({
      vehicle: vehicle?.data ?? null,
      mppt: mppt?.data ?? null,
      spare: spare?.data ?? null,
      vehicleAgeMs: vehicle ? now - Date.parse(vehicle.updatedAt) : null,
      mpptAgeMs: mppt ? now - Date.parse(mppt.updatedAt) : null,
      spareAgeMs: spare ? now - Date.parse(spare.updatedAt) : null,
      fetchedAt: now,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Redis read failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
