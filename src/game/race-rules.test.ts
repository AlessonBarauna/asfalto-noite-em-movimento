import { describe, expect, it } from 'vitest'
import { calculateScore, clampSteering, collides, isNearMiss, laneCenter, trafficDifficulty, trafficWaveSize } from './race-rules'
import { RACE_CONFIG } from './race-config'

describe('race rules', () => {
  it('centers the three traffic lanes symmetrically', () => {
    expect(laneCenter(0)).toBe(-RACE_CONFIG.laneWidth)
    expect(laneCenter(1)).toBe(0)
    expect(laneCenter(2)).toBe(RACE_CONFIG.laneWidth)
  })

  it('keeps steering inside the road limits', () => {
    const limit = RACE_CONFIG.roadHalfWidth - 1
    expect(clampSteering(-100)).toBe(-limit)
    expect(clampSteering(100)).toBe(limit)
    expect(clampSteering(1.25)).toBe(1.25)
  })

  it('calculates score without rewarding negative distance or near misses', () => {
    expect(calculateScore(100.9, 2.8)).toBe(1700)
    expect(calculateScore(-10, -2)).toBe(0)
  })

  it('detects collisions and near misses at their boundaries', () => {
    expect(collides(0, 0, 1.51, 3.24)).toBe(true)
    expect(collides(0, 0, 1.52, 0)).toBe(false)
    expect(isNearMiss(0, 1.52)).toBe(true)
    expect(isNearMiss(0, 4.15)).toBe(false)
  })

  it('increases traffic difficulty over time without exceeding configured limits', () => {
    const early = trafficDifficulty(0)
    const middle = trafficDifficulty(60)
    const late = trafficDifficulty(600)

    expect(middle.interval).toBeLessThan(early.interval)
    expect(middle.speedFactor).toBeGreaterThan(early.speedFactor)
    expect(late.interval).toBe(RACE_CONFIG.minTrafficInterval)
    expect(late.speedFactor).toBe(1.66)
  })

  it('introduces multi-car waves gradually and deterministically', () => {
    expect(trafficWaveSize(4, 0)).toBe(1)
    expect(trafficWaveSize(10, 0.1)).toBe(2)
    expect(trafficWaveSize(30, 0.29)).toBe(2)
    expect(trafficWaveSize(50, 0.39)).toBe(2)
    expect(trafficWaveSize(50, 0.4)).toBe(1)
  })
})
