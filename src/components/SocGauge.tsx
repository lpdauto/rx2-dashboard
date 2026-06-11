'use client'

type Props = {
  socPercent: number
  label: string
  sub?: string
  mini?: boolean   // compact inline version for desktop row
}

function socColor(v: number) {
  if (v > 60) return '#10b981'
  if (v > 30) return '#f59e0b'
  if (v > 15) return '#f97316'
  return '#ef4444'
}

export function SocGauge({ socPercent, label, sub, mini }: Props) {
  const clamped = Math.max(0, Math.min(100, socPercent))
  const color = socColor(clamped)

  const r      = mini ? 22 : 34
  const stroke = mini ? 5  : 7
  const circ   = 2 * Math.PI * r
  const offset = circ * (1 - clamped / 100)
  const size   = (r + stroke) * 2 + 2

  if (mini) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex-none" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
            <circle cx={size/2} cy={size/2} r={r} fill="none"
              stroke={color} strokeWidth={stroke}
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-black leading-none" style={{ color }}>{Math.round(clamped)}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 leading-none">{label}</p>
          <p className="text-[10px] text-slate-400 leading-none mt-0.5">{sub}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 leading-none mb-1.5">{label}</p>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-white leading-none">{Math.round(clamped)}</span>
          <span className="text-[9px] text-slate-400">%</span>
        </div>
      </div>
      {sub && <p className="mt-1 text-[10px] text-slate-500 text-center leading-tight">{sub}</p>}
    </div>
  )
}
