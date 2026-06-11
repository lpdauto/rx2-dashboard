type Props = {
  label: string
  value: string | number | null
  unit?: string
  sub?: string
  color?: 'default' | 'green' | 'yellow' | 'orange' | 'red' | 'amber'
  large?: boolean
}

const colorMap = {
  default: 'text-white',
  green:   'text-emerald-400',
  yellow:  'text-yellow-300',
  amber:   'text-amber-400',
  orange:  'text-orange-400',
  red:     'text-red-400',
}

export function MetricCard({ label, value, unit, sub, color = 'default', large }: Props) {
  const displayValue = value === null || value === undefined ? '—' : value

  return (
    <div className="flex flex-col rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 font-black leading-none ${large ? 'text-5xl' : 'text-3xl'} ${colorMap[color]}`}>
        {displayValue}
        {unit && <span className="ml-1 text-base font-medium text-slate-400">{unit}</span>}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}
