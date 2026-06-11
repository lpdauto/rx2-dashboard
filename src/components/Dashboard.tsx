'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { VehiclePacket, MpptPacket, ConnectionStatus } from '@/types/telemetry'
import { computeStrategy } from '@/lib/strategy'
import {
  modelWhPerMile,
  liveWhPerMile as calcLiveWhPerMile,
  netWhPerMile,
  SOLAR_ROLLING_W,
} from '@/lib/physics'
import { hoursRemainingInRace, getRaceDay, isRaceWindow, RACE_DAYS } from '@/data/race'
import { SocGauge } from '@/components/SocGauge'
import { MetricCard } from '@/components/MetricCard'
import { StrategyPanel } from '@/components/StrategyPanel'
import { TelemetryGrid } from '@/components/TelemetryGrid'
import { CourseMap } from '@/components/CourseMap'

const POLL_INTERVAL_MS = 2000
const STALE_THRESHOLD_MS = 15000

type ApiResponse = {
  vehicle: VehiclePacket | null
  mppt: MpptPacket | null
  spare: MpptPacket | null
  vehicleAgeMs: number | null
  mpptAgeMs: number | null
  fetchedAt: number
  error?: string
}

const statusDot: Record<ConnectionStatus, string> = {
  connecting: 'bg-yellow-400 animate-pulse',
  live:       'bg-emerald-400 animate-pulse',
  stale:      'bg-orange-400',
  offline:    'bg-red-500',
}
const statusLabel: Record<ConnectionStatus, string> = {
  connecting: 'Connecting',
  live:       'Live',
  stale:      'Stale',
  offline:    'Offline',
}

export function Dashboard() {
  const [vehicle, setVehicle] = useState<VehiclePacket | null>(null)
  const [mppt, setMppt]       = useState<MpptPacket | null>(null)
  const [spare, setSpare]     = useState<MpptPacket | null>(null)
  const [vehicleAgeMs, setVehicleAgeMs] = useState<number | null>(null)
  const [mpptAgeMs, setMpptAgeMs]       = useState<number | null>(null)
  const [lastUpdated, setLastUpdated]   = useState<number | null>(null)
  const [status, setStatus]   = useState<ConnectionStatus>('connecting')
  const [selectedDay, setSelectedDay]   = useState(1)
  const [milesCompleted, setMilesCompleted] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    try {
      const res  = await fetch('/api/telemetry', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data: ApiResponse = await res.json()
      if (data.error) { setStatus('offline'); return }
      setVehicle(data.vehicle)
      setMppt(data.mppt)
      setSpare(data.spare)
      setVehicleAgeMs(data.vehicleAgeMs)
      setMpptAgeMs(data.mpptAgeMs)
      setLastUpdated(data.fetchedAt)
      const age = data.vehicleAgeMs ?? Infinity
      setStatus(age < STALE_THRESHOLD_MS ? 'live' : age < 60000 ? 'stale' : 'offline')
    } catch { setStatus('offline') }
  }, [])

  useEffect(() => {
    poll()
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [poll])

  useEffect(() => {
    const m = vehicle?.odometerMiles ?? vehicle?.distanceMiles ?? 0
    if (m > 0) setMilesCompleted(m)
  }, [vehicle])

  // Derived values
  const speed      = vehicle?.speedMph ?? 0
  const packSoc    = vehicle?.packSoc ?? 0
  const packV      = vehicle?.packVoltage ?? 0
  const packA      = vehicle?.packCurrent ?? 0
  const battW      = packV * packA
  const solarW     = mppt?.mpptPvPowerWatts ?? mppt?.mpptChargePowerWatts ?? 0
  const spareSoc   = spare?.spareSocPercent ?? (mppt as any)?.spareSocPercent ?? null

  const raceDay      = getRaceDay(selectedDay)
  const totalMiles   = raceDay?.miles ?? 153.6
  const milesLeft    = Math.max(0, totalMiles - milesCompleted)
  const hoursLeft    = hoursRemainingInRace()
  const raceActive   = isRaceWindow()

  const livWpm   = calcLiveWhPerMile(battW, speed)
  const modelWpm = modelWhPerMile(speed)
  const netWpm   = netWhPerMile(speed, solarW > 10 ? solarW : SOLAR_ROLLING_W)

  const strategy = computeStrategy({
    driveSocPercent: packSoc,
    spareSocPercent: spareSoc,
    speedMph: speed,
    solarPowerW: solarW,
    milesRemaining: milesLeft,
    milesCompleted,
    motorTempC: vehicle?.motorTempC,
    controllerTempC: vehicle?.controllerTempC,
    hoursRemainingInWindow: hoursLeft,
    isFinalDay: selectedDay === 5,
  })

  const hoursH = Math.floor(hoursLeft)
  const hoursM = Math.floor((hoursLeft - hoursH) * 60)

  return (
    // Full-height flex column on desktop; natural scroll on mobile
    <div className="flex flex-col bg-[#050505] text-slate-100 xl:h-screen xl:overflow-hidden">

      {/* ── Top bar: header + status + day picker ─────────────────── */}
      <div className="flex-none flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 px-3 py-2">
        {/* Brand */}
        <div className="flex items-center gap-2 mr-auto">
          <span className="text-xs font-black uppercase tracking-widest text-amber-400">RX2</span>
          <span className="text-xs font-semibold text-slate-400">Race Dashboard</span>
        </div>

        {/* Day tabs */}
        <div className="flex items-center gap-1">
          {RACE_DAYS.map((d) => (
            <button
              key={d.day}
              onClick={() => setSelectedDay(d.day)}
              className={`rounded px-2.5 py-1 text-xs font-bold transition min-w-[2.5rem] ${
                selectedDay === d.day
                  ? 'bg-amber-400 text-black'
                  : 'border border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              D{d.day}
            </button>
          ))}
        </div>

        {/* Status + race window */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} />
            <span className="text-slate-300">{statusLabel[status]}</span>
            {lastUpdated && <span className="text-slate-600">{new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
          </span>
          <span className={`rounded px-1.5 py-0.5 font-bold ${raceActive ? 'bg-emerald-900/50 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
            {raceActive ? `${hoursH}h ${hoursM}m left` : 'Race off'}
          </span>
        </div>
      </div>

      {/* ── Metrics strip ─────────────────────────────────────────── */}
      <div className="flex-none grid grid-cols-2 gap-1.5 px-3 pt-2 sm:grid-cols-4">
        <MetricCard
          label="Speed"
          value={speed > 0 ? speed.toFixed(1) : '—'}
          unit="mph"
          sub={`target ${strategy.recommendedSpeedMph} mph`}
          color={speed > 0 && Math.abs(speed - strategy.recommendedSpeedMph) > 5 ? 'orange' : 'default'}
        />
        <MetricCard
          label="Solar"
          value={solarW > 0 ? Math.round(solarW) : '—'}
          unit="W"
          sub={`b/e ${strategy.currentBreakEvenMph} mph`}
          color={solarW > 1400 ? 'green' : solarW > 800 ? 'yellow' : solarW > 0 ? 'orange' : 'default'}
        />
        <MetricCard
          label="Live Wh/mi"
          value={livWpm !== null ? livWpm.toFixed(1) : '—'}
          unit="Wh/mi"
          sub={`model ${modelWpm.toFixed(1)}`}
          color={livWpm !== null && livWpm > modelWpm * 1.15 ? 'orange' : 'default'}
        />
        <MetricCard
          label="Net Wh/mi"
          value={Number.isFinite(netWpm) ? netWpm.toFixed(1) : '—'}
          unit="Wh/mi"
          sub={netWpm < 0 ? '↑ charging' : '↓ draining'}
          color={netWpm < 0 ? 'green' : netWpm < 10 ? 'yellow' : netWpm < 20 ? 'orange' : 'red'}
        />
      </div>

      {/* ── Main area ─────────────────────────────────────────────── */}
      {/* Desktop: left content | right telemetry (wider)           */}
      {/* Mobile: single column natural scroll                      */}
      <div className="flex-1 grid gap-2 px-3 pb-3 pt-2 overflow-hidden xl:grid-cols-[minmax(0,1fr)_420px]">

        {/* ── Left column ──────────────────────────────────────── */}
        <div className="flex flex-col gap-2 overflow-y-auto xl:overflow-hidden xl:grid xl:grid-rows-[auto_auto_1fr]">

          {/* Strategy */}
          <StrategyPanel strategy={strategy} />

          {/* Compact SoC + progress bar — single row on desktop */}
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
            {/* Drive pack */}
            <SocGauge
              socPercent={packSoc}
              label="Drive Pack"
              sub={`${(packSoc / 100 * 4).toFixed(1)} kWh`}
              mini
            />

            {/* Divider */}
            <div className="h-8 w-px bg-white/10 flex-none" />

            {/* Spare pack (if available) */}
            {spareSoc !== null && (
              <>
                <SocGauge socPercent={spareSoc} label="Spare Pack" sub="on trailer" mini />
                <div className="h-8 w-px bg-white/10 flex-none" />
              </>
            )}

            {/* Progress bar + miles */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Day {selectedDay} Progress</span>
                <span className="text-[10px] text-slate-400">{milesCompleted.toFixed(1)} / {totalMiles} mi</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, (milesCompleted / totalMiles) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-slate-600">0</span>
                <span className="text-xs font-bold text-white">{milesLeft.toFixed(1)} mi left</span>
                <span className="text-[9px] text-slate-600">{totalMiles}</span>
              </div>
            </div>
          </div>

          {/* Map — fills remaining vertical space */}
          <div className="min-h-[200px] xl:min-h-0 xl:flex-1">
            <CourseMap
              selectedDay={selectedDay}
              currentLat={vehicle?.gpsLat}
              currentLng={vehicle?.gpsLng}
              milesCompleted={milesCompleted}
            />
          </div>
        </div>

        {/* ── Right column — telemetry, wider, independently scrollable */}
        <div className="overflow-y-auto mt-2 xl:mt-0">
          <TelemetryGrid
            vehicle={vehicle}
            mppt={mppt}
            liveWhPerMile={livWpm}
            modelWhPerMileAtCurrentSpeed={modelWpm}
            netWhPerMile={netWpm}
            vehicleAgeMs={vehicleAgeMs}
            mpptAgeMs={mpptAgeMs}
          />
        </div>
      </div>
    </div>
  )
}
