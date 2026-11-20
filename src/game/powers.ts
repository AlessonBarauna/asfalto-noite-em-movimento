/** Poderes encontrados na estrada: orbes coloridos que o jogador pega por alguns segundos de vantagem. */
export type PowerId = 'clear' | 'wings' | 'ghost' | 'turbo' | 'cash'

export type PowerInfo = { id: PowerId; label: string; blurb: string; seconds: number; color: string }

export const POWERS: Record<PowerId, PowerInfo> = {
  clear: { id: 'clear', label: 'RUA LIVRE', blurb: 'Poucos carros na pista', seconds: 9, color: '#4fe39a' },
  wings: { id: 'wings', label: 'ASAS', blurb: 'Você voa por cima do trânsito', seconds: 7, color: '#6cc8ff' },
  ghost: { id: 'ghost', label: 'FANTASMA', blurb: 'Os carros atravessam você', seconds: 6, color: '#c9a0ff' },
  turbo: { id: 'turbo', label: 'NITRO INFINITO', blurb: 'Nitro sem parar', seconds: 5, color: '#ff8a3d' },
  cash: { id: 'cash', label: 'CRÉDITOS EM DOBRO', blurb: 'Tudo que você ganha vale o dobro', seconds: 10, color: '#ffd24a' },
}

export const POWER_IDS: PowerId[] = ['clear', 'wings', 'ghost', 'turbo', 'cash']

/** Distância (m) até o primeiro orbe e entre os seguintes — por distância, não por tempo, pois a velocidade não tem teto. */
export const FIRST_PICKUP_DISTANCE = 450
export const nextPickupGap = (roll: number): number => 800 + Math.min(1, Math.max(0, roll)) * 900

/** Sorteia o poder (chance igual para cada um). `roll` vem de um número aleatório em [0, 1). */
export function pickPower(roll: number): PowerId {
  const r = Number.isFinite(roll) ? Math.min(0.999999, Math.max(0, roll)) : 0
  return POWER_IDS[Math.floor(r * POWER_IDS.length)]
}

/** Quanto resta do poder, de 1 (cheio) a 0 (acabou). `total` é a duração com a evolução aplicada. */
export const powerFraction = (id: PowerId, remainingSeconds: number, total: number = POWERS[id].seconds): number =>
  Math.min(1, Math.max(0, remainingSeconds / Math.max(0.001, total)))

// ---------- evolução (comprada com créditos) ----------
export const MAX_POWER_LEVEL = 8
export type PowerLevels = Record<PowerId, number>
export const defaultPowerLevels = (): PowerLevels => ({ clear: 0, wings: 0, ghost: 0, turbo: 0, cash: 0 })

/** Segundos extras por nível e fator de preço de cada poder. */
const STEP: Record<PowerId, number> = { clear: 1.5, wings: 1.2, ghost: 1, turbo: 0.8, cash: 1.8 }
const PRICE_FACTOR: Record<PowerId, number> = { clear: 1, wings: 1.2, ghost: 1.4, turbo: 1.6, cash: 1.3 }

const clampLevel = (level: number): number => (Number.isFinite(level) ? Math.min(MAX_POWER_LEVEL, Math.max(0, Math.floor(level))) : 0)

export const powerDuration = (id: PowerId, level: number): number =>
  Math.round((POWERS[id].seconds + clampLevel(level) * STEP[id]) * 10) / 10

/** Preço de subir do nível `level` para o seguinte; null quando já está no máximo. */
export function upgradeCost(id: PowerId, level: number): number | null {
  const lv = clampLevel(level)
  if (lv >= MAX_POWER_LEVEL) return null
  return Math.round((400 * Math.pow(1.6, lv) * PRICE_FACTOR[id]) / 50) * 50
}

export function parsePowerLevels(raw: unknown): PowerLevels {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return { clear: clampLevel(Number(data.clear)), wings: clampLevel(Number(data.wings)), ghost: clampLevel(Number(data.ghost)), turbo: clampLevel(Number(data.turbo)), cash: clampLevel(Number(data.cash)) }
}

export type PowerPurchase =
  | { success: true; balance: number; levels: PowerLevels }
  | { success: false; reason: 'max-level' | 'insufficient-credits'; balance: number; levels: PowerLevels }

export function buyPowerUpgrade(balance: number, levels: PowerLevels, id: PowerId): PowerPurchase {
  const price = upgradeCost(id, levels[id])
  if (price === null) return { success: false, reason: 'max-level', balance, levels }
  if (balance < price) return { success: false, reason: 'insufficient-credits', balance, levels }
  return { success: true, balance: balance - price, levels: { ...levels, [id]: levels[id] + 1 } }
}

/** Fração de carros à frente que somem quando "Rua livre" é pega (os demais continuam). */
export const CLEAR_REMOVES = 2 / 3
