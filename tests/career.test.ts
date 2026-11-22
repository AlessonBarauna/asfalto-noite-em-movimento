import { describe, expect, it } from 'vitest'
import {
  LEGEND_STAR_XP, RANKS, applyRun, availableCargo, generateObjective, defaultCareer, evaluateContract, generateBoard, isUnlocked,
  nextUnlocks, parseCareer, rankLabel, rankStatus, requiredRank, unlocksBetween, xpForRun, UNLOCKS,
} from '../src/game/career'

const run = (over: Partial<Parameters<typeof xpForRun>[0]> = {}) => ({ distance: 2000, nearMisses: 10, carsJumped: 3, seconds: 90, hits: 1, city: 'cidade', ...over })

describe('patentes', () => {
  it('começa Novato e sobe nos limiares exatos', () => {
    expect(rankStatus(0).rank.name).toBe('Novato')
    expect(rankStatus(249).rank.level).toBe(1)
    expect(rankStatus(250).rank.level).toBe(2)
    expect(rankStatus(27000).rank.level).toBe(10)
  })
  it('limiares crescem sempre', () => {
    for (let i = 1; i < RANKS.length; i += 1) expect(RANKS[i].xp).toBeGreaterThan(RANKS[i - 1].xp)
  })
  it('depois da última patente soma estrelas sem limite', () => {
    expect(rankStatus(27000 + LEGEND_STAR_XP * 3 + 10).legendStars).toBe(3)
    expect(rankLabel(27000 + LEGEND_STAR_XP * 2)).toBe('Lenda do Asfalto ★2')
  })
  it('progresso fica entre 0 e 1 e ignora lixo', () => {
    expect(rankStatus(Number.NaN).rank.level).toBe(1)
    expect(rankStatus(-50).xp).toBe(0)
    const p = rankStatus(1000).progress
    expect(p).toBeGreaterThan(0)
    expect(p).toBeLessThan(1)
  })
})

describe('desbloqueios', () => {
  it('só o básico está liberado na patente 1', () => {
    expect(isUnlocked(1, 'city-cidade')).toBe(true)
    expect(isUnlocked(1, 'vehicle-gol-g5')).toBe(true)
    expect(isUnlocked(1, 'city-serra')).toBe(false)
    expect(isUnlocked(1, 'mode-contratos')).toBe(false)
    expect(isUnlocked(1, 'vehicle-supercar')).toBe(false)
  })
  it('cada cidade e carro exige a patente definida', () => {
    expect(requiredRank('city-serra')).toBe(4)
    expect(requiredRank('city-deserto')).toBe(7)
    expect(requiredRank('vehicle-supercar')).toBe(10)
    expect(requiredRank('id-que-nao-existe')).toBe(1)
  })
  it('lista o que abre ao subir, inclusive patentes puladas', () => {
    expect(unlocksBetween(1, 2).map(u => u.id)).toContain('garage-paint')
    expect(unlocksBetween(1, 4).map(u => u.id)).toEqual(expect.arrayContaining(['mode-contratos', 'city-serra']))
    expect(unlocksBetween(4, 4)).toEqual([])
  })
  it('mostra os próximos desbloqueios e acaba no topo', () => {
    expect(nextUnlocks(1).every(u => u.rank === 2)).toBe(true)
    expect(nextUnlocks(10)).toEqual([])
  })
  it('ids são únicos e patentes ficam dentro das existentes', () => {
    expect(new Set(UNLOCKS.map(u => u.id)).size).toBe(UNLOCKS.length)
    for (const u of UNLOCKS) expect(u.rank).toBeLessThanOrEqual(RANKS.length)
  })
})

describe('xp da corrida', () => {
  it('soma distância, quase-batidas, pulos e bônus sem batida', () => {
    const x = xpForRun(run({ hits: 0 }))
    expect(x.distance).toBe(120)
    expect(x.nearMisses).toBe(40)
    expect(x.jumps).toBe(24)
    expect(x.flawless).toBe(80)
    expect(x.total).toBe(264)
  })
  it('com batida não ganha o bônus', () => {
    expect(xpForRun(run({ hits: 2 })).flawless).toBe(0)
  })
  it('cidade difícil rende mais e corrida sem ranking rende zero', () => {
    expect(xpForRun(run({ city: 'deserto' })).total).toBeGreaterThan(xpForRun(run()).total)
    expect(xpForRun(run({ unranked: true })).total).toBe(0)
  })
  it('não aceita números inválidos', () => {
    expect(xpForRun(run({ distance: Number.NaN, nearMisses: -4, carsJumped: Number.POSITIVE_INFINITY })).total).toBe(0)
  })
})

describe('contratos', () => {
  it('o mesmo seed gera o mesmo quadro e seeds diferentes mudam', () => {
    expect(generateBoard(7, 5)).toEqual(generateBoard(7, 5))
    expect(JSON.stringify(generateBoard(7, 5))).not.toBe(JSON.stringify(generateBoard(8, 5)))
  })
  it('só usa cidades liberadas e cargas da patente', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      for (const c of generateBoard(seed, 3)) {
        expect(c.city).toBe('cidade')
        expect(c.cargo).toBe('comum')
      }
      for (const c of generateBoard(seed, 5)) {
        expect(['cidade', 'serra']).toContain(c.city)
        expect(availableCargo(5)).toContain(c.cargo)
      }
    }
  })
  it('recompensas crescem com a dificuldade e são positivas', () => {
    const [easy, , hard] = generateBoard(3, 6)
    expect(easy.reward.credits).toBeGreaterThan(0)
    expect(hard.reward.credits).toBeGreaterThan(easy.reward.credits)
  })
  it('carga frágil falha com batida, urgente falha com atraso', () => {
    const base = generateBoard(1, 6)[0]
    const fragile = { ...base, cargo: 'fragil' as const, objective: { kind: 'distancia' as const, target: 1000 }, city: 'cidade', timeLimit: undefined }
    expect(evaluateContract(fragile, run({ distance: 1500, hits: 1 })).reason).toBe('cargo-lost')
    expect(evaluateContract(fragile, run({ distance: 1500, hits: 0 })).completed).toBe(true)
    const urgent = { ...fragile, cargo: 'urgente' as const, timeLimit: 60 }
    expect(evaluateContract(urgent, run({ distance: 1500, seconds: 61 })).reason).toBe('too-slow')
    expect(evaluateContract(urgent, run({ distance: 1500, seconds: 50 })).completed).toBe(true)
  })
  it('exige a cidade certa e o objetivo', () => {
    const c = { ...generateBoard(2, 6)[0], city: 'serra', cargo: 'comum' as const, objective: { kind: 'pulos' as const, target: 3 }, timeLimit: undefined }
    expect(evaluateContract(c, run({ city: 'cidade', carsJumped: 9 })).reason).toBe('wrong-city')
    expect(evaluateContract(c, run({ city: 'serra', carsJumped: 2 })).reason).toBe('objective-missed')
    expect(evaluateContract(c, run({ city: 'serra', carsJumped: 3 })).completed).toBe(true)
  })
})

describe('estado da carreira', () => {
  it('aceita save antigo ou corrompido', () => {
    expect(parseCareer(undefined)).toEqual(defaultCareer())
    expect(parseCareer({ xp: 'lixo', boardSeed: -5, cityBest: { cidade: 'x', serra: 900.7 } })).toMatchObject({ xp: 0, boardSeed: 1, cityBest: { cidade: 0, serra: 900 } })
  })
  it('corrida soma XP, recorde por cidade e totais', () => {
    const r = applyRun(defaultCareer(), run())
    expect(r.career.xp).toBe(r.xp.total)
    expect(r.career.cityBest.cidade).toBe(2000)
    expect(r.career.carsJumpedTotal).toBe(3)
    expect(r.career.nearMissTotal).toBe(10)
  })
  it('subir de patente informa os desbloqueios', () => {
    const r = applyRun({ ...defaultCareer(), xp: 240 }, run({ distance: 3000 }))
    expect(r.rankBefore).toBe(1)
    expect(r.rankAfter).toBeGreaterThanOrEqual(2)
    expect(r.newUnlocks.map(u => u.id)).toContain('garage-paint')
  })
  it('objetivo cumprido paga e sorteia um novo', () => {
    const state = { ...defaultCareer(), xp: 800, boardSeed: 5 }
    const target = generateObjective(5, 3)
    const accepted = { ...state, activeContract: target.id }
    const done = applyRun(accepted, run({ city: target.city, distance: 99999, nearMisses: 999, carsJumped: 999, seconds: 1, hits: 0 }))
    expect(done.contract?.outcome.completed).toBe(true)
    expect(done.contractCredits).toBe(target.reward.credits)
    expect(done.career.boardSeed).toBe(6)
    expect(done.career.activeContract).toBe('')
    expect(done.career.contractsDone).toBe(1)
  })
  it('objetivo não cumprido continua valendo na próxima corrida', () => {
    const state = { ...defaultCareer(), xp: 800, boardSeed: 5 }
    const target = generateObjective(5, 3)
    const failed = applyRun({ ...state, activeContract: target.id }, run({ city: target.city, distance: 10, nearMisses: 0, carsJumped: 0 }))
    expect(failed.contractCredits).toBe(0)
    expect(failed.career.boardSeed).toBe(5)
    expect(failed.career.activeContract).toBe(target.id)
  })
  it('corrida sem ranking não dá XP nem mexe no contrato', () => {
    const state = { ...defaultCareer(), activeContract: 'c1-0' }
    const r = applyRun(state, run({ unranked: true }))
    expect(r.career.xp).toBe(0)
    expect(r.career.activeContract).toBe('c1-0')
  })
})

describe('objetivo automático', () => {
  it('é determinístico, sem carga especial nem cidade fixa', () => {
    const o = generateObjective(4, 5)
    expect(o).toEqual(generateObjective(4, 5))
    expect(o.cargo).toBe('comum')
    expect(o.cityId).toBeUndefined()
    expect(o.reward.credits).toBeGreaterThan(0)
  })
  it('vale em qualquer cidade', () => {
    const o = generateObjective(2, 3)
    const big = { distance: 99999, nearMisses: 999, carsJumped: 999, hits: 0, seconds: 1, city: 'deserto', cityId: 'cairo' }
    expect(evaluateContract(o, big as never).completed).toBe(true)
  })
})
