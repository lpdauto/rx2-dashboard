'use client'

import type { VehiclePacket, MpptPacket } from '@/types/telemetry'
import { motorRpm, aeroPowerW, rollingPowerW } from '@/lib/physics'

type Props = {
  vehicle: VehiclePacket | null
  mppt: MpptPacket | null
  liveWhPerMile: number | null
  modelWhPerMileAtCurrentSpeed: number
  netWhPerMile: number
}

export function TelemetryGrid({ vehicle, mppt, liveWhPerMile, modelWhPerMileAtCurrentSpeed, netWhPerMile }: Props) {
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
      <Section title="Vehicle">
        <Row label="Speed"       value={fmt(vehicle?.speedMph, 1)} unit="mph" />
        <Row label="Pack SoC"    value={fmt(vehicle?.packSoc, 0)} unit="%" />
        <Row label="Pack V"      value={fmt(vehicle?.packVoltage, 1)} unit="V" />
        <Row label="Pack A"      value={fmt(vehicle?.packCurrent, 1)} unit="A" />
        <Row label="Batt. draw"  value={vehicle?.packVoltage && vehicle?.packCurrent ? fmt(vehicle.packVoltage * vehicle.packCurrent, 0) : null} unit="W" />
        <Row label="Motor RPM"   value={fmt(vehicle?.motorRpm, 0)} unit="rpm"
          sub={expectedRpm ? `mdl ${Math.round(expectedRpm)}` : undefined} />
        <Row label="Throttle"    value={fmt(vehicle?.throttlePercent, 0)} unit="%" />
        <Row label="Regen"       value={fmt(vehicle?.regenWatts, 0)} unit="W" />
        <Row label="Motor °C"    value={fmt(vehicle?.motorTempC, 0)} unit="°C"
          warn={(vehicle?.motorTempC ?? 0) > 85} crit={(vehicle?.motorTempC ?? 0) > 95} />
        <Row label="Ctrl °C"     value={fmt(vehicle?.controllerTempC, 0)} unit="°C"
          warn={(vehicle?.controllerTempC ?? 0) > 75} crit={(vehicle?.controllerTempC ?? 0) > 85} />
        <Row label="Pack °C"     value={fmt(vehicle?.packTempC, 0)} unit="°C" />
      </Section>

      {/* 3. MPPT / Solar */}
      <Section title="Solar / MPPT">
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

      {/* GPS — only if available */}
      {(vehicle?.gpsLat || vehicle?.gpsLng) && (
        <Section title="GPS">
          <Row label="Lat"  value={fmt(vehicle?.gpsLat, 4)} />
          <Row label="Lng"  value={fmt(vehicle?.gpsLng, 4)} />
          <Row label="Elev" value={fmt(vehicle?.gpsElevationFt, 0)} unit="ft" />
        </Section>
      )}
    </div>
  )
}

function fmt(value: number | string | null | undefined, decimals?: number): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (!Number.isFinite(value)) return null
  return decimals !== undefined ? value.toFixed(decimals) : String(value)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.04] overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.03] px-2.5 py-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
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
