export const RACE_DAYS = [
  {
    day: 1,
    date: 'July 19',
    from: 'Fort Worth',
    to: 'Palestine',
    miles: 153.6,
    startElevationFt: 650,
    endElevationFt: 440,
    netElevationFt: -210,
    lat: 31.762,
    lng: -95.631,
    riskNote: 'Mostly flat, net descent, favorable',
  },
  {
    day: 2,
    date: 'July 20',
    from: 'Palestine',
    to: 'Round Rock',
    miles: 142.1,
    startElevationFt: 440,
    endElevationFt: 490,
    netElevationFt: 50,
    lat: 30.508,
    lng: -97.679,
    riskNote: 'Gentle rolling terrain',
  },
  {
    day: 3,
    date: 'July 21',
    from: 'Round Rock',
    to: 'Fredericksburg',
    miles: 66.7,
    startElevationFt: 490,
    endElevationFt: 1690,
    netElevationFt: 1200,
    lat: 30.275,
    lng: -98.872,
    riskNote: 'Hardest day — major climb, manage SoC early',
  },
  {
    day: 4,
    date: 'July 22',
    from: 'Fredericksburg',
    to: 'San Angelo',
    miles: 144.6,
    startElevationFt: 1690,
    endElevationFt: 1847,
    netElevationFt: 157,
    lat: 31.464,
    lng: -100.437,
    riskNote: 'High-plateau stretch, watch headwinds',
  },
  {
    day: 5,
    date: 'July 23',
    from: 'San Angelo',
    to: 'Fort Stockton',
    miles: 112.8,
    startElevationFt: 1847,
    endElevationFt: 2952,
    netElevationFt: 1105,
    lat: 30.891,
    lng: -102.879,
    riskNote: 'Final day — spend both packs freely',
  },
]

export const RACE_START_HOUR = 8   // 8:00 AM CDT
export const RACE_END_HOUR = 17    // 5:00 PM CDT
export const MANDATORY_STOP_HOURS = 0.75
export const EFFECTIVE_DRIVE_HOURS = 8.25

export const RACE_WAYPOINTS = [
  { name: 'Fort Worth',      lat: 32.755, lng: -97.330, day: 0 },
  { name: 'Palestine',       lat: 31.762, lng: -95.631, day: 1 },
  { name: 'Round Rock',      lat: 30.508, lng: -97.679, day: 2 },
  { name: 'Fredericksburg',  lat: 30.275, lng: -98.872, day: 3 },
  { name: 'San Angelo',      lat: 31.464, lng: -100.437, day: 4 },
  { name: 'Fort Stockton',   lat: 30.891, lng: -102.879, day: 5 },
]

export const TOTAL_MILES = 619.8

export function getRaceDay(n: number) {
  return RACE_DAYS.find((d) => d.day === n) ?? null
}

export function hoursRemainingInRace(): number {
  const now = new Date()
  const cdtOffset = -5 * 60  // CDT = UTC-5
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const cdtMinutes = utcMinutes + cdtOffset
  const cdtHours = cdtMinutes / 60

  const endH = RACE_END_HOUR
  return Math.max(0, endH - cdtHours)
}

export function isRaceWindow(): boolean {
  const now = new Date()
  const cdtOffset = -5 * 60
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const cdtMinutes = utcMinutes + cdtOffset
  const cdtHours = cdtMinutes / 60

  return cdtHours >= RACE_START_HOUR && cdtHours < RACE_END_HOUR
}
