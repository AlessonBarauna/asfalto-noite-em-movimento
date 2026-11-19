/** Poderes encontrados na estrada: orbes coloridos que o jogador pega por alguns segundos de vantagem. */
export type PowerId = 'clear' | 'wings' | 'ghost'

export type PowerInfo = { id: PowerId; label: string; blurb: string; seconds: number; color: string }

export const POWERS: Record<PowerId, PowerInfo> = {
  clear: { id: 'clear', label: 'RUA LIVRE', blurb: 'Poucos carros na pista', seconds: 9, color: '#4fe39a' },
  wings: { id: 'wings', label: 'ASAS', blurb: 'Você voa por cima do trânsito', seconds: 7, color: '#6cc8ff' },
  ghost: { id: 'ghost', label: 'FANTASMA', blurb: 'Os carros atravessam você', seconds: 6, color: '#c9a0ff' },
}

export const POWER_IDS: PowerId[] = ['clear', 'wings', 'ghost']

/** Distância (m) até o primeiro orbe e entre os seguintes — por distância, não por tempo, pois a velocidade não tem teto. */
export const FIRST_PICKUP_DISTANCE = 450
export const nextPickupGap = (roll: number): number => 800 + Math.min(1, Math.max(0, roll)) * 900

/** Sorteia o poder (chance igual para cada um). `roll` vem de um número aleatório em [0, 1). */
export function pickPower(roll: number): PowerId {
  const r = Number.isFinite(roll) ? Math.min(0.999999, Math.max(0, roll)) : 0
  return POWER_IDS[Math.floor(r * POWER_IDS.length)]
}

/** Quanto resta do poder, de 1 (cheio) a 0 (acabou). */
export const powerFraction = (id: PowerId, remainingSeconds: number): number =>
  Math.min(1, Math.max(0, remainingSeconds / POWERS[id].seconds))

/** Fração de carros à frente que somem quando "Rua livre" é pega (os demais continuam). */
export const CLEAR_REMOVES = 2 / 3
