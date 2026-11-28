import { describe, expect, it } from 'vitest'
import { GLB_CAR_LIST, trafficCarsForStage } from '../src/game/glb-car-list'

describe('trânsito por fase do mapa', () => {
  const price = (id: string) => GLB_CAR_LIST.find(c => c.id === id)!.price
  const avg = (ids: string[]) => ids.reduce((s, id) => s + price(id), 0) / ids.length
  it('fases mais caras recebem carros mais caros', () => {
    const avgs = [1, 2, 3, 4, 5, 6, 7, 8].map(stage => avg(trafficCarsForStage(stage)))
    for (let i = 1; i < avgs.length; i += 1) expect(avgs[i]).toBeGreaterThanOrEqual(avgs[i - 1])
    expect(avgs[7]).toBeGreaterThan(avgs[0] * 3)
  })
  it('sempre devolve a quantidade pedida, só de carros existentes', () => {
    for (const stage of [0, 1, 5, 8, 99]) {
      const ids = trafficCarsForStage(stage, 6)
      expect(ids).toHaveLength(6)
      expect(ids.every(id => GLB_CAR_LIST.some(c => c.id === id))).toBe(true)
    }
  })
})
