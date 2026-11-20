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
  /** Cópia do contrato aceito (o quadro muda quando o jogador compra cidades). */
  activeData: Contract | null
  contractsDone: number
  carsJumpedTotal: number
  nearMissTotal: number
  /** Maior distância (m) por cidade. */
  cityBest: Record<string, number>
}

export function defaultCareer(): CareerState {
  return { xp: 0, boardSeed: 1, activeContract: '', activeData: null, contractsDone: 0, carsJumpedTotal: 0, nearMissTotal: 0, cityBest: {} }
}

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : fallback)

function parseContract(raw: unknown): Contract | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Partial<Contract>
  if (typeof c.id !== 'string' || typeof c.city !== 'string' || typeof c.title !== 'string' || !c.objective || !c.reward) return null
  if (typeof c.objective.target !== 'number' || typeof c.reward.credits !== 'number' || typeof c.reward.xp !== 'number') return null
  return c as Contract
}

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
    activeData: parseContract(data.activeData),
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
  const accepted = state.activeData && state.activeData.id === state.activeContract ? state.activeData : board.find(contract => contract.id === state.activeContract)
  let contractReport: RunReport['contract']
  let contractCredits = 0
  let contractXp = 0
  let { boardSeed, activeContract, activeData, contractsDone } = state
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
    activeData = null
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
      activeData,
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

export type DeliveryReport = {
  career: CareerState
  contract: Contract
  credits: number
  xp: number
  rankBefore: number
  rankAfter: number
  newUnlocks: ReturnType<typeof unlocksBetween>
}

/** Entrega o contrato aceito no instante em que o objetivo é cumprido (sem esperar a corrida acabar). */
export function deliverContract(state: CareerState, contract: Contract): DeliveryReport | null {
  if (!state.activeContract || state.activeContract !== contract.id) return null
  const rankBefore = rankLevel(state.xp)
  const xp = state.xp + contract.reward.xp
  const rankAfter = rankLevel(xp)
  return {
    career: { ...state, xp, activeContract: '', activeData: null, boardSeed: state.boardSeed + 1, contractsDone: state.contractsDone + 1 },
    contract,
    credits: contract.reward.credits,
    xp: contract.reward.xp,
    rankBefore,
    rankAfter,
    newUnlocks: rankAfter > rankBefore ? unlocksBetween(rankBefore, rankAfter) : [],
  }
}
