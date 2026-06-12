'use client'

import type { StrategyResult } from '@/lib/strategy'

const modeStyle: Record<string, { bg: string; text: string; border: string }> = {
  Conserve: { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/30' },
  Normal:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Attack:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30' },
  Endgame:  { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/30' },
}

export function StrategyPanel({ strategy: s }: { strategy: StrategyResult }) {
  const mode = modeStyle[s.raceMode] ?? modeStyle.Normal

  return (
    <div className="flex flex-col gap-2">
      {/* Alerts — compact single line each */}
      {s.alerts.length > 0 && (
        <div className="flex flex-col gap-1">
          {s.alerts.map((alert, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-300">
              <span className="text-red-400 text-[10px]">▲</span>{alert}
            </div>
          ))}
        </div>
      )}

      {/* Speed + instructions: horizontal on wide screens */}
      <div className={`rounded-xl border ${mode.border} ${mode.bg} p-3`}>
        <div className="flex items-start gap-3">
          {/* Speed number */}
          <div className="flex-none">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 leading-none">Rec. Speed</p>
            <p className={`text-5xl font-black leading-none mt-0.5 ${mode.text}`}>{s.recommendedSpeedMph}</p>
            <p className="text-xs font-medium text-slate-400 mt-0.5">mph</p>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-white/10 flex-none" />

          {/* Mode + instructions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className={`inline-block rounded border ${mode.border} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${mode.text}`}>
                {s.raceMode}
              </span>
              <span className="text-[10px] text-slate-500">Break-even {s.currentBreakEvenMph} mph</span>
            </div>
            <p className="text-xs text-slate-200 leading-snug">
              <span className="font-bold text-white">Driver:</span> {s.driverInstruction}
            </p>
            <p className="text-xs text-slate-200 leading-snug mt-1">
              <span className="font-bold text-white">Chase:</span> {s.chaseInstruction}
            </p>
          </div>
        </div>
      </div>

      {/* Projections row */}
      <div className="grid grid-cols-4 gap-2">
        <Stat
          label="Fin. SoC"
          value={`${Math.round(s.projectedFinishSocPercent)}%`}
          color={s.projectedFinishSocPercent < 15 ? 'text-red-400' : s.projectedFinishSocPercent < 30 ? 'text-orange-400' : 'text-emerald-400'}
        />
        <Stat label="Finish" value={s.estimatedFinishTime ? `${s.estimatedFinishTime}` : '—'} sub="CDT" />
        <Stat
          label="Buffer"
          value={s.timeBufferHours !== null ? `${s.timeBufferHours >= 0 ? '+' : ''}${s.timeBufferHours.toFixed(1)}h` : '—'}
          color={s.timeBufferHours !== null && s.timeBufferHours < 0 ? 'text-red-400' : s.timeBufferHours !== null && s.timeBufferHours > 2 ? 'text-emerald-400' : 'text-white'}
        />
        <Stat
          label="Range"
          value={s.projectedMilesOnPack === Infinity ? '∞ mi' : `${Math.round(s.projectedMilesOnPack)} mi`}
        />
      </div>

      {/* Swap alert */}
      {s.swapRecommended && (
        <div className="rounded border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-xs font-bold text-amber-300">
          ⚡ Swap recommended — {s.swapReason}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.04] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 leading-none">{label}</p>
      <p className={`mt-1 text-lg font-bold leading-none ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 leading-none mt-0.5">{sub}</p>}
    </div>
  )
}
