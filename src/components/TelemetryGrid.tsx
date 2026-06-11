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
    <div className="flex flex-col gap-4">
      {/* Vehicle */}
      <Section title="Vehicle">
        <Row label="Speed" value={fmt(vehicle?.speedMph, 1)} unit="mph" />
        <Row label="Pack SoC" value={fmt(vehicle?.packSoc, 0)} unit="%" />
        <Row label="Pack voltage" value={fmt(vehicle?.packVoltage, 1)} unit="V" />
        <Row label="Pack current" value={fmt(vehicle?.packCurrent, 1)} unit="A" />
        <Row
          label="Battery draw"
          value={vehicle?.packVoltage && vehicle?.packCurrent
            ? fmt(vehicle.packVoltage * vehicle.packCurrent, 0)
            : null}
          unit="W"
        />
        <Row label="Motor RPM" value={fmt(vehicle?.motorRpm, 0)} unit="rpm"
          sub={expectedRpm ? `model ${Math.round(expectedRpm)}` : undefined} />
        <Row label="Throttle" value={fmt(vehicle?.throttlePercent, 0)} unit="%" />
        <Row label="Regen" value={fmt(vehicle?.regenWatts, 0)} unit="W" />
        <Row label="Motor temp" value={fmt(vehicle?.motorTempC, 0)} unit="°C"
          warn={(vehicle?.motorTempC ?? 0) > 85} crit={(vehicle?.motorTempC ?? 0) > 95} />
        <Row label="Controller temp" value={fmt(vehicle?.controllerTempC, 0)} unit="°C"
          warn={(vehicle?.controllerTempC ?? 0) > 75} crit={(vehicle?.controllerTempC ?? 0) > 85} />
        <Row label="Pack temp" value={fmt(vehicle?.packTempC, 0)} unit="°C" />
      </Section>

      {/* Efficiency */}
      <Section title="Efficiency">
        <Row
          label="Live Wh/mi"
          value={liveWhPerMile !== null ? fmt(liveWhPerMile, 1) : null}
          unit="Wh/mi"
          sub={`model ${modelWhPerMileAtCurrentSpeed.toFixed(1)}`}
          highlight={liveWhPerMile !== null && liveWhPerMile > modelWhPerMileAtCurrentSpeed * 1.15
            ? 'warn' : undefined}
        />
        <Row
          label="Net Wh/mi"
          value={fmt(netWhPerMile, 1)}
          unit="Wh/mi"
          sub={netWhPerMile < 0 ? 'charging pack' : 'draining pack'}
          highlight={netWhPerMile < 0 ? 'good' : netWhPerMile > 15 ? 'warn' : undefined}
        />
        <Row label="Aero drag" value={aeroW ? fmt(aeroW, 0) : null} unit="W" />
        <Row label="Rolling resist." value={rollW ? fmt(rollW, 0) : null} unit="W" />
        <Row label="Odometer" value={fmt(vehicle?.odometerMiles, 1)} unit="mi" />
      </Section>

      {/* Solar / MPPT */}
      <Section title="Solar / MPPT">
        <Row label="PV voltage" value={fmt(mppt?.mpptPvVoltage, 1)} unit="V" />
        <Row label="PV current" value={fmt(mppt?.mpptPvCurrent, 1)} unit="A" />
        <Row label="PV power" value={fmt(mppt?.mpptPvPowerWatts, 0)} unit="W" highlight={
          (mppt?.mpptPvPowerWatts ?? 0) > 1400 ? 'good' : (mppt?.mpptPvPowerWatts ?? 0) > 800 ? undefined : 'warn'
        } />
        <Row label="Charge current" value={fmt(mppt?.mpptChargeCurrent, 1)} unit="A" />
        <Row label="Charge power" value={fmt(mppt?.mpptChargePowerWatts, 0)} unit="W" />
        <Row label="Daily yield" value={fmt(mppt?.mpptDailyEnergyWh, 0)} unit="Wh" />
        <Row label="MPPT state" value={mppt?.mpptChargeState ?? null} />
        {mppt?.mpptFault && (
          <Row label="MPPT fault" value={mppt.mpptFault} highlight="crit" />
        )}
      </Section>

      {/* GPS */}
      {(vehicle?.gpsLat || vehicle?.gpsLng) && (
        <Section title="GPS">
          <Row label="Lat" value={fmt(vehicle?.gpsLat, 4)} />
          <Row label="Lng" value={fmt(vehicle?.gpsLng, 4)} />
          <Row label="Elevation" value={fmt(vehicle?.gpsElevationFt, 0)} unit="ft" />
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
    <div className="rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-2">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.06] sm:grid-cols-3">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  unit,
  sub,
  warn,
  crit,
  highlight,
}: {
  label: string
  value: string | null
  unit?: string
  sub?: string
  warn?: boolean
  crit?: boolean
  highlight?: 'good' | 'warn' | 'crit'
}) {
  const textColor =
    crit || highlight === 'crit' ? 'text-red-400'
    : warn || highlight === 'warn' ? 'text-orange-400'
    : highlight === 'good' ? 'text-emerald-400'
    : 'text-white'

  return (
    <div className="flex flex-col p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 font-semibold ${textColor}`}>
        {value ?? '—'}{unit && value ? <span className="ml-0.5 text-xs text-slate-400"> {unit}</span> : null}
      </p>
      {sub && <p className="text-[10px] text-slate-600">{sub}</p>}
    </div>
  )
}
