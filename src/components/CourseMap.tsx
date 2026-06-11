'use client'

import { useEffect, useState } from 'react'
import { RACE_DAYS } from '@/data/race'

type Coord = [number, number]  // [lng, lat]

type RouteSegment = {
  day: number
  name: string
  type: 'driving' | 'trailer' | 'stop'
  coords: Coord[]  // for stops: single coord; for lines: polyline
}

type Props = {
  selectedDay: number
  currentLat?: number | null
  currentLng?: number | null
  milesCompleted?: number
}

// Map bounding box for the TX race corridor
const BOUNDS = { minLat: 29.8, maxLat: 33.2, minLng: -103.8, maxLng: -94.8 }

function project(lat: number, lng: number, w: number, h: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * w
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * h
  return { x, y }
}

function coordsToPath(coords: Coord[], w: number, h: number, step = 1): string {
  const pts = step > 1 ? coords.filter((_, i) => i % step === 0 || i === coords.length - 1) : coords
  return pts
    .map((c, i) => {
      const { x, y } = project(c[1], c[0], w, h)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function parseKml(xml: string): RouteSegment[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')
  const folders = doc.querySelectorAll('Folder')
  const segments: RouteSegment[] = []

  folders.forEach((folder) => {
    const folderName = folder.querySelector(':scope > name')?.textContent?.trim() ?? ''
    const dayMatch = folderName.match(/Day (\d+)/)
    if (!dayMatch) return
    const day = parseInt(dayMatch[1])
    const isStops = folderName.includes('Stops')

    folder.querySelectorAll('Placemark').forEach((pm) => {
      const name = pm.querySelector('name')?.textContent?.trim() ?? ''
      const coordText = pm.querySelector('coordinates')?.textContent?.trim()
      if (!coordText) return

      const coords: Coord[] = coordText
        .trim()
        .split(/\s+/)
        .map((c) => {
          const parts = c.split(',')
          return [parseFloat(parts[0]), parseFloat(parts[1])] as Coord
        })
        .filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]))

      if (coords.length === 0) return

      if (isStops) {
        segments.push({ day, name, type: 'stop', coords })
      } else {
        const type = name.toLowerCase().includes('trailer') ? 'trailer' : 'driving'
        segments.push({ day, name, type, coords })
      }
    })
  })

  return segments
}

export function CourseMap({ selectedDay, currentLat, currentLng, milesCompleted }: Props) {
  const [segments, setSegments] = useState<RouteSegment[]>([])
  const [kmlLoaded, setKmlLoaded] = useState(false)

  useEffect(() => {
    fetch('/race.kml')
      .then((r) => r.text())
      .then((xml) => {
        setSegments(parseKml(xml))
        setKmlLoaded(true)
      })
      .catch(() => setKmlLoaded(false))
  }, [])

  const W = 700
  const H = 360

  const dayInfo = RACE_DAYS.find((d) => d.day === selectedDay)

  // All segments for full route context (dim)
  const allDriving = segments.filter((s) => s.type === 'driving')
  const allTrailer = segments.filter((s) => s.type === 'trailer')

  // Selected day's segments
  const dayDriving = segments.filter((s) => s.day === selectedDay && s.type === 'driving')
  const dayTrailer = segments.filter((s) => s.day === selectedDay && s.type === 'trailer')
  const dayStops = segments.filter((s) => s.day === selectedDay && s.type === 'stop')

  // GPS position
  const gpsPos = currentLat && currentLng ? project(currentLat, currentLng, W, H) : null

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden">
      <div className="border-b border-white/10 bg-white/[0.03] flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Race Course</p>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          {dayInfo && (
            <span>
              Day {selectedDay}: {dayInfo.from} → {dayInfo.to} · {dayInfo.miles} mi
            </span>
          )}
          {milesCompleted !== undefined && milesCompleted > 0 && (
            <span className="font-semibold text-amber-400">{milesCompleted.toFixed(1)} mi done</span>
          )}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-amber-400 rounded" />Driving</span>
            <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-slate-500 rounded border-dashed" />Trailer</span>
          </div>
        </div>
      </div>

      <div className="relative w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }}>
          <rect width={W} height={H} fill="#0a0a0a" />

          {!kmlLoaded && (
            <text x={W / 2} y={H / 2} textAnchor="middle" fill="#475569" fontSize={12}>
              Loading route…
            </text>
          )}

          {/* All days — full route context (very dim) */}
          {allDriving.map((seg, i) => (
            <path
              key={`bg-d-${i}`}
              d={coordsToPath(seg.coords, W, H, 8)}
              fill="none"
              stroke="#1e293b"
              strokeWidth={1.5}
            />
          ))}
          {allTrailer.map((seg, i) => (
            <path
              key={`bg-t-${i}`}
              d={coordsToPath(seg.coords, W, H, 8)}
              fill="none"
              stroke="#1e293b"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ))}

          {/* Selected day — highlighted */}
          {dayTrailer.map((seg, i) => (
            <path
              key={`day-t-${i}`}
              d={coordsToPath(seg.coords, W, H, 4)}
              fill="none"
              stroke="#475569"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          ))}
          {dayDriving.map((seg, i) => (
            <path
              key={`day-d-${i}`}
              d={coordsToPath(seg.coords, W, H, 4)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={2.5}
            />
          ))}

          {/* Stop markers for selected day */}
          {dayStops.map((stop) => {
            const c = stop.coords[0]
            const p = project(c[1], c[0], W, H)
            return (
              <g key={stop.name}>
                <circle cx={p.x} cy={p.y} r={4} fill="#f59e0b" stroke="#0a0a0a" strokeWidth={1} />
                <text
                  x={p.x}
                  y={p.y - 7}
                  textAnchor="middle"
                  fontSize={7.5}
                  fill="#d1d5db"
                  fontFamily="sans-serif"
                >
                  {stop.name.split(' ').slice(0, 2).join(' ')}
                </text>
              </g>
            )
          })}

          {/* GPS dot */}
          {gpsPos && (
            <g>
              <circle cx={gpsPos.x} cy={gpsPos.y} r={10} fill="#f59e0b" opacity={0.15} />
              <circle cx={gpsPos.x} cy={gpsPos.y} r={5} fill="#f59e0b" />
              <circle cx={gpsPos.x} cy={gpsPos.y} r={5} fill="none" stroke="#fff" strokeWidth={1.5} />
            </g>
          )}

          {/* Day labels along route */}
          {kmlLoaded && RACE_DAYS.map((d) => {
            const segs = segments.filter((s) => s.day === d.day && s.type === 'driving')
            if (segs.length === 0) return null
            const midSeg = segs[Math.floor(segs.length / 2)]
            const midCoord = midSeg.coords[Math.floor(midSeg.coords.length / 2)]
            const p = project(midCoord[1], midCoord[0], W, H)
            const isSelected = d.day === selectedDay
            return (
              <text
                key={d.day}
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize={9}
                fontWeight={isSelected ? 'bold' : 'normal'}
                fill={isSelected ? '#f59e0b' : '#374151'}
                fontFamily="monospace"
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
