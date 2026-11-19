import { describe, expect, it } from 'vitest'
import { MAX_POWER_LEVEL, POWERS, POWER_IDS, buyPowerUpgrade, defaultPowerLevels, nextPickupGap, parsePowerLevels, pickPower, powerDuration, powerFraction, upgradeCost } from '../src/game/powers'

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

describe('evolução dos poderes', () => {
  it('a duração cresce a cada nível e o preço também', () => {
    expect(powerDuration('wings', 0)).toBe(POWERS.wings.seconds)
    expect(powerDuration('wings', 5)).toBeGreaterThan(powerDuration('wings', 1))
    expect(powerDuration('clear', 99)).toBe(powerDuration('clear', MAX_POWER_LEVEL))
    expect(upgradeCost('ghost', 3)!).toBeGreaterThan(upgradeCost('ghost', 2)!)
    expect(upgradeCost('ghost', 0)!).toBeGreaterThan(upgradeCost('clear', 0)!)
    expect(upgradeCost('clear', MAX_POWER_LEVEL)).toBeNull()
  })
  it('compra desconta créditos, sobe o nível e respeita limites', () => {
    const levels = defaultPowerLevels()
    expect(buyPowerUpgrade(0, levels, 'clear')).toMatchObject({ success: false, reason: 'insufficient-credits' })
    const ok = buyPowerUpgrade(1000, levels, 'clear')
    expect(ok.success).toBe(true)
    if (ok.success) {
      expect(ok.levels.clear).toBe(1)
      expect(ok.balance).toBe(1000 - upgradeCost('clear', 0)!)
      expect(levels.clear).toBe(0)
    }
    const maxed = { clear: MAX_POWER_LEVEL, wings: 0, ghost: 0 }
    expect(buyPowerUpgrade(1e9, maxed, 'clear')).toMatchObject({ success: false, reason: 'max-level' })
  })
  it('parsePowerLevels limpa valores inválidos', () => {
    expect(parsePowerLevels(null)).toEqual({ clear: 0, wings: 0, ghost: 0 })
    expect(parsePowerLevels({ clear: 3.7, wings: -2, ghost: 'x' })).toEqual({ clear: 3, wings: 0, ghost: 0 })
    expect(parsePowerLevels({ clear: 500 }).clear).toBe(MAX_POWER_LEVEL)
  })
})
