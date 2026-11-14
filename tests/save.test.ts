import { describe, expect, it } from 'vitest'
import { defaultSave, insertScore, LEADERBOARD_SIZE, parseSave, SAVE_KEY, SaveStore } from '../src/engine/save'

describe('save', () => {
  it('falls back to defaults for missing, corrupt or foreign data', () => {
    expect(parseSave(null)).toEqual(defaultSave())
    expect(parseSave('{nope')).toEqual(defaultSave())
    expect(parseSave('[]')).toEqual(defaultSave())
    expect(parseSave(JSON.stringify({ version: 99, musicVolume: 0.1 }))).toEqual(defaultSave())
  })

  it('clamps and validates fields', () => {
    const s = parseSave(JSON.stringify({ version: 1, musicVolume: 5, sfxVolume: -1, locale: 'fr', quality: 'ultra', sensitivity: 9, playerName: '  a very long player name here ' }))
    expect(s.musicVolume).toBe(1)
    expect(s.sfxVolume).toBe(0)
    expect(s.locale).toBe('')
    expect(s.quality).toBe('high')
    expect(s.sensitivity).toBe(1)
    expect(s.playerName).toBe('a very long play')
  })

  it('migrates version 1 saves and validates the selected vehicle', () => {
    expect(parseSave(JSON.stringify({ version: 1, playerName: 'AL', leaderboard: [] })).version).toBe(3)
    expect(parseSave(JSON.stringify({ version: 1, playerVehicle: 'not-a-car' })).playerVehicle).toBe('gol-g5')
    expect(parseSave(JSON.stringify({ version: 2, playerVehicle: 'saveiro', credits: 275 })).playerVehicle).toBe('saveiro')
    expect(parseSave(JSON.stringify({ version: 2, credits: 275 })).credits).toBe(275)
    expect(parseSave(JSON.stringify({ version: 3, credits: -10, lifetimeCredits: 99.8, completedRuns: 4 })).credits).toBe(0)
    expect(parseSave(JSON.stringify({ version: 3, credits: 10, lifetimeCredits: 99.8, completedRuns: 4 })).lifetimeCredits).toBe(99)
  })

  it('keeps a bounded, ordered leaderboard', () => {
    let board = [] as ReturnType<typeof defaultSave>['leaderboard']
    for (let i = 0; i < LEADERBOARD_SIZE + 3; i += 1) board = insertScore(board, { name: `p${i}`, score: i * 10, seconds: 60, at: i }).board
    expect(board).toHaveLength(LEADERBOARD_SIZE)
    expect(board[0].score).toBe((LEADERBOARD_SIZE + 2) * 10)
    const tie = insertScore(board, { name: 'fast', score: board[0].score, seconds: 30, at: 999 })
    expect(tie.rank).toBe(0)
    expect(insertScore(board, { name: 'low', score: 0, seconds: 1, at: 1 }).rank).toBe(-1)
  })

  it('persists through storage and survives storage errors', () => {
    const mem = new Map<string, string>()
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) }
    new SaveStore(storage).update({ musicVolume: 0.3, locale: 'zh-CN', credits: 120, lifetimeCredits: 120, completedRuns: 2 })
    expect(JSON.parse(mem.get(SAVE_KEY)!).musicVolume).toBe(0.3)
    expect(new SaveStore(storage).data.locale).toBe('zh-CN')
    expect(new SaveStore(storage).data.credits).toBe(120)
    expect(new SaveStore(storage).data.completedRuns).toBe(2)
    const legacy = new Map<string, string>([['asfalto.save.v1', JSON.stringify({ version: 1, playerName: 'LEGADO' })]])
    const migrated = new SaveStore({ getItem: key => legacy.get(key) ?? null, setItem: (key, value) => void legacy.set(key, value) })
    expect(migrated.data.playerName).toBe('LEGADO')
    migrated.update({ quality: 'medium' })
    expect(JSON.parse(legacy.get(SAVE_KEY)!).version).toBe(3)
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') } }
    const store = new SaveStore(broken)
    expect(() => store.update({ muted: true })).not.toThrow()
    expect(store.data.muted).toBe(true)
  })
})
