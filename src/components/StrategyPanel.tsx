'use client'

import type { StrategyResult } from '@/lib/strategy'

const modeStyle: Record<string, { bg: string; text: string; border: string }> = {
  Conserve: { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30' },
  Normal:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Attack:   { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/30' },
  Endgame:  { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
}

type Props = {
  strategy: StrategyResult
}

export function StrategyPanel({ strategy: s }: Props) {
  const mode = modeStyle[s.raceMode] ?? modeStyle.Normal

  return (
    <div className="flex flex-col gap-4">
      {/* Alerts */}
      {s.alerts.length > 0 && (
        <div className="flex flex-col gap-1">
          {s.alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300"
            >
              <span className="text-red-400">▲</span>
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Recommended speed — big card */}
      <div className={`rounded-xl border ${mode.border} ${mode.bg} p-5`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recommended Speed</p>
            <p className={`mt-1 text-7xl font-black leading-none ${mode.text}`}>
              {s.recommendedSpeedMph}
            </p>
            <p className="mt-1 text-base font-medium text-slate-400">mph</p>
          </div>
          <div className="text-right">
            <span className={`inline-block rounded border ${mode.border} ${mode.bg} px-3 py-1 text-sm font-bold uppercase tracking-wide ${mode.text}`}>
              {s.raceMode}
            </span>
            <p className="mt-3 text-xs text-slate-400">Break-even</p>
            <p className="text-sm font-bold text-white">{s.currentBreakEvenMph} mph</p>
          </div>
        </div>

        <p className="mt-4 rounded-md bg-black/20 px-3 py-2 text-sm text-slate-200 leading-6">
          <span className="font-bold text-white">Driver:</span> {s.driverInstruction}
        </p>
        <p className="mt-2 rounded-md bg-black/20 px-3 py-2 text-sm text-slate-200 leading-6">
          <span className="font-bold text-white">Chase:</span> {s.chaseInstruction}
        </p>
      </div>

      {/* Projections grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Proj. finish SoC"
          value={`${Math.round(s.projectedFinishSocPercent)}%`}
          color={s.projectedFinishSocPercent < 15 ? 'text-red-400' : s.projectedFinishSocPercent < 30 ? 'text-orange-400' : 'text-emerald-400'}
        />
        <Stat
          label="Est. finish time"
          value={s.estimatedFinishTime ? `${s.estimatedFinishTime} CDT` : '—'}
        />
        <Stat
          label="Time buffer"
          value={s.timeBufferHours !== null ? `${s.timeBufferHours >= 0 ? '+' : ''}${s.timeBufferHours.toFixed(1)}h` : '—'}
          color={s.timeBufferHours !== null && s.timeBufferHours < 0 ? 'text-red-400' : s.timeBufferHours !== null && s.timeBufferHours > 2 ? 'text-emerald-400' : 'text-white'}
        />
        <Stat
          label="Range on pack"
          value={s.projectedMilesOnPack === Infinity ? '∞' : `${Math.round(s.projectedMilesOnPack)} mi`}
        />
      </div>

      {/* Swap advice */}
      {s.swapRecommended && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3">
          <p className="text-sm font-bold text-amber-300">Battery Swap Recommended</p>
          <p className="text-xs text-slate-300 mt-0.5">{s.swapReason}</p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
