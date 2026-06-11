'use client'

import type { VehiclePacket, MpptPacket } from '@/types/telemetry'
import { motorRpm, aeroPowerW, rollingPowerW } from '@/lib/physics'

const DISCONNECTED_MS = 30_000

function NodeStatus({ ageMs }: { ageMs: number | null }) {
  if (ageMs === null) {
    return <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider">No data</span>
  }
  const secs = Math.round(ageMs / 1000)
  if (ageMs < DISCONNECTED_MS) {
    return (
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[9px] font-semibold text-emerald-400">{secs}s ago</span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      <span className="text-[9px] font-semibold text-red-400">Disconnected · {secs}s</span>
    </span>
  )
}

type Props = {
  vehicle: VehiclePacket | null
  mppt: MpptPacket | null
  liveWhPerMile: number | null
  modelWhPerMileAtCurrentSpeed: number
  netWhPerMile: number
  vehicleAgeMs?: number | null
  mpptAgeMs?: number | null
}

export function TelemetryGrid({ vehicle, mppt, liveWhPerMile, modelWhPerMileAtCurrentSpeed, netWhPerMile, vehicleAgeMs, mpptAgeMs }: Props) {
  const speed = vehicle?.speedMph ?? 0
  const expectedRpm = speed > 0 ? motorRpm(speed) : null
  const aeroW = speed > 0 ? aeroPowerW(speed) : null
  const rollW = speed > 0 ? rollingPowerW(speed) : null

  return (
    <div className="flex flex-col gap-2">
      {/* 1. Efficiency — most actionable, show first */}
      <Section title="Efficiency">
        <Row label="Live Wh/mi"  value={liveWhPerMile !== null ? fmt(liveWhPerMile, 1) : null} unit="Wh/mi"
          sub={`model ${modelWhPerMileAtCurrentSpeed.toFixed(1)}`}
          highlight={liveWhPerMile !== null && liveWhPerMile > modelWhPerMileAtCurrentSpeed * 1.15 ? 'warn' : undefined} />
        <Row label="Net Wh/mi"   value={fmt(netWhPerMile, 1)} unit="Wh/mi"
          sub={netWhPerMile < 0 ? 'charging' : 'draining'}
          highlight={netWhPerMile < 0 ? 'good' : netWhPerMile > 15 ? 'warn' : undefined} />
        <Row label="Aero drag"   value={aeroW ? fmt(aeroW, 0) : null} unit="W" />
        <Row label="Rolling"     value={rollW ? fmt(rollW, 0) : null} unit="W" />
        <Row label="Odometer"    value={fmt(vehicle?.odometerMiles, 1)} unit="mi" />
      </Section>

      {/* 2. Vehicle */}
      <Section title="Vehicle" status={<NodeStatus ageMs={vehicleAgeMs ?? null} />}>
        <Row label="Speed"       value={fmt(vehicle?.speedMph, 1)} unit="mph" />
        <Row label="Pack SoC"    value={fmt(vehicle?.packSoc, 0)} unit="%" />
        <Row label="Pack V"      value={fmt(vehicle?.packVoltage, 1)} unit="V" />
        <Row label="Pack A"      value={fmt(vehicle?.packCurrent, 1)} unit="A" />
        <Row label="Batt. draw"  value={vehicle?.packVoltage && vehicle?.packCurrent ? fmt(vehicle.packVoltage * vehicle.packCurrent, 0) : null} unit="W" />
        <Row label="Motor RPM"   value={fmt(vehicle?.motorRpm, 0)} unit="rpm"
          sub={expectedRpm ? `mdl ${Math.round(expectedRpm)}` : undefined} />
        <Row label="Throttle"    value={fmt(vehicle?.throttlePercent, 0)} unit="%" />
        <Row label="Regen"       value={fmt(vehicle?.regenWatts, 0)} unit="W" />
        <Row label="Motor temp"  value={cToF(vehicle?.motorTempC)} unit="°F"
          warn={(vehicle?.motorTempC ?? 0) > 85} crit={(vehicle?.motorTempC ?? 0) > 95} />
        <Row label="Ctrl temp"   value={cToF(vehicle?.controllerTempC)} unit="°F"
          warn={(vehicle?.controllerTempC ?? 0) > 75} crit={(vehicle?.controllerTempC ?? 0) > 85} />
        <Row label="Pack temp"   value={cToF(vehicle?.packTempC)} unit="°F" />
      </Section>

      {/* 3. GPS — always shown, critical for position/navigation */}
      <Section title="GPS" status={
        vehicle?.gpsLat && vehicle?.gpsLng
          ? <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /><span className="text-[9px] font-semibold text-emerald-400">Fix</span></span>
          : <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /><span className="text-[9px] font-semibold text-red-400">No fix</span></span>
      }>
        <Row label="Latitude"   value={fmt(vehicle?.gpsLat, 5)} />
        <Row label="Longitude"  value={fmt(vehicle?.gpsLng, 5)} />
        <Row label="Elevation"  value={fmt(vehicle?.gpsElevationFt, 0)} unit="ft" />
        <Row label="GPS speed"  value={fmt(vehicle?.gpsSpeedMph, 1)}    unit="mph" />
        <Row label="Heading"    value={fmt(vehicle?.gpsHeadingDeg, 0)}  unit="°" />
        <Row label="Accuracy"   value={fmt(vehicle?.gpsAccuracyM, 1)}   unit="m"
          highlight={(vehicle?.gpsAccuracyM ?? 0) > 10 ? 'warn' : vehicle?.gpsAccuracyM != null ? 'good' : undefined} />
        <Row label="Satellites" value={fmt(vehicle?.gpsSatellites, 0)}
          highlight={(vehicle?.gpsSatellites ?? 0) < 4 && vehicle?.gpsSatellites != null ? 'warn' : undefined} />
        <Row label="Fix type"   value={vehicle?.gpsFixType ?? null} />
      </Section>

      {/* 4. MPPT / Solar */}
      <Section title="Solar / MPPT" status={<NodeStatus ageMs={mpptAgeMs ?? null} />}>
        <Row label="PV power"    value={fmt(mppt?.mpptPvPowerWatts, 0)} unit="W"
          highlight={(mppt?.mpptPvPowerWatts ?? 0) > 1400 ? 'good' : (mppt?.mpptPvPowerWatts ?? 0) > 0 && (mppt?.mpptPvPowerWatts ?? 0) < 800 ? 'warn' : undefined} />
        <Row label="PV voltage"  value={fmt(mppt?.mpptPvVoltage, 1)} unit="V" />
        <Row label="PV current"  value={fmt(mppt?.mpptPvCurrent, 1)} unit="A" />
        <Row label="Chg power"   value={fmt(mppt?.mpptChargePowerWatts, 0)} unit="W" />
        <Row label="Chg current" value={fmt(mppt?.mpptChargeCurrent, 1)} unit="A" />
        <Row label="Daily Wh"    value={fmt(mppt?.mpptDailyEnergyWh, 0)} unit="Wh" />
        <Row label="State"       value={mppt?.mpptChargeState ?? null} />
        {mppt?.mpptFault && <Row label="Fault" value={mppt.mpptFault} highlight="crit" />}
      </Section>

    </div>
  )
}

function cToF(c: number | null | undefined): string | null {
  if (c == null || !Number.isFinite(c)) return null
  return ((c * 9 / 5) + 32).toFixed(0)
}

function fmt(value: number | string | null | undefined, decimals?: number): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (!Number.isFinite(value)) return null
  return decimals !== undefined ? value.toFixed(decimals) : String(value)
}

function Section({ title, children, status }: { title: string; children: React.ReactNode; status?: React.ReactNode }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.04] overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.03] px-2.5 py-1 flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
        {status}
      </div>
      <div className="grid grid-cols-3 divide-x divide-y divide-white/[0.05]">{children}</div>
    </div>
  )
}

function Row({ label, value, unit, sub, warn, crit, highlight }: {
  label: string; value: string | null; unit?: string; sub?: string
  warn?: boolean; crit?: boolean; highlight?: 'good' | 'warn' | 'crit'
}) {
  const textColor =
    crit || highlight === 'crit' ? 'text-red-400'
    : warn || highlight === 'warn' ? 'text-orange-400'
    : highlight === 'good' ? 'text-emerald-400'
    : 'text-white'

  return (
    <div className="px-2 py-1.5">
      <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500 leading-none">{label}</p>
      <p className={`mt-0.5 text-xs font-semibold leading-none ${textColor}`}>
        {value ?? '—'}{unit && value ? <span className="text-[9px] text-slate-500"> {unit}</span> : null}
      </p>
      {sub && <p className="text-[9px] text-slate-600 leading-none mt-0.5">{sub}</p>}
    </div>
  )
}
