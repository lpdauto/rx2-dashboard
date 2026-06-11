import {
  batteryDrawW,
  modelWhPerMile,
  netWhPerMile,
  liveWhPerMile,
  breakEvenSpeed,
  PACK_WH,
  USABLE_WH,
  RESERVE_SOC,
  SWAP_SOC,
  TARGET_SPEED_MPH,
  MIN_SPEED_MPH,
  MAX_SPEED_MPH,
  SOLAR_ROLLING_W,
} from '@/lib/physics'
import { RACE_END_HOUR, EFFECTIVE_DRIVE_HOURS } from '@/data/race'

export type RaceMode = 'Conserve' | 'Normal' | 'Attack' | 'Endgame'

export type StrategyResult = {
  // Speed
  recommendedSpeedMph: number
  currentBreakEvenMph: number
  targetSpeedMph: number

  // Energy
  modelWhPerMile: number
  liveWhPerMile: number | null
  netWhPerMile: number        // positive = draining, negative = charging
  batteryDrawW: number
  solarIncomeW: number

  // Pack state
  driveSocPercent: number
  driveSocWh: number
  energyAvailableWh: number
  spareSocPercent: number | null
  swapRecommended: boolean
  swapReason: string | null

  // Projections
  projectedFinishSocPercent: number
  projectedMilesOnPack: number
  estimatedFinishTime: string | null   // HH:MM CDT
  hoursToFinish: number | null
  timeBufferHours: number | null

  // Status
  raceMode: RaceMode
  driverInstruction: string
  chaseInstruction: string
  thermalStatus: 'OK' | 'Watch' | 'Critical'
  alerts: string[]

  // Meta
  isFinalDay: boolean
  milesRemaining: number
  hoursRemainingInWindow: number
}

export function computeStrategy({
  driveSocPercent,
  spareSocPercent,
  speedMph,
  solarPowerW,
  milesRemaining,
  milesCompleted,
  gradePercent = 0,
  motorTempC,
  controllerTempC,
  hoursRemainingInWindow,
  isFinalDay,
}: {
  driveSocPercent: number
  spareSocPercent: number | null
  speedMph: number
  solarPowerW: number
  milesRemaining: number
  milesCompleted: number
  gradePercent?: number
  motorTempC?: number
  controllerTempC?: number
  hoursRemainingInWindow: number
  isFinalDay: boolean
}): StrategyResult {
  const effectiveSolar = solarPowerW > 10 ? solarPowerW : SOLAR_ROLLING_W

  // Pack energy state
  const reserveSoc = isFinalDay ? 5 : RESERVE_SOC
  const driveSocWh = (driveSocPercent / 100) * USABLE_WH
  const energyAvailableWh = Math.max(0, ((driveSocPercent - reserveSoc) / 100) * USABLE_WH)

  // Physics at current/target speeds
  const workingSpeed = speedMph > 5 ? speedMph : TARGET_SPEED_MPH
  const drawW = batteryDrawW(workingSpeed, gradePercent)
  const modelWpm = modelWhPerMile(workingSpeed, gradePercent)
  const netWpm = netWhPerMile(workingSpeed, effectiveSolar, gradePercent)
  const currentBreakEven = breakEvenSpeed(effectiveSolar)

  // Projections at current speed
  const projectedWhNeeded = milesRemaining * Math.max(0, netWpm)
  const pacityWh = USABLE_WH  // treat usable capacity as our working capacity
  const projectedFinishSoc = Math.max(
    0,
    Math.min(100, driveSocPercent - (projectedWhNeeded / pacityWh) * 100)
  )

  // Time projection
  const hoursToFinish = workingSpeed > 0 ? milesRemaining / workingSpeed : null
  const timeBufferHours = hoursToFinish !== null ? hoursRemainingInWindow - hoursToFinish : null

  // Estimated finish time (CDT)
  let estimatedFinishTime: string | null = null
  if (hoursToFinish !== null) {
    const nowUtc = new Date()
    const cdtOffset = -5 * 60  // CDT = UTC-5
    const nowCdtMs = nowUtc.getTime() + cdtOffset * 60 * 1000
    const finishMs = nowCdtMs + hoursToFinish * 3600 * 1000
    const finishDate = new Date(finishMs)
    estimatedFinishTime = `${String(finishDate.getUTCHours()).padStart(2, '0')}:${String(finishDate.getUTCMinutes()).padStart(2, '0')}`
  }

  // Miles on remaining pack energy (at current pace)
  const projectedMilesOnPack =
    netWpm > 0 ? energyAvailableWh / netWpm : Infinity

  // Thermal status
  const thermalStatus: StrategyResult['thermalStatus'] =
    (controllerTempC ?? 0) > 85 || (motorTempC ?? 0) > 95
      ? 'Critical'
      : (controllerTempC ?? 0) > 75 || (motorTempC ?? 0) > 85
      ? 'Watch'
      : 'OK'

  // Swap recommendation
  const swapRecommended =
    spareSocPercent !== null &&
    spareSocPercent > driveSocPercent + 20 &&
    driveSocPercent < SWAP_SOC
  const swapReason = swapRecommended
    ? `Drive pack at ${driveSocPercent.toFixed(0)}%, spare at ${spareSocPercent?.toFixed(0)}%`
    : null

  // Race mode classification
  let raceMode: RaceMode
  const needsToHurry = timeBufferHours !== null && timeBufferHours < 0.5
  const finishSocLow = projectedFinishSoc < reserveSoc + 5

  if (isFinalDay && driveSocPercent > 40) {
    raceMode = 'Endgame'
  } else if (finishSocLow || thermalStatus === 'Critical') {
    raceMode = 'Conserve'
  } else if (needsToHurry || projectedFinishSoc > 50) {
    raceMode = 'Attack'
  } else {
    raceMode = 'Normal'
  }

  // Speed recommendation
  let recSpeed = TARGET_SPEED_MPH

  if (raceMode === 'Conserve') {
    recSpeed = driveSocPercent > 30 ? 33 : 30
  } else if (raceMode === 'Endgame') {
    recSpeed = 40
  } else if (raceMode === 'Attack') {
    recSpeed = needsToHurry ? 42 : 40
  } else {
    // Normal: SoC-based fine tuning
    if (driveSocPercent > 80) recSpeed = 40
    else if (driveSocPercent > 60) recSpeed = 38
    else if (driveSocPercent > 40) recSpeed = 37
    else if (driveSocPercent > 20) recSpeed = 35
    else recSpeed = 33
  }

  // Grade adjustments
  if (gradePercent > 3) recSpeed -= 3
  if (gradePercent < -3) recSpeed = Math.min(recSpeed + 2, MAX_SPEED_MPH)

  // Thermal cap
  if (thermalStatus === 'Watch') recSpeed = Math.min(recSpeed, 36)
  if (thermalStatus === 'Critical') recSpeed = Math.min(recSpeed, 30)

  recSpeed = Math.round(Math.max(MIN_SPEED_MPH, Math.min(MAX_SPEED_MPH, recSpeed)))

  // Alerts
  const alerts: string[] = []
  if (thermalStatus === 'Critical') alerts.push('THERMAL CRITICAL — reduce throttle now')
  if (thermalStatus === 'Watch') alerts.push('Thermal warning — monitor temps')
  if (driveSocPercent < RESERVE_SOC) alerts.push('Pack below minimum — swap or pull over')
  else if (driveSocPercent < SWAP_SOC) alerts.push('Pack low — initiate swap when judge available')
  if (projectedFinishSoc < reserveSoc) alerts.push('SOC deficit projected — reduce speed')
  if (timeBufferHours !== null && timeBufferHours < 0) alerts.push('Behind schedule — increase pace')
  if (swapRecommended) alerts.push('Battery swap recommended')

  // Instructions
  const driverInstruction = buildDriverInstruction(raceMode, recSpeed, gradePercent)
  const chaseInstruction = buildChaseInstruction(raceMode, swapRecommended, thermalStatus)

  return {
    recommendedSpeedMph: recSpeed,
    currentBreakEvenMph: currentBreakEven,
    targetSpeedMph: TARGET_SPEED_MPH,
    modelWhPerMile: modelWpm,
    liveWhPerMile: liveWhPerMile(drawW, workingSpeed),
    netWhPerMile: netWpm,
    batteryDrawW: drawW,
    solarIncomeW: effectiveSolar,
    driveSocPercent,
    driveSocWh,
    energyAvailableWh,
    spareSocPercent: spareSocPercent ?? null,
    swapRecommended,
    swapReason,
    projectedFinishSocPercent: projectedFinishSoc,
    projectedMilesOnPack,
    estimatedFinishTime,
    hoursToFinish,
    timeBufferHours,
    raceMode,
    driverInstruction,
    chaseInstruction,
    thermalStatus,
    alerts,
    isFinalDay,
    milesRemaining,
    hoursRemainingInWindow,
  }
}

function buildDriverInstruction(raceMode: RaceMode, recSpeed: number, grade: number) {
  if (raceMode === 'Conserve') return `Ease to ${recSpeed} mph — smooth throttle, no surge.`
  if (raceMode === 'Endgame') return `Final day — push to ${recSpeed} mph and spend the pack.`
  if (raceMode === 'Attack') return `Increase to ${recSpeed} mph, conditions allow.`
  if (grade > 3) return `Hold ${recSpeed} mph through climb, protect SoC.`
  if (grade < -3) return `Ease throttle on descent, use regen gently.`
  return `Hold ${recSpeed} mph — pace is optimal.`
}

function buildChaseInstruction(
  raceMode: RaceMode,
  swap: boolean,
  thermal: StrategyResult['thermalStatus']
) {
  if (thermal === 'Critical') return 'Call driver to reduce throttle — thermal critical.'
  if (swap) return 'Prepare spare pack for swap. Contact race judge now.'
  if (raceMode === 'Conserve') return 'Monitor SoC trend every mile. Flag trail decision points.'
  if (raceMode === 'Endgame') return 'Track finish time vs window. Confirm both packs available.'
  return 'Monitor telemetry. Keep navigator calls calm and early.'
}
