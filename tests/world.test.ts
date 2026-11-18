import { describe, expect, it } from 'vitest'
import {
  COUNTRIES, STAGES, buyCity, buyCountry, cityById, cityTicket, countryTicket, defaultWorld, isCountryAvailable, parseWorld, RANKS,
} from '../src/game/career'

describe('mapa-múndi', () => {
  it('ids são únicos e cada país tem fase e cidades válidas', () => {
    const cityIds = COUNTRIES.flatMap(country => country.cities.map(city => city.id))
    expect(new Set(cityIds).size).toBe(cityIds.length)
    expect(new Set(COUNTRIES.map(country => country.id)).size).toBe(COUNTRIES.length)
    for (const country of COUNTRIES) {
      expect(country.cities.length).toBeGreaterThan(0)
      expect(STAGES.some(stage => stage.id === country.stage)).toBe(true)
    }
  })
  it('as fases seguem do menos famoso ao mais famoso e cabem nas patentes', () => {
    const stages = COUNTRIES.map(country => country.stage)
    expect([...stages].sort((a, b) => a - b)).toEqual(stages)
    expect(STAGES[0].name).toBe('Brasil')
    expect(STAGES[STAGES.length - 1].name).toBe('Europa famosa')
    for (const stage of STAGES) expect(stage.rank).toBeLessThanOrEqual(RANKS.length)
    expect(COUNTRIES[COUNTRIES.length - 1].id).toBe('monaco')
  })
  it('começa só com Brasil/São Paulo e a patente libera as fases', () => {
    expect(defaultWorld()).toEqual({ countries: ['brasil'], cities: ['sao-paulo'] })
    expect(isCountryAvailable(1, 'argentina')).toBe(false)
    expect(isCountryAvailable(2, 'argentina')).toBe(true)
    expect(isCountryAvailable(7, 'franca')).toBe(false)
    expect(isCountryAvailable(8, 'franca')).toBe(true)
  })
  it('passagens crescem e a primeira cidade vem com o país', () => {
    expect(countryTicket('brasil')).toBe(0)
    expect(countryTicket('franca')).toBeGreaterThan(countryTicket('argentina'))
    expect(cityTicket('buenos-aires')).toBeGreaterThan(0)
    expect(cityTicket('cordoba')).toBe(0)
    expect(cityTicket('curitiba')).toBeLessThan(cityTicket('rio-de-janeiro'))
  })
  it('compra de país exige patente e créditos e abre a primeira cidade', () => {
    const world = defaultWorld()
    expect(buyCountry(99999, world, 'argentina', 1)).toMatchObject({ success: false, reason: 'rank-locked' })
    expect(buyCountry(0, world, 'argentina', 2)).toMatchObject({ success: false, reason: 'insufficient-credits' })
    const ok = buyCountry(5000, world, 'argentina', 2)
    expect(ok.success).toBe(true)
    if (ok.success) {
      expect(ok.world.cities).toContain('cordoba')
      expect(ok.balance).toBe(5000 - countryTicket('argentina'))
    }
    expect(buyCountry(5000, world, 'brasil', 2)).toMatchObject({ success: false, reason: 'already-owned' })
  })
  it('cidade só depois do país', () => {
    expect(buyCity(99999, defaultWorld(), 'buenos-aires', 9)).toMatchObject({ success: false, reason: 'country-locked' })
    const opened = buyCountry(99999, defaultWorld(), 'argentina', 2)
    if (!opened.success) throw new Error('esperava sucesso')
    const city = buyCity(99999, opened.world, 'buenos-aires', 2)
    expect(city.success).toBe(true)
  })
  it('parseWorld limpa ids inválidos e garante o ponto de partida', () => {
    expect(parseWorld(null)).toEqual(defaultWorld())
    const parsed = parseWorld({ countries: ['argentina', 'marte', 7], cities: ['cordoba', 'cordoba', 'xyz'] })
    expect(parsed.countries).toEqual(['brasil', 'argentina'])
    expect(parsed.cities).toEqual(['sao-paulo', 'cordoba'])
    expect(cityById('paris')?.theme).toBe('cidade')
  })
})
