/**
 * Patente única do jogador. Tudo que o jogador faz (distância, quase-batidas, pulos, contratos)
 * vira XP; o XP define a patente; a patente abre recursos, modos, cidades e carros.
 * Depois da última patente nomeada, o jogador segue ganhando "estrelas de lenda" sem limite.
 */
export type Rank = { level: number; name: string; xp: number; blurb: string }

export const RANKS: readonly Rank[] = [
  { level: 1, name: 'Novato', xp: 0, blurb: 'Primeira noite na estrada.' },
  { level: 2, name: 'Estradeiro', xp: 250, blurb: 'Já conhece o asfalto e começa a mexer no carro.' },
  { level: 3, name: 'Pé de Chumbo', xp: 700, blurb: 'Ganha um objetivo a cada corrida.' },
  { level: 4, name: 'Madrugueiro', xp: 1500, blurb: 'A serra deixou de assustar.' },
  { level: 5, name: 'Piloto de Rua', xp: 2800, blurb: 'Preparação pesada e carros esportivos.' },
  { level: 6, name: 'Cometa', xp: 4800, blurb: 'Cargas urgentes e utilitários.' },
  { level: 7, name: 'Fantasma', xp: 7800, blurb: 'O deserto é todo seu.' },
  { level: 8, name: 'Relâmpago', xp: 12000, blurb: 'Objetivos mais difíceis.' },
  { level: 9, name: 'Mestre da Noite', xp: 18000, blurb: 'Poucos chegam até aqui.' },
  { level: 10, name: 'Lenda do Asfalto', xp: 27000, blurb: 'O topo. Agora é só somar estrelas.' },
]

/** XP necessário para cada nova estrela de lenda depois da última patente. */
export const LEGEND_STAR_XP = 15000

export type RankStatus = {
  rank: Rank
  /** 0 enquanto não é lenda; depois, uma estrela a cada LEGEND_STAR_XP. */
  legendStars: number
  xp: number
  /** XP já acumulado dentro da patente atual. */
  xpIntoRank: number
  /** XP que falta para a próxima patente/estrela. */
  xpToNext: number
  /** 0..1 de progresso até a próxima patente/estrela. */
  progress: number
}

export function sanitizeXp(xp: unknown): number {
  return typeof xp === 'number' && Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0
}

export function rankStatus(xpInput: number): RankStatus {
  const xp = sanitizeXp(xpInput)
  let index = 0
  for (let i = 0; i < RANKS.length; i += 1) if (xp >= RANKS[i].xp) index = i
  const rank = RANKS[index]
  const next = RANKS[index + 1]
  if (next) {
    const span = next.xp - rank.xp
    const into = xp - rank.xp
    return { rank, legendStars: 0, xp, xpIntoRank: into, xpToNext: next.xp - xp, progress: into / span }
  }
  const beyond = xp - rank.xp
  const legendStars = Math.floor(beyond / LEGEND_STAR_XP)
  const into = beyond - legendStars * LEGEND_STAR_XP
  return { rank, legendStars, xp, xpIntoRank: into, xpToNext: LEGEND_STAR_XP - into, progress: into / LEGEND_STAR_XP }
}

export function rankLevel(xp: number): number {
  return rankStatus(xp).rank.level
}

/** Rótulo curto para a interface: "Madrugueiro" ou "Lenda do Asfalto ★3". */
export function rankLabel(xp: number): string {
  const status = rankStatus(xp)
  return status.legendStars > 0 ? `${status.rank.name} ★${status.legendStars}` : status.rank.name
}
