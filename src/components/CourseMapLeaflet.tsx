'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet'
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { RACE_DAYS } from '@/data/race'

type Segment = {
  day: number
  name: string
  type: 'driving' | 'trailer' | 'stop'
  coords: LatLngTuple[]
}

function parseKml(xml: string): Segment[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')
  const segments: Segment[] = []

  doc.querySelectorAll('Folder').forEach((folder) => {
    const folderName = folder.querySelector(':scope > name')?.textContent?.trim() ?? ''
    const dayMatch = folderName.match(/Day (\d+)/)
    if (!dayMatch) return
    const day = parseInt(dayMatch[1])
    const isStops = folderName.includes('Stops')

    folder.querySelectorAll('Placemark').forEach((pm) => {
      const name = pm.querySelector('name')?.textContent?.trim() ?? ''
      const coordText = pm.querySelector('coordinates')?.textContent?.trim()
      if (!coordText) return

      const coords: LatLngTuple[] = coordText
        .trim()
        .split(/\s+/)
        .map((c) => {
          const [lng, lat] = c.split(',').map(parseFloat)
          return [lat, lng] as LatLngTuple
        })
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))

      if (coords.length === 0) return

      const type = isStops ? 'stop' : name.toLowerCase().includes('trailer') ? 'trailer' : 'driving'
      segments.push({ day, name, type, coords })
    })
  })

  return segments
}

function thin<T>(arr: T[], step: number): T[] {
  return arr.filter((_, i) => i % step === 0 || i === arr.length - 1)
}

function dayBounds(segments: Segment[], day: number): LatLngBoundsExpression | null {
  const pts = segments
    .filter((s) => s.day === day && s.type !== 'stop')
    .flatMap((s) => s.coords)
  if (pts.length === 0) return null
  const lats = pts.map((p) => p[0])
  const lngs = pts.map((p) => p[1])
  return [
    [Math.min(...lats) - 0.05, Math.min(...lngs) - 0.05],
    [Math.max(...lats) + 0.05, Math.max(...lngs) + 0.05],
  ]
}

function FitBounds({ segments, selectedDay }: { segments: Segment[]; selectedDay: number }) {
  const map = useMap()
  const prevDay = useRef(-1)

  useEffect(() => {
    if (prevDay.current === selectedDay) return
    prevDay.current = selectedDay
    const bounds = dayBounds(segments, selectedDay)
    if (bounds) map.fitBounds(bounds, { padding: [24, 24] })
  }, [map, segments, selectedDay])

  return null
}

type Props = {
  selectedDay: number
  currentLat?: number | null
  currentLng?: number | null
  milesCompleted?: number
}

export function CourseMapLeaflet({ selectedDay, currentLat, currentLng, milesCompleted }: Props) {
  const [segments, setSegments] = useState<Segment[]>([])

  useEffect(() => {
    fetch('/race.kml')
      .then((r) => r.text())
      .then((xml) => setSegments(parseKml(xml)))
      .catch(console.error)
  }, [])

  const dayInfo = RACE_DAYS.find((d) => d.day === selectedDay)
  const initialBounds: LatLngBoundsExpression = [[29.8, -104.0], [33.2, -94.8]]

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden">
      {/* Header */}
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
          <span className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 bg-amber-400 rounded" /> Driving
            <span className="inline-block h-0.5 w-4 bg-slate-500 rounded" style={{ borderTop: '2px dashed #64748b' }} /> Trailer
          </span>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        bounds={initialBounds}
        style={{ height: 340, width: '100%', background: '#0f172a' }}
        zoomControl={true}
        attributionControl={true}
      >
        {/* Dark tile layer from CartoDB */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        {/* Fit to selected day whenever it changes */}
        {segments.length > 0 && (
          <FitBounds segments={segments} selectedDay={selectedDay} />
        )}

        {/* All days — full context (dim) */}
        {segments
          .filter((s) => s.day !== selectedDay && s.type === 'driving')
          .map((seg, i) => (
            <Polyline
              key={`ctx-d-${i}`}
              positions={thin(seg.coords, 6)}
              pathOptions={{ color: '#334155', weight: 1.5, opacity: 0.6 }}
            />
          ))}
        {segments
          .filter((s) => s.day !== selectedDay && s.type === 'trailer')
          .map((seg, i) => (
            <Polyline
              key={`ctx-t-${i}`}
              positions={thin(seg.coords, 6)}
              pathOptions={{ color: '#1e293b', weight: 1, opacity: 0.5, dashArray: '6 5' }}
            />
          ))}

        {/* Selected day — driving */}
        {segments
          .filter((s) => s.day === selectedDay && s.type === 'driving')
          .map((seg, i) => (
            <Polyline
              key={`sel-d-${i}`}
              positions={thin(seg.coords, 3)}
              pathOptions={{ color: '#f59e0b', weight: 3.5, opacity: 1 }}
            />
          ))}

        {/* Selected day — trailer */}
        {segments
          .filter((s) => s.day === selectedDay && s.type === 'trailer')
          .map((seg, i) => (
            <Polyline
              key={`sel-t-${i}`}
              positions={thin(seg.coords, 3)}
              pathOptions={{ color: '#64748b', weight: 2.5, opacity: 0.9, dashArray: '8 6' }}
            />
          ))}

        {/* Stop markers */}
        {segments
          .filter((s) => s.day === selectedDay && s.type === 'stop')
          .map((stop) => (
            <CircleMarker
              key={stop.name}
              center={stop.coords[0]}
              radius={6}
              pathOptions={{ color: '#fff', fillColor: '#f59e0b', fillOpacity: 1, weight: 1.5 }}
            >
              <Popup>{stop.name}</Popup>
            </CircleMarker>
          ))}

        {/* Live GPS position */}
        {currentLat && currentLng && (
          <CircleMarker
            center={[currentLat, currentLng]}
            radius={9}
            pathOptions={{ color: '#fff', fillColor: '#f59e0b', fillOpacity: 1, weight: 2 }}
          >
            <Popup>RX2 · live position</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  )
}
