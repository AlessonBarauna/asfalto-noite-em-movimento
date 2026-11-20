import { describe, expect, it } from 'vitest'
import { contractLive, deliverContract, defaultCareer, generateBoard, citiesByTheme, type Contract } from '../src/game/career'

const base = { distance: 0, nearMisses: 0, carsJumped: 0, hits: 0, seconds: 0, city: 'cidade' }
const contract = (over: Partial<Contract> = {}): Contract => ({
  id: 'c1-0', title: 'Teste', city: 'cidade', cargo: 'comum', objective: { kind: 'distancia', target: 2000 }, trafficBoost: 1,
  reward: { credits: 300, xp: 120 }, tier: 1, ...over,
})

describe('contrato durante a corrida', () => {
  it('mostra o progresso e entrega ao cumprir o objetivo', () => {
    expect(contractLive(contract(), { ...base, distance: 500 })).toMatchObject({ fraction: 0.25, delivered: false, failed: null })
    expect(contractLive(contract(), { ...base, distance: 2100 })).toMatchObject({ fraction: 1, delivered: true })
  })
  it('carga frágil falha na primeira batida, mas não depois de entregue', () => {
    const frag = contract({ cargo: 'fragil' })
    expect(contractLive(frag, { ...base, distance: 1000, hits: 1 }).failed).toBe('cargo-lost')
    expect(contractLive(frag, { ...base, distance: 2000, hits: 0 }).delivered).toBe(true)
  })
  it('carga urgente tem prazo e mostra o tempo restante', () => {
    const urgent = contract({ cargo: 'urgente', timeLimit: 60 })
    expect(contractLive(urgent, { ...base, distance: 500, seconds: 20 }).remaining).toBe(40)
    expect(contractLive(urgent, { ...base, distance: 500, seconds: 61 }).failed).toBe('too-slow')
    expect(contractLive(urgent, { ...base, distance: 2000, seconds: 59 }).delivered).toBe(true)
  })
  it('cenário errado falha e corrida sem ranking não entrega', () => {
    expect(contractLive(contract({ city: 'serra' }), { ...base, distance: 2000 }).failed).toBe('wrong-city')
    expect(contractLive(contract(), { ...base, distance: 2000, unranked: true }).delivered).toBe(false)
  })
})

describe('entrega do contrato', () => {
  it('paga XP, limpa o contrato e troca o quadro', () => {
    const board = generateBoard(1, 3)
    const state = { ...defaultCareer(), xp: 700, activeContract: board[0].id }
    const report = deliverContract(state, board[0])
    expect(report).not.toBeNull()
    expect(report!.career.activeContract).toBe('')
    expect(report!.career.boardSeed).toBe(2)
    expect(report!.career.contractsDone).toBe(1)
    expect(report!.career.xp).toBe(700 + board[0].reward.xp)
    expect(report!.credits).toBe(board[0].reward.credits)
  })
  it('não entrega contrato que não é o aceito', () => {
    const board = generateBoard(1, 3)
    expect(deliverContract({ ...defaultCareer(), activeContract: '' }, board[0])).toBeNull()
    expect(deliverContract({ ...defaultCareer(), activeContract: board[1].id }, board[0])).toBeNull()
  })
  it('lista cidades por tema para ajudar a escolher o destino', () => {
    expect(citiesByTheme('serra').some(city => city.id === 'curitiba')).toBe(true)
    expect(citiesByTheme('deserto').length).toBeGreaterThan(0)
  })
})

describe('contratos por cidade do mapa', () => {
  it('sorteia o destino entre as cidades que o jogador tem e paga mais nas fases distantes', () => {
    const owned = ['sao-paulo', 'paris']
    const board = generateBoard(3, 8, owned)
    for (const entry of board) {
      expect(owned).toContain(entry.cityId)
      expect(entry.title).toContain(entry.cityName!)
    }
    const same = generateBoard(3, 8, owned)
    expect(same.map(c => c.id)).toEqual(board.map(c => c.id))
  })
  it('sem cidades informadas mantém o comportamento antigo por tema', () => {
    const board = generateBoard(3, 3)
    expect(board.every(entry => entry.cityId === undefined)).toBe(true)
  })
  it('exige a cidade exata quando o contrato tem cityId', () => {
    const c = contract({ cityId: 'paris', cityName: 'Paris', city: 'cidade' })
    expect(contractLive(c, { ...base, distance: 500, cityId: 'paris' }).failed).toBeNull()
    expect(contractLive(c, { ...base, distance: 500, cityId: 'sao-paulo' }).failed).toBe('wrong-city')
    // mesmo tema, cidade errada: ainda falha
    expect(contractLive(c, { ...base, distance: 2000, cityId: 'londres' }).delivered).toBe(false)
  })
  it('guarda uma cópia do contrato aceito no estado', () => {
    const board = generateBoard(1, 3, ['sao-paulo'])
    const state = { ...defaultCareer(), activeContract: board[0].id, activeData: board[0] }
    const report = deliverContract(state, board[0])
    expect(report!.career.activeData).toBeNull()
  })
})
