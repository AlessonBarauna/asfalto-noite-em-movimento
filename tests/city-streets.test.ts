import { describe, expect, it } from 'vitest'
import { CITY_STREETS, streetOf, waterSide } from '../src/game/city-streets'
import { CITY_LOOKS } from '../src/game/city-looks'
import { cityById } from '../src/game/career/world'

describe('ruas por cidade', () => {
  it('só usa cidades que existem no mapa e nunca repete uma cidade em dois estilos', () => {
    for (const id of Object.keys(CITY_STREETS)) {
      expect(cityById(id), id).toBeTruthy()
      expect(CITY_LOOKS[id], id).toBeTruthy()
    }
  })
  it('as cidades-ícone têm a rua certa', () => {
    expect(streetOf('veneza')).toBe('canal')
    expect(streetOf('rio-de-janeiro')).toBe('beach')
    expect(streetOf('oslo')).toBe('snow')
    expect(streetOf('praga')).toBe('cobble')
    expect(streetOf('sao-paulo')).toBeNull()
  })
  it('o lado do mar é estável por cidade', () => {
    expect(waterSide('rio-de-janeiro')).toBe(waterSide('rio-de-janeiro'))
    expect([1, -1]).toContain(waterSide('miami'))
  })
})
