import { describe, expect, it } from 'vitest'
import { COUNTRIES, cityDifficulty, cityRain, WEATHER_CITIES, xpForRun } from '../src/game/career'

const ids = new Set(COUNTRIES.flatMap(country => country.cities.map(city => city.id)))

describe('dificuldade por cidade', () => {
  it('começa em 1 em São Paulo (megacidade, fase 1 = +8%) e nunca passa de 1,4', () => {
    expect(cityDifficulty('brasilia')).toBe(1)
    expect(cityDifficulty('sao-paulo')).toBe(1.08)
    for (const id of ids) {
      expect(cityDifficulty(id)).toBeGreaterThanOrEqual(1)
      expect(cityDifficulty(id)).toBeLessThanOrEqual(1.4)
    }
  })
  it('cidades mais avançadas no mapa têm mais trânsito', () => {
    expect(cityDifficulty('paris')).toBeGreaterThan(cityDifficulty('curitiba'))
  })
  it('todas as cidades das listas de clima existem e nenhuma é chuvosa e seca ao mesmo tempo', () => {
    for (const set of Object.values(WEATHER_CITIES)) for (const id of set) expect(ids.has(id), id).toBe(true)
    for (const id of WEATHER_CITIES.rainy) expect(WEATHER_CITIES.dry.has(id), id).toBe(false)
  })
  it('clima da cidade vence o do tema; sem regra usa o do tema', () => {
    expect(cityRain('londres', false)).toBe(true)
    expect(cityRain('madri', true)).toBe(false)
    expect(cityRain('brasilia', true)).toBe(true)
    expect(cityRain('brasilia', false)).toBe(false)
  })
  it('XP sobe com a dificuldade da cidade', () => {
    const run = { distance: 5000, nearMisses: 10, carsJumped: 5, hits: 0, seconds: 100, city: 'cidade' }
    expect(xpForRun({ ...run, cityId: 'paris' }).total).toBeGreaterThan(xpForRun({ ...run, cityId: 'brasilia' }).total)
  })
})
