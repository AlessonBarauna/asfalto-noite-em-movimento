import { describe, expect, it } from 'vitest'
import { ALL_CITY_IDS, CITY_LOOKS, MOODS, cityLook } from '../src/game/city-looks'
import { LANDMARK_IDS } from '../src/game/landmarks'

describe('visual de cada cidade', () => {
  it('toda cidade do mapa tem clima e 3 pontos de referência', () => {
    const missing = ALL_CITY_IDS.filter(id => !CITY_LOOKS[id])
    expect(missing).toEqual([])
    for (const id of ALL_CITY_IDS) expect(CITY_LOOKS[id].marks.length).toBe(3)
  })
  it('só usa monumentos e climas que existem', () => {
    for (const [id, look] of Object.entries(CITY_LOOKS)) {
      expect(MOODS[look.mood], id).toBeDefined()
      for (const mark of look.marks) expect(LANDMARK_IDS, `${id}:${mark}`).toContain(mark)
    }
  })
  it('não há cidade fantasma no quadro e cidade desconhecida cai no padrão', () => {
    const known = new Set(ALL_CITY_IDS)
    expect(Object.keys(CITY_LOOKS).filter(id => !known.has(id))).toEqual([])
    expect(cityLook('inexistente').marks).toEqual([])
  })
  it('as cidades mais icônicas têm os monumentos certos', () => {
    expect(cityLook('paris').marks).toContain('eiffel')
    expect(cityLook('rio-de-janeiro').marks).toContain('cristo')
    expect(cityLook('londres').marks).toContain('bigben')
    expect(cityLook('roma').marks).toContain('coliseu')
    expect(cityLook('cairo').marks).toContain('piramide')
  })
})
