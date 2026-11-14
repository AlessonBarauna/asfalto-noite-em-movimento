import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BRAZILIAN_TRAFFIC_MODELS, createBrazilianTrafficVehicle } from './traffic-vehicles'

describe('Brazilian traffic fleet', () => {
  it('includes nine recognizable everyday Brazilian vehicle models', () => {
    expect(BRAZILIAN_TRAFFIC_MODELS.map(model => model.id)).toEqual([
      'gol-g5', 'uno', 'palio', 'celta', 'corsa', 'onix', 'hb20', 'saveiro', 'fiorino',
    ])
  })

  it('keeps every vehicle inside compact road-friendly dimensions', () => {
    for (const model of BRAZILIAN_TRAFFIC_MODELS) {
      expect(model.width).toBeGreaterThanOrEqual(1.6)
      expect(model.width).toBeLessThan(1.9)
      expect(model.length).toBeGreaterThan(3.5)
      expect(model.length).toBeLessThan(4.6)
      expect(model.wheelBase).toBeLessThan(model.length)
    }
  })

  it('creates distinct named 3D groups and separate upgrade-friendly parts', () => {
    for (const model of BRAZILIAN_TRAFFIC_MODELS) {
      const car = createBrazilianTrafficVehicle(model.id, '#c62828')
      expect(car.name).toBe(`traffic-${model.id}`)
      expect(car.getObjectByName('traffic-body')).toBeInstanceOf(THREE.Group)
      expect(car.getObjectByName('traffic-wheels')).toBeInstanceOf(THREE.Group)
      expect(car.getObjectByName('traffic-front-grille')).toBeInstanceOf(THREE.Mesh)
      expect(car.getObjectByName('traffic-headlight-1')).toBeInstanceOf(THREE.Mesh)
      expect(car.getObjectByName('traffic-taillight--1')).toBeInstanceOf(THREE.Mesh)
    }
  })

  it('builds the Saveiro cargo bed and Fiorino high roof as separate parts', () => {
    const saveiro = createBrazilianTrafficVehicle('saveiro', '#777777')
    const fiorino = createBrazilianTrafficVehicle('fiorino', '#eeeeee')
    expect(saveiro.getObjectByName('saveiro-bed-floor')).toBeDefined()
    expect(saveiro.getObjectByName('saveiro-bed-rail-1')).toBeDefined()
    expect(fiorino.getObjectByName('fiorino-cargo-box')).toBeDefined()
  })

  it('accepts different paint colors for the same model', () => {
    const red = createBrazilianTrafficVehicle('gol-g5', '#c62828')
    const blue = createBrazilianTrafficVehicle('gol-g5', '#1565c0')
    const redShell = red.getObjectByName('traffic-body-shell') as THREE.Mesh
    const blueShell = blue.getObjectByName('traffic-body-shell') as THREE.Mesh
    expect((redShell.material as THREE.MeshPhysicalMaterial).color.getHexString()).toBe('c62828')
    expect((blueShell.material as THREE.MeshPhysicalMaterial).color.getHexString()).toBe('1565c0')
  })
})
