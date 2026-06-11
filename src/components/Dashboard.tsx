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
import { hoursRemainingInRace, getRaceDay } from '@/data/race'
import { StatusBar } from '@/components/StatusBar'
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

export function Dashboard() {
  const [vehicle, setVehicle] = useState<VehiclePacket | null>(null)
  const [mppt, setMppt] = useState<MpptPacket | null>(null)
  const [spare, setSpare] = useState<MpptPacket | null>(null)
  const [vehicleAgeMs, setVehicleAgeMs] = useState<number | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [selectedDay, setSelectedDay] = useState(1)
  const [milesCompleted, setMilesCompleted] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/telemetry', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ApiResponse = await res.json()

      if (data.error) {
        setConnectionStatus('offline')
        return
      }

      setVehicle(data.vehicle)
      setMppt(data.mppt)
      setSpare(data.spare)
      setVehicleAgeMs(data.vehicleAgeMs)
      setLastUpdated(data.fetchedAt)

      const age = data.vehicleAgeMs ?? Infinity
      setConnectionStatus(
        age < STALE_THRESHOLD_MS ? 'live'
        : age < 60000 ? 'stale'
        : 'offline'
      )
    } catch {
      setConnectionStatus('offline')
    }
  }, [])

  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [poll])

  // Track miles completed from odometer or distance
  useEffect(() => {
    const miles = vehicle?.odometerMiles ?? vehicle?.distanceMiles ?? 0
    if (miles > 0) setMilesCompleted(miles)
  }, [vehicle])

  // Derived values
  const speed = vehicle?.speedMph ?? 0
  const packSoc = vehicle?.packSoc ?? 0
  const packVoltage = vehicle?.packVoltage ?? 0
  const packCurrent = vehicle?.packCurrent ?? 0
  const batteryPowerW = packVoltage * packCurrent
  const solarW = mppt?.mpptPvPowerWatts ?? mppt?.mpptChargePowerWatts ?? 0
  const spareSoc = spare?.spareSocPercent ?? mppt?.spareSocPercent ?? null
  const motorTemp = vehicle?.motorTempC
  const controllerTemp = vehicle?.controllerTempC

  const raceDay = getRaceDay(selectedDay)
  const totalMiles = raceDay?.miles ?? 153.6
  const milesRemaining = Math.max(0, totalMiles - milesCompleted)
  const hoursLeft = hoursRemainingInRace()

  const livWpm = calcLiveWhPerMile(batteryPowerW, speed)
  const modelWpm = modelWhPerMile(speed)
  const netWpm = netWhPerMile(speed, solarW > 10 ? solarW : SOLAR_ROLLING_W)

  const strategy = computeStrategy({
    driveSocPercent: packSoc,
    spareSocPercent: spareSoc,
    speedMph: speed,
    solarPowerW: solarW,
    milesRemaining,
    milesCompleted,
    motorTempC: motorTemp,
    controllerTempC: controllerTemp,
    hoursRemainingInWindow: hoursLeft,
    isFinalDay: selectedDay === 5,
  })

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-[#050505] p-4 text-slate-100 sm:p-5">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">RX2 · 2026 Solar Race</p>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Race Dashboard</h1>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>Fort Worth → Fort Stockton</p>
          <p>July 19–23, 2026</p>
        </div>
      </header>

      {/* Status bar */}
      <StatusBar
        connectionStatus={connectionStatus}
        vehicleAgeMs={vehicleAgeMs}
        lastUpdated={lastUpdated}
        selectedDay={selectedDay}
        onDayChange={setSelectedDay}
      />

      {/* Top metrics row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Speed"
          value={speed > 0 ? speed.toFixed(1) : '—'}
          unit="mph"
          sub={`target ${strategy.recommendedSpeedMph} mph`}
          color={speed > 0 && Math.abs(speed - strategy.recommendedSpeedMph) > 5 ? 'orange' : 'default'}
          large
        />
        <MetricCard
          label="Solar power"
          value={solarW > 0 ? Math.round(solarW) : '—'}
          unit="W"
          sub={`break-even ${strategy.currentBreakEvenMph} mph`}
          color={solarW > 1400 ? 'green' : solarW > 800 ? 'yellow' : 'orange'}
          large
        />
        <MetricCard
          label="Live Wh/mi"
          value={livWpm !== null ? livWpm.toFixed(1) : '—'}
          unit="Wh/mi"
          sub={`model ${modelWpm.toFixed(1)}`}
          color={livWpm !== null && livWpm > modelWpm * 1.15 ? 'orange' : 'default'}
          large
        />
        <MetricCard
          label="Net Wh/mi"
          value={netWpm.toFixed(1)}
          unit="Wh/mi"
          sub={netWpm < 0 ? '↑ charging' : '↓ draining'}
          color={netWpm < 0 ? 'green' : netWpm < 10 ? 'yellow' : netWpm < 20 ? 'orange' : 'red'}
          large
        />
      </div>

      {/* Main content: strategy + SoC left, telemetry right */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <StrategyPanel strategy={strategy} />

          {/* SoC gauges */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SocGauge
              socPercent={packSoc}
              label="Drive Pack"
              sub={`${(packSoc / 100 * 4000 / 1000).toFixed(1)} kWh avail.`}
            />
            {spareSoc !== null && (
              <SocGauge
                socPercent={spareSoc}
                label="Spare Pack"
                sub="on trailer"
              />
            )}
            <div className="flex flex-col gap-3">
              <MetricCard
                label="Miles remaining"
                value={milesRemaining.toFixed(1)}
                unit="mi"
                sub={`of ${totalMiles} today`}
              />
              <MetricCard
                label="Miles done"
                value={milesCompleted.toFixed(1)}
                unit="mi"
              />
            </div>
          </div>

          {/* Course map */}
          <CourseMap
            selectedDay={selectedDay}
            currentLat={vehicle?.gpsLat}
            currentLng={vehicle?.gpsLng}
            milesCompleted={milesCompleted}
          />
        </div>

        {/* Right column: detailed telemetry */}
        <TelemetryGrid
          vehicle={vehicle}
          mppt={mppt}
          liveWhPerMile={livWpm}
          modelWhPerMileAtCurrentSpeed={modelWpm}
          netWhPerMile={netWpm}
        />
      </div>

      <footer className="text-center text-xs text-slate-700 pb-2">
        Polls every 2s · Physics model: Cd {0.20} A {1.35}m² η {0.72} Crr {0.008} m {300}kg
      </footer>
    </div>
  )
}
