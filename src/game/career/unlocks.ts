import { GLB_CAR_LIST } from '../glb-car-list'
/**
 * Catálogo de tudo que o jogador destrava. Cada item exige uma patente mínima; comprar também
 * exige créditos (veja economy.ts). Para criar uma cidade, um modo ou um carro novo basta
 * acrescentar uma linha aqui — o resto do jogo consulta este catálogo.
 */
export type UnlockKind = 'feature' | 'mode' | 'city' | 'vehicle'

export type UnlockEntry = { id: string; kind: UnlockKind; label: string; rank: number; blurb: string }

export const UNLOCKS: readonly UnlockEntry[] = [
  // recursos do jogo
  { id: 'garage-paint', kind: 'feature', label: 'Pintura e rodas', rank: 2, blurb: 'Personalize a cor e as rodas do carro.' },
  { id: 'garage-tint', kind: 'feature', label: 'Insulfilm e aerofólio', rank: 4, blurb: 'Vidros escuros e aerofólio.' },
  { id: 'garage-performance', kind: 'feature', label: 'Suspensão, escape e faróis', rank: 5, blurb: 'Preparação mecânica e iluminação.' },
  { id: 'nitro', kind: 'feature', label: 'Nitro', rank: 2, blurb: 'Impulso curto com a tecla F.' },
  // modos de jogo
  { id: 'mode-infinito', kind: 'mode', label: 'Corrida infinita', rank: 1, blurb: 'Dirija até onde conseguir.' },
  { id: 'mode-contratos', kind: 'mode', label: 'Objetivos da corrida', rank: 3, blurb: 'Uma meta por corrida que paga créditos e XP.' },
  // cidades
  { id: 'city-cidade', kind: 'city', label: 'Metrópole', rank: 1, blurb: 'Avenida molhada, neon e chuva.' },
  { id: 'city-serra', kind: 'city', label: 'Serra', rank: 4, blurb: 'Curvas, pinheiros e neblina.' },
  { id: 'city-deserto', kind: 'city', label: 'Deserto', rank: 7, blurb: 'Estrada vazia ao pôr do sol.' },
  // carros
  { id: 'vehicle-gol-g5', kind: 'vehicle', label: 'Gol G5', rank: 1, blurb: 'O primeiro carro.' },
  { id: 'vehicle-uno', kind: 'vehicle', label: 'Uno', rank: 2, blurb: 'Popular e ágil.' },
  { id: 'vehicle-celta', kind: 'vehicle', label: 'Celta', rank: 2, blurb: 'Compacto e barato.' },
  { id: 'vehicle-palio', kind: 'vehicle', label: 'Palio', rank: 3, blurb: 'Hatch esperto.' },
  { id: 'vehicle-corsa', kind: 'vehicle', label: 'Corsa', rank: 4, blurb: 'Clássico de rua.' },
  { id: 'vehicle-hb20', kind: 'vehicle', label: 'HB20', rank: 5, blurb: 'Moderno e estável.' },
  { id: 'vehicle-onix', kind: 'vehicle', label: 'Onix', rank: 5, blurb: 'O mais vendido do país.' },
  { id: 'vehicle-saveiro', kind: 'vehicle', label: 'Saveiro', rank: 6, blurb: 'Picape leve de carga.' },
  { id: 'vehicle-fiorino', kind: 'vehicle', label: 'Fiorino', rank: 6, blurb: 'Furgão de entrega.' },
  ...GLB_CAR_LIST.map(c => ({ id: `vehicle-${c.id}`, kind: 'vehicle' as const, label: c.label, rank: c.rank, blurb: c.type.charAt(0) + c.type.slice(1).toLowerCase() + ' realista.' })),
  { id: 'vehicle-supercar', kind: 'vehicle', label: 'Esportivo', rank: 10, blurb: 'Recompensa da Lenda do Asfalto.' },
]

const BY_ID = new Map(UNLOCKS.map(entry => [entry.id, entry]))

export function unlockEntry(id: string): UnlockEntry | undefined {
  return BY_ID.get(id)
}

/** Patente mínima exigida (1 se o id não estiver no catálogo, para nunca travar algo desconhecido). */
export function requiredRank(id: string): number {
  return BY_ID.get(id)?.rank ?? 1
}

export function isUnlocked(rank: number, id: string): boolean {
  return rank >= requiredRank(id)
}

export const featureId = (name: string) => name
export const cityUnlockId = (city: string) => `city-${city}`
export const vehicleUnlockId = (vehicle: string) => `vehicle-${vehicle}`

/** Tudo que passa a estar disponível exatamente ao atingir essa patente (usado no aviso de subida). */
export function unlocksAtRank(rank: number): UnlockEntry[] {
  return UNLOCKS.filter(entry => entry.rank === rank)
}

/** Itens liberados ao subir de `from` para `to` (inclusive os de patentes puladas). */
export function unlocksBetween(from: number, to: number): UnlockEntry[] {
  return UNLOCKS.filter(entry => entry.rank > from && entry.rank <= to)
}

export function nextUnlocks(rank: number, limit = 3): UnlockEntry[] {
  const upcoming = UNLOCKS.filter(entry => entry.rank > rank).sort((a, b) => a.rank - b.rank)
  if (!upcoming.length) return []
  const target = upcoming[0].rank
  return upcoming.filter(entry => entry.rank === target).slice(0, limit)
}
