import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { createGolG5Model, GOL_G5_DIMENSIONS } from './gol-g5'

describe('Gol G5 player model', () => {
  it('exposes compact hatchback proportions for the player vehicle', () => {
    expect(GOL_G5_DIMENSIONS.length).toBe(3.95)
    expect(GOL_G5_DIMENSIONS.width).toBe(1.72)
    expect(GOL_G5_DIMENSIONS.height).toBe(1.58)
  })

  it('builds a named, modular model with body, glass, trim, lights and wheels', () => {
    const car = createGolG5Model()
    expect(car.name).toBe('gol-g5-player-car')
    for (const part of ['gol-g5-body-group', 'gol-g5-glass-group', 'gol-g5-trim-group', 'gol-g5-lights-group', 'gol-g5-wheels-group']) {
      expect(car.getObjectByName(part)).toBeDefined()
    }
    expect(car.getObjectByName('gol-g5-body-shell')).toBeDefined()
    expect(car.getObjectByName('gol-g5-windshield')).toBeDefined()
    expect(car.getObjectByName('gol-g5-front-grille')).toBeDefined()
  })

  it('creates four independently named wheels for future rim and tire upgrades', () => {
    const car = createGolG5Model()
    for (const axle of ['front', 'rear']) {
      for (const side of ['left', 'right']) {
        expect(car.getObjectByName(`gol-g5-wheel-${axle}-${side}`)).toBeDefined()
      }
    }
  })

  it('accepts a custom body paint color', () => {
    const car = createGolG5Model('#d71920')
    const shell = car.getObjectByName('gol-g5-body-shell') as import('three').Mesh
    expect(shell.material).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect((shell.material as THREE.MeshPhysicalMaterial).color.getHexString()).toBe('d71920')
  })
})
