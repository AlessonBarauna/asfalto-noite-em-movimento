import { describe, expect, it } from 'vitest'
import { defaultSave, parseSave } from './save'

describe('versioned save and vehicle unlock migration', () => {
  it('starts a new profile with only the Gol G5 unlocked', () => {
    const save = defaultSave()
    expect(save.version).toBe(7)
    expect(save.playerVehicle).toBe('gol-g5')
    expect(save.unlockedVehicles).toEqual(['gol-g5'])
  })

  it('preserves the complete free garage from version 3 saves', () => {
    const save = parseSave(JSON.stringify({ version: 3, playerVehicle: 'saveiro', credits: 250 }))
    expect(save.version).toBe(7)
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


describe('paint save migration', () => {
  it('starts with the graphite paint unlocked', () => {
    const save = defaultSave()
    expect(save.version).toBe(7)
    expect(save.playerPaint).toBe('#4a5052')
    expect(save.unlockedPaints).toEqual(['#4a5052'])
  })
  it('migrates version 4 garage saves without losing credits or vehicles', () => {
    const save = parseSave(JSON.stringify({ version: 4, playerVehicle: 'uno', unlockedVehicles: ['gol-g5', 'uno'], credits: 320 }))
    expect(save.version).toBe(7)
    expect(save.playerVehicle).toBe('uno')
    expect(save.unlockedVehicles).toEqual(['gol-g5', 'uno'])
    expect(save.playerPaint).toBe('#4a5052')
    expect(save.credits).toBe(320)
  })
  it('rejects invalid or unowned paint selections', () => {
    const save = parseSave(JSON.stringify({ version: 5, playerPaint: '#ff0000', unlockedPaints: ['#4a5052'] }))
    expect(save.playerPaint).toBe('#4a5052')
    expect(save.unlockedPaints).toEqual(['#4a5052'])
  })
  it('preserves owned paint and selected color', () => {
    const save = parseSave(JSON.stringify({ version: 5, playerPaint: '#d71920', unlockedPaints: ['#4a5052', '#d71920'] }))
    expect(save.playerPaint).toBe('#d71920')
    expect(save.unlockedPaints).toContain('#d71920')
  })
})


describe('wheel and tint save migration', () => {
  it('migrates version 5 without losing paint, vehicle or credits', () => {
    const save = parseSave(JSON.stringify({ version: 5, playerVehicle: 'uno', unlockedVehicles: ['gol-g5', 'uno'], playerPaint: '#d71920', unlockedPaints: ['#4a5052', '#d71920'], credits: 740 }))
    expect(save.version).toBe(7)
    expect(save.playerVehicle).toBe('uno')
    expect(save.playerPaint).toBe('#d71920')
    expect(save.unlockedPaints).toContain('#d71920')
    expect(save.unlockedVehicles).toEqual(['gol-g5', 'uno'])
    expect(save.credits).toBe(740)
    expect(save.playerWheels).toBe('alloy')
    expect(save.playerTint).toBe('smoke')
  })
  it('only restores owned wheel and tint upgrades', () => {
    const save = parseSave(JSON.stringify({ version: 6, playerWheels: 'sport', unlockedWheels: ['alloy', 'sport'], playerTint: 'dark', unlockedTints: ['smoke', 'dark'] }))
    expect(save.playerWheels).toBe('sport')
    expect(save.playerTint).toBe('dark')
  })
})

describe('spoiler and suspension save migration', () => {
 it('migrates v6 without losing garage progress', () => {const save=parseSave(JSON.stringify({version:6,playerVehicle:'uno',unlockedVehicles:['gol-g5','uno'],playerPaint:'#d71920',unlockedPaints:['#4a5052','#d71920'],playerWheels:'black',unlockedWheels:['alloy','black'],playerTint:'dark',unlockedTints:['smoke','dark'],credits:1250}));expect(save.version).toBe(7);expect(save.playerVehicle).toBe('uno');expect(save.playerPaint).toBe('#d71920');expect(save.playerWheels).toBe('black');expect(save.playerTint).toBe('dark');expect(save.playerSpoiler).toBe('none');expect(save.playerSuspension).toBe('stock');expect(save.credits).toBe(1250)})
 it('validates owned spoiler and suspension options', () => {const save=parseSave(JSON.stringify({version:7,playerSpoiler:'street',unlockedSpoilers:['none','street'],playerSuspension:'slammed',unlockedSuspensions:['stock','slammed']}));expect(save.playerSpoiler).toBe('street');expect(save.playerSuspension).toBe('slammed')})
})
