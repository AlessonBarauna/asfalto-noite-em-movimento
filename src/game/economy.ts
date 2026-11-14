/** Economy rules are pure so payouts can be tested independently from rendering. */
import type { PlayerVehicleId } from '../engine/save'

export type RacePayout = { credits: number; distanceCredits: number; nearMissCredits: number }

/** Five credits per 100 m, plus 15 for each clean near miss. */
export function calculateRacePayout(distanceMeters: number, nearMisses: number): RacePayout {
  const distanceCredits = Math.floor(Math.max(0, Number.isFinite(distanceMeters) ? distanceMeters : 0) / 100) * 5
  const nearMissCredits = Math.max(0, Math.floor(Number.isFinite(nearMisses) ? nearMisses : 0)) * 15
  return { credits: distanceCredits + nearMissCredits, distanceCredits, nearMissCredits }
}

/** Credit prices for the vehicles that can be unlocked in the garage. */
export const VEHICLE_PRICES: Record<PlayerVehicleId, number> = {
  'gol-g5': 0,
  uno: 400,
  palio: 550,
  celta: 650,
  corsa: 850,
  onix: 1600,
  hb20: 1500,
  saveiro: 2200,
  fiorino: 2500,
}

export type VehiclePurchase = {
  success: boolean
  reason: 'already-owned' | 'insufficient-credits' | 'purchased'
  balance: number
  unlockedVehicles: PlayerVehicleId[]
}

/** Pure purchase rule: never allows a negative balance or duplicate charge. */
export function purchaseVehicle(
  balance: number,
  unlockedVehicles: PlayerVehicleId[],
  vehicle: PlayerVehicleId,
): VehiclePurchase {
  const owned = new Set(unlockedVehicles)
  owned.add('gol-g5')
  const currentBalance = Math.max(0, Number.isFinite(balance) ? Math.floor(balance) : 0)
  if (owned.has(vehicle)) {
    return { success: false, reason: 'already-owned', balance: currentBalance, unlockedVehicles: [...owned] }
  }
  const price = VEHICLE_PRICES[vehicle]
  if (currentBalance < price) {
    return { success: false, reason: 'insufficient-credits', balance: currentBalance, unlockedVehicles: [...owned] }
  }
  owned.add(vehicle)
  return { success: true, reason: 'purchased', balance: currentBalance - price, unlockedVehicles: [...owned] }
}
