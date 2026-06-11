// RX2 vehicle constants from engineering analysis
const RHO = 1.225    // kg/m³ air density
const CD = 0.20      // drag coefficient (sealed body)
const A = 1.35       // m² frontal area
const MASS = 300     // kg vehicle + driver
const G = 9.81       // m/s²
const CRR = 0.008    // rolling resistance coefficient
const ETA = 0.72     // drivetrain efficiency (controller × motor × gearbox × diff)

export const PACK_KWH = 5.0           // kWh per pack
export const PACK_WH = 5000           // Wh per pack
export const USABLE_WH = 4000         // 80% DoD
export const RESERVE_SOC = 15         // % absolute minimum
export const SWAP_SOC = 20            // % proactive swap trigger
export const TARGET_SPEED_MPH = 38    // optimal race pace
export const BREAKEVEN_MPH = 36.4     // solar income = drive consumption
export const MIN_SPEED_MPH = 20       // race minimum
export const MAX_SPEED_MPH = 45       // practical upper bound
export const SOLAR_ROLLING_W = 1522   // W average during race hours (moving)
export const SOLAR_STOPPED_W = 1320   // W when stationary

function mphToMps(mph: number) {
  return mph * 0.44704
}

export function aeroPowerW(mph: number): number {
  const v = mphToMps(mph)
  return 0.5 * RHO * CD * A * v * v * v
}

export function rollingPowerW(mph: number): number {
  const v = mphToMps(mph)
  return MASS * G * CRR * v
}

export function gradePowerW(mph: number, gradePercent: number): number {
  const v = mphToMps(mph)
  return MASS * G * (gradePercent / 100) * v
}

export function mechanicalPowerW(mph: number, gradePercent = 0): number {
  return aeroPowerW(mph) + rollingPowerW(mph) + gradePowerW(mph, gradePercent)
}

export function batteryDrawW(mph: number, gradePercent = 0): number {
  const mech = mechanicalPowerW(mph, gradePercent)
  if (mech < 0) return mech * 0.60  // regen recovery on descent
  return mech / ETA
}

export function modelWhPerMile(mph: number, gradePercent = 0): number {
  if (mph <= 0) return 0
  return batteryDrawW(mph, gradePercent) / mph
}

export function netWhPerMile(mph: number, solarW: number, gradePercent = 0): number {
  return modelWhPerMile(mph, gradePercent) - solarW / mph
}

export function motorRpm(mph: number): number {
  const wheelCircumferenceM = Math.PI * 0.649
  const gearRatio = 6.27
  return (mphToMps(mph) / wheelCircumferenceM) * 60 * gearRatio
}

export function breakEvenSpeed(solarW: number): number {
  // Binary search for the speed where netWhPerMile == 0
  let lo = 20, hi = 60
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    netWhPerMile(mid, solarW) > 0 ? (hi = mid) : (lo = mid)
  }
  return Math.round((lo + hi) / 2 * 10) / 10
}

// Compute Wh/mi from live telemetry (battery power vs speed)
export function liveWhPerMile(batteryPowerW: number, speedMph: number): number | null {
  if (speedMph < 2 || !Number.isFinite(batteryPowerW) || !Number.isFinite(speedMph)) return null
  return batteryPowerW / speedMph
}
