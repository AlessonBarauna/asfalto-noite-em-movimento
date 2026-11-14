import { describe, expect, it } from 'vitest'
import { RACE_CONFIG } from '../src/game/race-config'
import { calculateScore, clampSteering, collides, isNearMiss, laneCenter, trafficDifficulty, trafficWaveSize } from '../src/game/race-rules'

describe('regras da corrida de tráfego', () => {
  it('centraliza as três faixas e mantém a direção dentro do asfalto', () => {
    expect(laneCenter(0)).toBeCloseTo(-RACE_CONFIG.laneWidth)
    expect(laneCenter(1)).toBe(0)
    expect(laneCenter(2)).toBeCloseTo(RACE_CONFIG.laneWidth)
    expect(clampSteering(-999)).toBe(-RACE_CONFIG.roadHalfWidth + 1)
    expect(clampSteering(999)).toBe(RACE_CONFIG.roadHalfWidth - 1)
  })

  it('detecta a colisão sem depender da interface ou do renderer', () => {
    expect(collides(0, 5.2, 0, 5.2)).toBe(true)
    expect(collides(0, 5.2, 6, 5.2)).toBe(false)
    expect(collides(0, 5.2, 0, -20)).toBe(false)
  })

  it('registra desvio próximo, mas não a batida nem a passagem distante', () => {
    expect(isNearMiss(0, 2)).toBe(true)
    expect(isNearMiss(0, 1.4)).toBe(false)
    expect(isNearMiss(0, 4.2)).toBe(false)
  })

  it('recompensa a distância e os desvios sem alterar a corrida anterior', () => {
    const base = calculateScore(1000, 0)
    expect(base).toBeGreaterThan(0)
    expect(calculateScore(1400, 0)).toBeGreaterThan(base)
    expect(calculateScore(1000, 3)).toBeGreaterThan(base)
  })

  it('introduz ondas com dois carros só depois que o jogador teve tempo de aprender', () => {
    expect(trafficWaveSize(3, 0)).toBe(1)
    expect(trafficWaveSize(12, 0.1)).toBe(2)
    expect(trafficWaveSize(30, 0.29)).toBe(2)
    expect(trafficWaveSize(60, 0.39)).toBe(2)
    expect(trafficWaveSize(60, 0.8)).toBe(1)
  })

  it('aperta o intervalo de trânsito e limita a progressão da dificuldade', () => {
    const calm = trafficDifficulty(0)
    const intense = trafficDifficulty(300)
    expect(calm.interval).toBeGreaterThan(intense.interval)
    expect(intense.interval).toBeGreaterThanOrEqual(RACE_CONFIG.minTrafficInterval)
    expect(intense.speedFactor).toBeGreaterThan(calm.speedFactor)
  })
})
