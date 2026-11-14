import { describe, expect, it } from 'vitest'
import { calculateRacePayout } from './economy'

describe('race economy', () => {
  it('rewards distance in complete 100 m blocks', () => {
    expect(calculateRacePayout(299, 0)).toEqual({ credits: 10, distanceCredits: 10, nearMissCredits: 0 })
  })

  it('adds a bonus for each near miss', () => {
    expect(calculateRacePayout(1000, 3)).toEqual({ credits: 95, distanceCredits: 50, nearMissCredits: 45 })
  })

  it('never pays for negative or invalid values', () => {
    expect(calculateRacePayout(-500, -2)).toEqual({ credits: 0, distanceCredits: 0, nearMissCredits: 0 })
    expect(calculateRacePayout(Number.NaN, Number.POSITIVE_INFINITY).credits).toBe(0)
  })
})
