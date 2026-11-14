import { describe, expect, it } from 'vitest'
import { defaultSave, parseSave } from './save'

describe('versioned save and vehicle unlock migration', () => {
  it('starts a new profile with only the Gol G5 unlocked', () => {
    const save = defaultSave()
    expect(save.version).toBe(4)
    expect(save.playerVehicle).toBe('gol-g5')
    expect(save.unlockedVehicles).toEqual(['gol-g5'])
  })

  it('preserves the complete free garage from version 3 saves', () => {
    const save = parseSave(JSON.stringify({ version: 3, playerVehicle: 'saveiro', credits: 250 }))
    expect(save.version).toBe(4)
    expect(save.playerVehicle).toBe('saveiro')
    expect(save.unlockedVehicles).toContain('saveiro')
    expect(save.unlockedVehicles).toHaveLength(9)
    expect(save.credits).toBe(250)
  })

  it('does not load a locked vehicle as the active car in version 4', () => {
    const save = parseSave(JSON.stringify({
      version: 4,
      playerVehicle: 'fiorino',
      unlockedVehicles: ['gol-g5', 'uno'],
      credits: 900,
    }))
    expect(save.playerVehicle).toBe('gol-g5')
    expect(save.unlockedVehicles).toEqual(['gol-g5', 'uno'])
    expect(save.credits).toBe(900)
  })

  it('ignores unknown vehicle ids and always keeps the starter car unlocked', () => {
    const save = parseSave(JSON.stringify({
      version: 4,
      playerVehicle: 'uno',
      unlockedVehicles: ['uno', 'unknown-car'],
    }))
    expect(save.playerVehicle).toBe('uno')
    expect(save.unlockedVehicles).toEqual(['uno', 'gol-g5'])
  })
})
