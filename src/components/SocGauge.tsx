'use client'

type Props = {
  socPercent: number
  label: string
  sub?: string
  compact?: boolean
}

export function SocGauge({ socPercent, label, sub, compact }: Props) {
  const clamped = Math.max(0, Math.min(100, socPercent))

  const color =
    clamped > 60 ? '#10b981'   // emerald
    : clamped > 30 ? '#f59e0b' // amber
    : clamped > 15 ? '#f97316' // orange
    : '#ef4444'                // red

  const radius = compact ? 36 : 52
  const stroke = compact ? 8 : 10
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clamped / 100)
  const size = (radius + stroke) * 2 + 4

  return (
    <div className="flex flex-col items-center rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white leading-none">{Math.round(clamped)}</span>
          <span className="text-xs text-slate-400">%</span>
        </div>
      </div>
      {sub && <p className="mt-2 text-xs text-slate-500 text-center">{sub}</p>}
    </div>
  )
}
