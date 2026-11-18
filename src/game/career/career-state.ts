/** Estado de carreira salvo no navegador e a função que o atualiza ao fim de cada corrida. */
import { rankLevel, sanitizeXp } from './ranks'
import { evaluateContract, generateBoard, type Contract, type ContractOutcome } from './contracts'
import { unlocksBetween, type UnlockEntry } from './unlocks'
import { cityMultiplier, xpForRun, type RunSummary, type XpBreakdown } from './xp'

export type CareerState = {
  xp: number
  /** Semente do quadro de contratos; muda quando um contrato é concluído ou o quadro é renovado. */
  boardSeed: number
  /** Contrato aceito para a próxima corrida (id do quadro atual) ou '' se nenhum. */
  activeContract: string
  contractsDone: number
  carsJumpedTotal: number
  nearMissTotal: number
  /** Maior distância (m) por cidade. */
  cityBest: Record<string, number>
}

export function defaultCareer(): CareerState {
  return { xp: 0, boardSeed: 1, activeContract: '', contractsDone: 0, carsJumpedTotal: 0, nearMissTotal: 0, cityBest: {} }
}

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : fallback)

export function parseCareer(raw: unknown): CareerState {
  const base = defaultCareer()
  if (!raw || typeof raw !== 'object') return base
  const data = raw as Record<string, unknown>
  const cityBest: Record<string, number> = {}
  if (data.cityBest && typeof data.cityBest === 'object') {
    for (const [city, value] of Object.entries(data.cityBest as Record<string, unknown>)) cityBest[city] = num(value)
  }
  return {
    xp: sanitizeXp(data.xp),
    boardSeed: Math.max(1, num(data.boardSeed, 1)),
    activeContract: typeof data.activeContract === 'string' ? data.activeContract : '',
    contractsDone: num(data.contractsDone),
    carsJumpedTotal: num(data.carsJumpedTotal),
    nearMissTotal: num(data.nearMissTotal),
    cityBest,
  }
}

export type RunReport = {
  career: CareerState
  xp: XpBreakdown
  contract?: { contract: Contract; outcome: ContractOutcome }
  contractCredits: number
  contractXp: number
  cityCreditsMultiplier: number
  rankBefore: number
  rankAfter: number
  newUnlocks: UnlockEntry[]
}

/** Aplica uma corrida ao estado: XP, contrato aceito, recordes, e informa o que mudou de patente. */
export function applyRun(state: CareerState, run: RunSummary, rank: number = rankLevel(state.xp)): RunReport {
  const rankBefore = rankLevel(state.xp)
  const xp = xpForRun(run)
  const board = generateBoard(state.boardSeed, rank)
  const accepted = board.find(contract => contract.id === state.activeContract)
  let contractReport: RunReport['contract']
  let contractCredits = 0
  let contractXp = 0
  let { boardSeed, activeContract, contractsDone } = state
  if (accepted && !run.unranked) {
    const outcome = evaluateContract(accepted, run)
    contractReport = { contract: accepted, outcome }
    if (outcome.completed) {
      contractCredits = accepted.reward.credits
      contractXp = accepted.reward.xp
      contractsDone += 1
      boardSeed += 1 // novo quadro depois de concluir
    }
    activeContract = '' // o contrato vale uma corrida, dê certo ou não
  }
  const cityBest = { ...state.cityBest }
  if (!run.unranked) cityBest[run.city] = Math.max(cityBest[run.city] ?? 0, Math.floor(run.distance))
  const nextXp = state.xp + xp.total + contractXp
  const rankAfter = rankLevel(nextXp)
  return {
    career: {
      xp: nextXp,
      boardSeed,
      activeContract,
      contractsDone,
      carsJumpedTotal: state.carsJumpedTotal + (run.unranked ? 0 : Math.floor(run.carsJumped)),
      nearMissTotal: state.nearMissTotal + (run.unranked ? 0 : Math.floor(run.nearMisses)),
      cityBest,
    },
    xp,
    contract: contractReport,
    contractCredits,
    contractXp,
    cityCreditsMultiplier: cityMultiplier(run.city).credits,
    rankBefore,
    rankAfter,
    newUnlocks: rankAfter > rankBefore ? unlocksBetween(rankBefore, rankAfter) : [],
  }
}
