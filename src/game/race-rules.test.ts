import { describe, expect, it } from 'vitest'
import { calculateScore, chooseSafeAdjacentLane, clampSteering, collides, hasTrafficSpawnGap, isNearMiss, laneCenter, trafficDifficulty, trafficSpeedFactor, trafficWaveSize } from './race-rules'
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

  it('gives vehicle types distinct but deterministic traffic speeds', () => {
    const sedan = trafficSpeedFactor(1.5, 'sedan', 0.5)
    const pickup = trafficSpeedFactor(1.5, 'pickup', 0.5)
    const suv = trafficSpeedFactor(1.5, 'suv', 0.5)
    const van = trafficSpeedFactor(1.5, 'van', 0.5)

    expect(sedan).toBe(1.5)
    expect(sedan).toBeGreaterThan(pickup)
    expect(pickup).toBeGreaterThan(suv)
    expect(suv).toBeGreaterThan(van)
    expect(trafficSpeedFactor(1.5, 'sedan', -1)).toBe(1.35)
    expect(trafficSpeedFactor(1.5, 'sedan', 2)).toBe(1.65)
  })

  it('keeps a minimum gap between vehicles spawning in the same lane', () => {
    expect(hasTrafficSpawnGap([], -100, 26)).toBe(true)
    expect(hasTrafficSpawnGap([-130, -70], -100, 26)).toBe(true)
    expect(hasTrafficSpawnGap([-120, -70], -100, 26)).toBe(false)
    expect(hasTrafficSpawnGap([-125], -100, 26)).toBe(false)
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

  it('chooses a safe adjacent lane to overtake slower traffic', () => {
    const traffic = [
      { lane: 1, z: -100 },
      { lane: 0, z: -82 },
    ]

    expect(chooseSafeAdjacentLane(1, -100, traffic, 26, 1)).toBe(2)
    expect(chooseSafeAdjacentLane(1, -100, [{ lane: 1, z: -100 }], 26, 1)).toBe(2)
  })

  it('uses the other side when the preferred adjacent lane is blocked', () => {
    const traffic = [
      { lane: 2, z: -100 },
      { lane: 0, z: -150 },
    ]

    expect(chooseSafeAdjacentLane(1, -100, traffic, 26, 1)).toBe(0)
  })

  it('does not change lanes when both adjacent lanes are unsafe or unavailable', () => {
    const traffic = [
      { lane: 0, z: -110 },
      { lane: 2, z: -90 },
    ]

    expect(chooseSafeAdjacentLane(1, -100, traffic, 26)).toBeNull()
    expect(chooseSafeAdjacentLane(0, -100, [{ lane: 1, z: -100 }], 26, -1)).toBeNull()
    expect(chooseSafeAdjacentLane(3, -100, [], 26)).toBeNull()
  })

  it('allows a lane when the gap is exactly the minimum distance', () => {
    expect(chooseSafeAdjacentLane(1, -100, [{ lane: 2, z: -126 }], 26)).toBe(2)
  })

  it('introduces multi-car waves gradually and deterministically', () => {
    expect(trafficWaveSize(4, 0)).toBe(1)
    expect(trafficWaveSize(10, 0.1)).toBe(2)
    expect(trafficWaveSize(30, 0.29)).toBe(2)
    expect(trafficWaveSize(50, 0.39)).toBe(2)
    expect(trafficWaveSize(50, 0.4)).toBe(1)
  })
})
