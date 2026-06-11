'use client'

import { RACE_WAYPOINTS, RACE_DAYS } from '@/data/race'

type Props = {
  selectedDay: number
  currentLat?: number | null
  currentLng?: number | null
  milesCompleted?: number
}

// Map bounding box: TX race corridor
const BOUNDS = {
  minLat: 30.1,
  maxLat: 33.0,
  minLng: -103.5,
  maxLng: -95.0,
}

function project(lat: number, lng: number, w: number, h: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * w
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * h
  return { x, y }
}

export function CourseMap({ selectedDay, currentLat, currentLng, milesCompleted }: Props) {
  const W = 700
  const H = 320

  const points = RACE_WAYPOINTS.map((wp) => ({
    ...wp,
    ...project(wp.lat, wp.lng, W, H),
  }))

  const polyline = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Completed segments
  const completedTo = selectedDay
  const completedLine = points
    .filter((p) => p.day <= completedTo)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  // Current position from GPS
  const gpsPos = currentLat && currentLng ? project(currentLat, currentLng, W, H) : null

  // Day info
  const dayInfo = RACE_DAYS.find((d) => d.day === selectedDay)

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.03] flex items-center justify-between px-4 py-2">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Race Course</p>
        {dayInfo && (
          <p className="text-xs text-slate-400">
            Day {selectedDay}: {dayInfo.from} → {dayInfo.to} · {dayInfo.miles} mi
            {milesCompleted !== undefined && (
              <span className="ml-2 text-amber-400 font-semibold">{milesCompleted.toFixed(1)} mi done</span>
            )}
          </p>
        )}
      </div>
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 240 }}
        >
          {/* Background */}
          <rect width={W} height={H} fill="#0a0a0a" />

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} y1={H * f} x2={W} y2={H * f} stroke="#1e293b" strokeWidth={0.5} />
          ))}

          {/* Full route (dim) */}
          <path d={polyline} fill="none" stroke="#334155" strokeWidth={2} strokeDasharray="6 4" />

          {/* Completed route */}
          {completedLine && (
            <path d={completedLine} fill="none" stroke="#f59e0b" strokeWidth={3} />
          )}

          {/* Waypoint dots */}
          {points.map((p) => {
            const isPast = p.day <= selectedDay
            const isCurrent = p.day === selectedDay
            return (
              <g key={p.name}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isCurrent ? 7 : 5}
                  fill={isPast ? '#f59e0b' : '#1e293b'}
                  stroke={isCurrent ? '#fff' : '#334155'}
                  strokeWidth={isCurrent ? 2 : 1}
                />
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  fontSize={9}
                  fill={isPast ? '#d1d5db' : '#4b5563'}
                  fontFamily="monospace"
                >
                  {p.name.split(',')[0].split(' ').slice(-1)[0]}
                </text>
              </g>
            )
          })}

          {/* GPS position */}
          {gpsPos && (
            <g>
              <circle cx={gpsPos.x} cy={gpsPos.y} r={10} fill="#f59e0b" opacity={0.2} />
              <circle cx={gpsPos.x} cy={gpsPos.y} r={5} fill="#f59e0b" />
              <circle cx={gpsPos.x} cy={gpsPos.y} r={5} fill="none" stroke="#fff" strokeWidth={1.5} />
            </g>
          )}

          {/* Day labels */}
          {RACE_DAYS.map((d) => {
            const from = points.find((p) => p.day === d.day - 1)
            const to = points.find((p) => p.day === d.day)
            if (!from || !to) return null
            const midX = (from.x + to.x) / 2
            const midY = (from.y + to.y) / 2 - 8
            return (
              <text
                key={d.day}
                x={midX}
                y={midY}
                textAnchor="middle"
                fontSize={8}
                fill={d.day === selectedDay ? '#f59e0b' : '#374151'}
                fontFamily="monospace"
                fontWeight={d.day === selectedDay ? 'bold' : 'normal'}
              >
                D{d.day}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
