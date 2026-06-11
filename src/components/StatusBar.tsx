'use client'

import type { ConnectionStatus } from '@/types/telemetry'
import { isRaceWindow, hoursRemainingInRace, RACE_DAYS } from '@/data/race'

type Props = {
  connectionStatus: ConnectionStatus
  vehicleAgeMs: number | null
  lastUpdated: number | null
  selectedDay: number
  onDayChange: (day: number) => void
}

export function StatusBar({ connectionStatus, vehicleAgeMs, lastUpdated, selectedDay, onDayChange }: Props) {
  const raceActive = isRaceWindow()
  const hoursLeft = hoursRemainingInRace()
  const h = Math.floor(hoursLeft)
  const m = Math.floor((hoursLeft - h) * 60)
  const timeLabel = raceActive
    ? `${h}h ${m}m remaining`
    : hoursLeft <= 0
    ? 'Race window closed'
    : 'Pre-race'

  const statusColor: Record<ConnectionStatus, string> = {
    connecting: 'bg-yellow-400',
    live:       'bg-emerald-400',
    stale:      'bg-orange-400',
    offline:    'bg-red-500',
  }

  const statusLabel: Record<ConnectionStatus, string> = {
    connecting: 'Connecting',
    live:       'Live',
    stale:      vehicleAgeMs ? `${Math.round(vehicleAgeMs / 1000)}s ago` : 'Stale',
    offline:    'Offline',
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
      {/* Left: connection */}
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${statusColor[connectionStatus]} ${connectionStatus === 'live' ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium text-white">{statusLabel[connectionStatus]}</span>
        {lastUpdated && (
          <span className="text-xs text-slate-500">
            · {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Center: day selector */}
      <div className="flex items-center gap-1">
        {RACE_DAYS.map((d) => (
          <button
            key={d.day}
            onClick={() => onDayChange(d.day)}
            className={`rounded px-3 py-1 text-xs font-bold transition ${
              selectedDay === d.day
                ? 'bg-amber-400 text-black'
                : 'border border-white/10 text-slate-400 hover:border-amber-400/40 hover:text-white'
            }`}
          >
            Day {d.day}
          </button>
        ))}
      </div>

      {/* Right: race window */}
      <div className="flex items-center gap-2">
        <span className={`rounded px-2 py-1 text-xs font-bold ${raceActive ? 'bg-emerald-900/40 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
          {raceActive ? '● RACE ON' : '○ RACE OFF'}
        </span>
        <span className="text-xs text-slate-400">{timeLabel}</span>
      </div>
    </div>
  )
}
