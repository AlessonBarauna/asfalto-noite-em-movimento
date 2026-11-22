/**
 * Objetivo da corrida: uma meta simples (distância, quase-batidas ou pulos) que paga créditos e XP.
 * Valem em qualquer cidade. O motor abaixo ainda entende cargas e cidades de contratos antigos salvos.
 *
 * (Histórico) Contratos de madrugada: a marca do jogo. O jogador é um motorista noturno e pega cargas com
 * regras próprias. A carga muda a forma de dirigir e o pagamento:
 *  - comum:   sem restrição.
 *  - fragil:  uma única batida estraga a carga (o contrato falha), paga bem mais.
 *  - urgente: tem prazo em segundos, paga mais.
 *  - valiosa: o trânsito fica mais denso, paga o maior prêmio.
 * Os contratos são gerados por uma semente salva, então o quadro é estável entre sessões.
 */
import { RANKS } from './ranks'
import { cityUnlockId, isUnlocked } from './unlocks'
import { cityById, countryOfCity } from './world'
import type { RunSummary } from './xp'

export type CargoKind = 'comum' | 'fragil' | 'urgente' | 'valiosa'
export type ObjectiveKind = 'distancia' | 'quase-batidas' | 'pulos'

export type Contract = {
  id: string
  title: string
  /** Tema visual da cidade do contrato (cidade/serra/deserto). */
  city: string
  /** Cidade do mapa exigida e seu nome (contratos novos). */
  cityId?: string
  cityName?: string
  cargo: CargoKind
  objective: { kind: ObjectiveKind; target: number }
  /** Prazo em segundos (só cargas urgentes). */
  timeLimit?: number
  /** Multiplicador sobre a densidade do trânsito (carga valiosa). */
  trafficBoost: number
  reward: { credits: number; xp: number }
  /** 1 fácil, 2 médio, 3 difícil. */
  tier: 1 | 2 | 3
}

export const CARGO: Record<CargoKind, { label: string; rule: string; pay: number; xp: number; trafficBoost: number }> = {
  comum: { label: 'Carga comum', rule: 'Sem restrições.', pay: 1, xp: 1, trafficBoost: 1 },
  fragil: { label: 'Carga frágil', rule: 'Uma batida e a carga se perde.', pay: 1.7, xp: 1.5, trafficBoost: 1 },
  urgente: { label: 'Carga urgente', rule: 'Entregue antes do prazo.', pay: 1.45, xp: 1.3, trafficBoost: 1 },
  valiosa: { label: 'Carga valiosa', rule: 'Trânsito mais denso na rota.', pay: 1.9, xp: 1.6, trafficBoost: 1.3 },
}

export const BOARD_SIZE = 3
const CITIES = ['cidade', 'serra', 'deserto']
const CITY_LABEL: Record<string, string> = { cidade: 'Metrópole', serra: 'Serra', deserto: 'Deserto' }

/** Gerador pseudoaleatório pequeno e determinístico (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = (seed >>> 0) || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(random: () => number, list: readonly T[]): T {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))]
}

/** Cargas disponíveis crescem com a patente: frágil e urgente a partir da 4, valiosa a partir da 6. */
export function availableCargo(rank: number): CargoKind[] {
  const cargo: CargoKind[] = ['comum']
  if (rank >= 4) cargo.push('fragil')
  if (rank >= 6) cargo.push('urgente')
  if (rank >= 8) cargo.push('valiosa')
  return cargo
}

function objectiveFor(random: () => number, rank: number, tier: 1 | 2 | 3, cargo: CargoKind): Contract['objective'] {
  const scale = 1 + (Math.min(rank, RANKS.length) - 1) * 0.22
  const tierScale = tier === 1 ? 1 : tier === 2 ? 1.6 : 2.4
  const kind: ObjectiveKind = pick(random, ['distancia', 'distancia', 'quase-batidas', 'pulos'])
  if (kind === 'distancia') {
    const meters = Math.round((1500 * scale * tierScale) / 100) * 100
    return { kind, target: cargo === 'urgente' ? Math.round(meters * 0.8 / 100) * 100 : meters }
  }
  if (kind === 'quase-batidas') return { kind, target: Math.max(4, Math.round(6 * scale * tierScale)) }
  return { kind, target: Math.max(2, Math.round(2 * scale * tierScale)) }
}

/** Gera o quadro de contratos para a patente e as cidades liberadas. Mesma semente, mesmo quadro. */
export function generateBoard(seed: number, rank: number, ownedCityIds: readonly string[] = []): Contract[] {
  const random = seededRandom(seed)
  const owned = ownedCityIds.map(id => cityById(id)).filter((city): city is NonNullable<typeof city> => !!city)
  const cities = CITIES.filter(city => isUnlocked(rank, cityUnlockId(city)))
  const cargos = availableCargo(rank)
  const tiers: Array<1 | 2 | 3> = [1, 2, 3]
  return tiers.slice(0, BOARD_SIZE).map((tier, i) => {
    const target = owned.length ? pick(random, owned) : undefined
    const city = target ? target.theme : pick(random, cities)
    const stage = target ? (countryOfCity(target.id)?.stage ?? 1) : 1
    const stageBonus = 1 + (stage - 1) * 0.06
    // o contrato difícil sempre tenta uma carga com regra, quando existir
    const cargo = tier === 1 ? 'comum' : pick(random, cargos.length > 1 ? cargos.filter(c => c !== 'comum') : cargos)
    const objective = objectiveFor(random, rank, tier, cargo)
    const worth = objective.kind === 'distancia' ? objective.target / 100 * 5 : objective.kind === 'quase-batidas' ? objective.target * 15 : objective.target * 30
    const base = Math.round((worth * (0.9 + tier * 0.25) + 40 * tier) * stageBonus)
    const timeLimit = cargo === 'urgente' && objective.kind === 'distancia' ? Math.round(objective.target / 24) : undefined
    return {
      id: `c${seed}-${i}`,
      title: `${CARGO[cargo].label} · ${target?.name ?? CITY_LABEL[city] ?? city}`,
      city,
      cityId: target?.id,
      cityName: target?.name,
      cargo,
      objective,
      timeLimit,
      trafficBoost: CARGO[cargo].trafficBoost,
      reward: { credits: Math.round((base * CARGO[cargo].pay) / 5) * 5, xp: Math.round(base * 0.45 * CARGO[cargo].xp) },
      tier,
    }
  })
}

/** Objetivo único e automático para a patente: meta simples, sem carga especial e sem cidade fixa. */
export function generateObjective(seed: number, rank: number): Contract {
  const random = seededRandom(seed * 7919 + 13)
  const tier: 1 | 2 | 3 = rank <= 4 ? 1 : rank <= 7 ? 2 : 3
  const objective = objectiveFor(random, rank, tier, 'comum')
  const worth = objective.kind === 'distancia' ? objective.target / 100 * 5 : objective.kind === 'quase-batidas' ? objective.target * 15 : objective.target * 30
  const base = Math.round(worth * (0.9 + tier * 0.25) + 40 * tier)
  return {
    id: `o${seed}`,
    title: 'OBJETIVO',
    city: '',
    cargo: 'comum',
    objective,
    trafficBoost: 1,
    reward: { credits: Math.round(base / 5) * 5, xp: Math.round(base * 0.45) },
    tier,
  }
}

/** O contrato exige a cidade exata (quando tem) ou, nos antigos, só o tema. */
function wrongPlace(contract: Contract, run: RunSummary): boolean {
  if (!contract.cityId && !contract.city) return false // objetivo vale em qualquer cidade
  if (contract.cityId && run.cityId) return run.cityId !== contract.cityId
  return run.city !== contract.city
}

export type ContractOutcome = { completed: boolean; reason: 'ok' | 'wrong-city' | 'cargo-lost' | 'too-slow' | 'objective-missed' | 'unranked' }

/** Decide se a corrida cumpriu o contrato. O objetivo vale a qualquer momento da corrida. */
export function evaluateContract(contract: Contract, run: RunSummary): ContractOutcome {
  if (run.unranked) return { completed: false, reason: 'unranked' }
  if (wrongPlace(contract, run)) return { completed: false, reason: 'wrong-city' }
  if (contract.cargo === 'fragil' && run.hits > 0) return { completed: false, reason: 'cargo-lost' }
  const value = contract.objective.kind === 'distancia' ? run.distance : contract.objective.kind === 'quase-batidas' ? run.nearMisses : run.carsJumped
  if (value < contract.objective.target) return { completed: false, reason: 'objective-missed' }
  if (contract.timeLimit !== undefined && contract.objective.kind === 'distancia' && run.seconds > contract.timeLimit) return { completed: false, reason: 'too-slow' }
  return { completed: true, reason: 'ok' }
}

/** Texto curto do objetivo para a interface. */
export function describeObjective(contract: Contract): string {
  const { kind, target } = contract.objective
  const base = kind === 'distancia' ? `Percorrer ${(target / 1000).toFixed(1).replace('.', ',')} km` : kind === 'quase-batidas' ? `Fazer ${target} quase-batidas` : `Pular ${target} carros`
  return contract.timeLimit !== undefined ? `${base} em até ${contract.timeLimit}s` : base
}

export type ContractLive = {
  value: number
  fraction: number
  /** Objetivo cumprido sem nenhuma regra quebrada: o contrato pode ser entregue agora. */
  delivered: boolean
  failed: 'wrong-city' | 'cargo-lost' | 'too-slow' | null
  /** Segundos restantes do prazo (cargas urgentes). */
  remaining?: number
}

/** Situação do contrato durante a corrida (usada no HUD e para entregar assim que o objetivo é cumprido). */
export function contractLive(contract: Contract, run: RunSummary): ContractLive {
  const { kind, target } = contract.objective
  const value = kind === 'distancia' ? run.distance : kind === 'quase-batidas' ? run.nearMisses : run.carsJumped
  const fraction = Math.min(1, Math.max(0, value / Math.max(1, target)))
  let failed: ContractLive['failed'] = null
  if (wrongPlace(contract, run)) failed = 'wrong-city'
  else if (contract.cargo === 'fragil' && run.hits > 0) failed = 'cargo-lost'
  else if (contract.timeLimit !== undefined && run.seconds > contract.timeLimit && fraction < 1) failed = 'too-slow'
  const remaining = contract.timeLimit !== undefined ? Math.max(0, contract.timeLimit - run.seconds) : undefined
  return { value, fraction, delivered: !failed && !run.unranked && fraction >= 1, failed, remaining }
}
