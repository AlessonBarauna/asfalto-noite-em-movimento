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


export const PAINT_OPTIONS = [
  { id: '#4a5052', label: 'Grafite', price: 0 },
  { id: '#f2f0e8', label: 'Branco', price: 120 },
  { id: '#d71920', label: 'Vermelho', price: 180 },
  { id: '#164b9a', label: 'Azul', price: 180 },
  { id: '#111315', label: 'Preto', price: 220 },
  { id: '#d5a52a', label: 'Amarelo', price: 250 },
  { id: '#16804a', label: 'Verde', price: 280 },
  { id: '#8b3fa5', label: 'Roxo', price: 320 },
] as const

export const WHEEL_OPTIONS = [
  { id: 'alloy', label: 'Liga original', price: 0, color: '#aeb7bb' },
  { id: 'black', label: 'Preto fosco', price: 260, color: '#171c20' },
  { id: 'sport', label: 'Sport bronze', price: 420, color: '#b9874b' },
] as const

export const TINT_OPTIONS = [
  { id: 'smoke', label: 'Fumê', price: 0, color: '#172a36' },
  { id: 'light', label: 'Insulfilm claro', price: 180, color: '#607985' },
  { id: 'dark', label: 'Insulfilm G5', price: 350, color: '#080d12' },
] as const

export type AccessoryPurchase = { success: boolean; reason: 'already-owned' | 'insufficient-credits' | 'purchased'; balance: number; unlocked: string[] }
function purchaseAccessory(balance: number, unlockedItems: string[], id: string, options: readonly {id:string;price:number}[], starter: string): AccessoryPurchase {
  const owned = new Set(unlockedItems); owned.add(starter)
  const currentBalance = Math.max(0, Number.isFinite(balance) ? Math.floor(balance) : 0)
  const option = options.find(item => item.id === id)
  if (!option) return { success: false, reason: 'insufficient-credits', balance: currentBalance, unlocked: [...owned] }
  if (owned.has(id)) return { success: false, reason: 'already-owned', balance: currentBalance, unlocked: [...owned] }
  if (currentBalance < option.price) return { success: false, reason: 'insufficient-credits', balance: currentBalance, unlocked: [...owned] }
  owned.add(id)
  return { success: true, reason: 'purchased', balance: currentBalance - option.price, unlocked: [...owned] }
}
export const purchaseWheels = (balance: number, unlocked: string[], id: string) => purchaseAccessory(balance, unlocked, id, WHEEL_OPTIONS, 'alloy')
export const purchaseTint = (balance: number, unlocked: string[], id: string) => purchaseAccessory(balance, unlocked, id, TINT_OPTIONS, 'smoke')

export type PaintPurchase = { success: boolean; reason: 'already-owned' | 'insufficient-credits' | 'purchased'; balance: number; unlockedPaints: string[] }

export function purchasePaint(balance: number, unlockedPaints: string[], paint: string): PaintPurchase {
  const option = PAINT_OPTIONS.find(item => item.id === paint)
  const owned = new Set(unlockedPaints)
  owned.add('#4a5052')
  const currentBalance = Math.max(0, Number.isFinite(balance) ? Math.floor(balance) : 0)
  if (!option) return { success: false, reason: 'insufficient-credits', balance: currentBalance, unlockedPaints: [...owned] }
  if (owned.has(paint)) return { success: false, reason: 'already-owned', balance: currentBalance, unlockedPaints: [...owned] }
  if (currentBalance < option.price) return { success: false, reason: 'insufficient-credits', balance: currentBalance, unlockedPaints: [...owned] }
  owned.add(paint)
  return { success: true, reason: 'purchased', balance: currentBalance - option.price, unlockedPaints: [...owned] }
}
