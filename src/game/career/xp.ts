/** Regras de XP: o que cada corrida rende para a patente. Puras, para testar sem o jogo rodando. */
export type RunSummary = {
  distance: number
  nearMisses: number
  carsJumped: number
  seconds: number
  /** Quantas batidas aconteceram na corrida. */
  hits: number
  city: string
  /** Cidade do mapa em que a corrida aconteceu (os contratos podem exigir uma cidade específica). */
  cityId?: string
  /** true em corridas com ajuste de tuning, que não contam para progressão. */
  unranked?: boolean
}

export type XpBreakdown = { total: number; distance: number; nearMisses: number; jumps: number; flawless: number; city: number }

/** Cidades mais difíceis rendem um pouco mais de XP e de créditos. */
export const CITY_MULTIPLIER: Record<string, { xp: number; credits: number }> = {
  cidade: { xp: 1, credits: 1 },
  serra: { xp: 1.15, credits: 1.15 },
  deserto: { xp: 1.3, credits: 1.3 },
}

export function cityMultiplier(city: string): { xp: number; credits: number } {
  return CITY_MULTIPLIER[city] ?? { xp: 1, credits: 1 }
}

const safe = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : 0)

/** 60 XP por km, 4 por quase-batida, 8 por carro pulado, +40 por km sem nenhuma batida. */
export function xpForRun(run: RunSummary): XpBreakdown {
  if (run.unranked) return { total: 0, distance: 0, nearMisses: 0, jumps: 0, flawless: 0, city: 0 }
  const km = safe(run.distance) / 1000
  const distance = Math.floor(km * 60)
  const nearMisses = Math.floor(safe(run.nearMisses)) * 4
  const jumps = Math.floor(safe(run.carsJumped)) * 8
  const flawless = safe(run.hits) === 0 ? Math.floor(km * 40) : 0
  const base = distance + nearMisses + jumps + flawless
  const total = Math.floor(base * cityMultiplier(run.city).xp)
  return { total, distance, nearMisses, jumps, flawless, city: total - base }
}
