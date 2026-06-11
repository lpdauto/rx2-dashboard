type Props = {
  label: string
  value: string | number | null
  unit?: string
  sub?: string
  color?: 'default' | 'green' | 'yellow' | 'amber' | 'orange' | 'red'
}

const colorMap = {
  default: 'text-white',
  green:   'text-emerald-400',
  yellow:  'text-yellow-300',
  amber:   'text-amber-400',
  orange:  'text-orange-400',
  red:     'text-red-400',
}

export function MetricCard({ label, value, unit, sub, color = 'default' }: Props) {
  const display = value === null || value === undefined ? '—' : value

  return (
    <div className="flex flex-col rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 leading-none">{label}</p>
      <p className={`mt-1 text-2xl font-black leading-none ${colorMap[color]}`}>
        {display}
        {unit && display !== '—' && <span className="ml-0.5 text-xs font-medium text-slate-400"> {unit}</span>}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-500 leading-none">{sub}</p>}
    </div>
  )
}
