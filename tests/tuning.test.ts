import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_RACE_CONFIG, RACE_CONFIG } from '../src/game/race-config'
import { tuning } from '../src/game/tuning'

const defaults = Object.fromEntries(tuning.controls.map(control => [control.id, control.default]))

afterEach(() => {
  tuning.apply(defaults)
  tuning.activate('run')
})

describe('Tweak de corrida', () => {
  it('valida o patch inteiro antes de salvar valores solicitados', () => {
    const before = tuning.read()
    for (const patch of [
      { 'race.startSpeed': 30, unknown: 4 },
      { 'race.startSpeed': 999 },
      { 'race.startSpeed': 20.5 },
      { 'race.steerSpeed': '8' },
      { 'race.startingLives': Infinity },
    ]) {
      expect(() => tuning.apply(patch)).toThrow()
      expect(tuning.read()).toEqual(before)
    }
    tuning.apply({ 'race.startSpeed': 30, 'race.startingLives': 5 })
    expect(tuning.read().requested['race.startSpeed']).toBe(30)
    expect(tuning.read().active['race.startSpeed']).toBe(DEFAULT_RACE_CONFIG.startSpeed)
    expect(RACE_CONFIG.startSpeed).toBe(DEFAULT_RACE_CONFIG.startSpeed)
  })

  it('ativa parâmetros de jogabilidade somente na próxima corrida', () => {
    tuning.apply({ 'race.steerSpeed': 8, 'race.trafficInterval': 0.92 })
    expect(RACE_CONFIG.steerSpeed).toBe(DEFAULT_RACE_CONFIG.steerSpeed)
    expect(tuning.unranked).toBe(false)
    tuning.activate('jump')
    expect(RACE_CONFIG.steerSpeed).toBe(DEFAULT_RACE_CONFIG.steerSpeed)
    tuning.activate('run')
    expect(RACE_CONFIG.steerSpeed).toBe(8)
    expect(RACE_CONFIG.trafficInterval).toBe(0.92)
    expect(tuning.unranked).toBe(true)
  })

  it('mantém a tentativa ajustada sem ranking até uma nova corrida padrão', () => {
    tuning.activate('run')
    tuning.apply({ 'race.startSpeed': 28 })
    expect(tuning.unranked).toBe(false)
    tuning.activate('run')
    expect(tuning.unranked).toBe(true)
    tuning.apply(defaults)
    expect(tuning.unranked).toBe(true)
    tuning.activate('run')
    expect(tuning.unranked).toBe(false)
    expect(RACE_CONFIG.startSpeed).toBe(DEFAULT_RACE_CONFIG.startSpeed)
  })
})
