import { describe, expect, it } from 'vitest'
import { POWERS, POWER_IDS, nextPickupGap, pickPower, powerFraction } from '../src/game/powers'

describe('poderes', () => {
  it('sorteia os três poderes com chance igual e aguenta valores inválidos', () => {
    expect(pickPower(0)).toBe('clear')
    expect(pickPower(0.4)).toBe('wings')
    expect(pickPower(0.99)).toBe('ghost')
    expect(pickPower(1)).toBe('ghost')
    expect(pickPower(Number.NaN)).toBe('clear')
    expect(POWER_IDS.map(id => POWERS[id].id)).toEqual(POWER_IDS)
  })
  it('distância entre orbes fica entre 800 e 1700 m', () => {
    expect(nextPickupGap(0)).toBe(800)
    expect(nextPickupGap(1)).toBe(1700)
    expect(nextPickupGap(5)).toBe(1700)
    expect(nextPickupGap(-1)).toBe(800)
  })
  it('fração restante vai de 1 a 0', () => {
    expect(powerFraction('wings', POWERS.wings.seconds)).toBe(1)
    expect(powerFraction('wings', POWERS.wings.seconds / 2)).toBeCloseTo(0.5)
    expect(powerFraction('wings', -3)).toBe(0)
  })
})
