'use client'

type Props = {
  socPercent: number
  label: string
  sub?: string
}

export function SocGauge({ socPercent, label, sub }: Props) {
  const clamped = Math.max(0, Math.min(100, socPercent))
  const color =
    clamped > 60 ? '#10b981'
    : clamped > 30 ? '#f59e0b'
    : clamped > 15 ? '#f97316'
    : '#ef4444'

  const r = 34
  const stroke = 7
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - clamped / 100)
  const size = (r + stroke) * 2 + 2

  return (
    <div className="flex flex-col items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 leading-none mb-1.5">{label}</p>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
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
