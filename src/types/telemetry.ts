export type TelemetryNode = 'vehicle' | 'mppt' | 'spare-battery'

export type VehiclePacket = {
  timestamp?: number
  speedMph?: number
  gpsLat?: number
  gpsLng?: number
  gpsElevationFt?: number
  packVoltage?: number
  packCurrent?: number
  packSoc?: number
  packTempC?: number
  motorTempC?: number
  controllerTempC?: number
  motorRpm?: number
  throttlePercent?: number
  regenWatts?: number
  odometerMiles?: number
  distanceMiles?: number
  bleConnected?: boolean
  telemetryFresh?: boolean
}

export type MpptPacket = {
  timestamp?: number
  mpptPvVoltage?: number
  mpptPvCurrent?: number
  mpptPvPowerWatts?: number
  mpptBatteryVoltage?: number
  mpptChargeCurrent?: number
  mpptChargePowerWatts?: number
  mpptDailyEnergyWh?: number
  mpptChargeState?: string
  mpptFault?: string
  spareSocPercent?: number
}

export type TelemetrySnapshot = {
  vehicle: VehiclePacket | null
  mppt: MpptPacket | null
  vehicleAgeMs: number | null
  mpptAgeMs: number | null
  fetchedAt: number
}

export type ConnectionStatus = 'connecting' | 'live' | 'stale' | 'offline'
