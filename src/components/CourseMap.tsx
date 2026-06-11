'use client'

import dynamic from 'next/dynamic'

const CourseMapLeaflet = dynamic(
  () => import('./CourseMapLeaflet').then((m) => ({ default: m.CourseMapLeaflet })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center" style={{ height: 240 }}>
        <p className="text-sm text-slate-500">Loading map…</p>
      </div>
    ),
  }
)

type Props = {
  selectedDay: number
  currentLat?: number | null
  currentLng?: number | null
  milesCompleted?: number
}

export function CourseMap(props: Props) {
  return <CourseMapLeaflet {...props} />
}
