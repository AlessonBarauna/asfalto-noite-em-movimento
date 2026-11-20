import { describe, expect, it } from 'vitest'
import { steerSpeedFactor } from '../src/game/race-rules'

describe('steerSpeedFactor', () => {
  it('não muda em velocidades baixas e sobe até +50%', () => {
    expect(steerSpeedFactor(16)).toBe(1)
    expect(steerSpeedFactor(30)).toBe(1)
    expect(steerSpeedFactor(80)).toBeCloseTo(1.25)
    expect(steerSpeedFactor(400)).toBe(1.5)
  })
})
