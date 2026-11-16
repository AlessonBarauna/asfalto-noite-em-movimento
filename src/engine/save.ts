/**
 * Versioned local save. Everything the player keeps between sessions lives in one JSON record so
 * it is easy to migrate. Corrupt or foreign data falls back to defaults instead of crashing.
 */
export type Locale = 'en' | 'zh-CN'
export type Quality = 'low' | 'medium' | 'high'

export type PlayerVehicleId = 'gol-g5' | 'uno' | 'palio' | 'celta' | 'corsa' | 'onix' | 'hb20' | 'saveiro' | 'fiorino' | 'supercar'

export type ScoreEntry = { name: string; score: number; seconds: number; at: number }

export type SaveData = {
  version: 8
  /** '' = never chosen; the game follows the browser language until the player picks one. */
  locale: Locale | ''
  musicVolume: number
  sfxVolume: number
  muted: boolean
  sensitivity: number
  invertY: boolean
  quality: Quality
  reducedMotion: boolean
  tutorialDone: boolean
  playerName: string
  playerVehicle: PlayerVehicleId
  playerPaint: string
  unlockedPaints: string[]
  playerWheels: string
  unlockedWheels: string[]
  playerTint: string
  unlockedTints: string[]
  playerSpoiler: string
  unlockedSpoilers: string[]
  playerSuspension: string
  unlockedSuspensions: string[]
  playerExhaust: string
  unlockedExhausts: string[]
  playerHeadlights: string
  unlockedHeadlights: string[]
  unlockedVehicles: PlayerVehicleId[]
  credits: number
  lifetimeCredits: number
  completedRuns: number
  leaderboard: ScoreEntry[]
}

export const SAVE_KEY = 'asfalto.save.v8'
const LEGACY_SAVE_KEYS = ['asfalto.save.v7', 'asfalto.save.v6', 'asfalto.save.v5', 'asfalto.save.v4', 'asfalto.save.v3', 'asfalto.save.v2', 'asfalto.save.v1']
const VEHICLES: PlayerVehicleId[] = ['gol-g5', 'uno', 'palio', 'celta', 'corsa', 'onix', 'hb20', 'saveiro', 'fiorino', 'supercar']
export const LEADERBOARD_SIZE = 10

export function defaultSave(): SaveData {
  return {
    version: 8,
    locale: '',
    musicVolume: 0.7,
    sfxVolume: 0.8,
    muted: false,
    sensitivity: 1,
    invertY: false,
    quality: 'high',
    reducedMotion: false,
    tutorialDone: false,
    playerName: 'PILOTO',
    playerVehicle: 'gol-g5',
    playerPaint: '#4a5052',
    unlockedPaints: ['#4a5052'],
    playerWheels: 'alloy',
    unlockedWheels: ['alloy'],
    playerTint: 'smoke',
    unlockedTints: ['smoke'],
    playerSpoiler: 'none',
    unlockedSpoilers: ['none'],
    playerSuspension: 'stock',
    unlockedSuspensions: ['stock'],
    playerExhaust: 'stock',
    unlockedExhausts: ['stock'],
    playerHeadlights: 'halogen',
    unlockedHeadlights: ['halogen'],
    unlockedVehicles: ['gol-g5'],
    credits: 0,
    lifetimeCredits: 0,
    completedRuns: 0,
    leaderboard: [],
  }
}

const clamp01 = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback)

/** Parse untrusted stored JSON into a valid SaveData (pure; unit tested). */
export function parseSave(raw: string | null): SaveData {
  const base = defaultSave()
  if (!raw) return base
  let data: Record<string, unknown>
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return base
    data = parsed as Record<string, unknown>
  } catch {
    return base
  }
  if (data.version !== 1 && data.version !== 2 && data.version !== 3 && data.version !== 4 && data.version !== 5 && data.version !== 6 && data.version !== 7 && data.version !== 8) return base
  const unlockedVehicles: PlayerVehicleId[] = data.version === 3
    ? [...VEHICLES] // Version 3 exposed the whole garage for free; preserve every vehicle already available.
    : typeof data.version === 'number' && data.version >= 4 && Array.isArray(data.unlockedVehicles)
      ? [...new Set(data.unlockedVehicles.filter((id): id is PlayerVehicleId => VEHICLES.includes(id as PlayerVehicleId)))]
      : ['gol-g5']
  if (!unlockedVehicles.includes('gol-g5')) unlockedVehicles.unshift('gol-g5')
  const unlockedPaints = typeof data.version === 'number' && data.version >= 5 && Array.isArray(data.unlockedPaints)
    ? [...new Set(data.unlockedPaints.filter((paint): paint is string => typeof paint === 'string' && /^#[0-9a-fA-F]{6}$/.test(paint)))]
    : ['#4a5052']
  if (!unlockedPaints.includes('#4a5052')) unlockedPaints.unshift('#4a5052')
  const wheelIds = ['alloy', 'black', 'sport']
  const unlockedWheels = typeof data.version === 'number' && data.version >= 6 && Array.isArray(data.unlockedWheels) ? [...new Set(data.unlockedWheels.filter((id): id is string => typeof id === 'string' && wheelIds.includes(id)))] : ['alloy']
  if (!unlockedWheels.includes('alloy')) unlockedWheels.unshift('alloy')
  const playerWheels = typeof data.playerWheels === 'string' && unlockedWheels.includes(data.playerWheels) ? data.playerWheels : 'alloy'
  const tintIds = ['light', 'smoke', 'dark']
  const unlockedTints = typeof data.version === 'number' && data.version >= 6 && Array.isArray(data.unlockedTints) ? [...new Set(data.unlockedTints.filter((id): id is string => typeof id === 'string' && tintIds.includes(id)))] : ['smoke']
  if (!unlockedTints.includes('smoke')) unlockedTints.unshift('smoke')
  const playerTint = typeof data.playerTint === 'string' && unlockedTints.includes(data.playerTint) ? data.playerTint : 'smoke'
  const spoilerIds = ['none', 'street']
  const unlockedSpoilers = typeof data.version === 'number' && data.version >= 7 && Array.isArray(data.unlockedSpoilers) ? [...new Set(data.unlockedSpoilers.filter((id): id is string => typeof id === 'string' && spoilerIds.includes(id)))] : ['none']
  if (!unlockedSpoilers.includes('none')) unlockedSpoilers.unshift('none')
  const playerSpoiler = typeof data.playerSpoiler === 'string' && unlockedSpoilers.includes(data.playerSpoiler) ? data.playerSpoiler : 'none'
  const suspensionIds = ['stock', 'lowered', 'slammed']
  const unlockedSuspensions = typeof data.version === 'number' && data.version >= 7 && Array.isArray(data.unlockedSuspensions) ? [...new Set(data.unlockedSuspensions.filter((id): id is string => typeof id === 'string' && suspensionIds.includes(id)))] : ['stock']
  if (!unlockedSuspensions.includes('stock')) unlockedSuspensions.unshift('stock')
  const playerSuspension = typeof data.playerSuspension === 'string' && unlockedSuspensions.includes(data.playerSuspension) ? data.playerSuspension : 'stock'
  const exhaustIds = ['stock', 'sport', 'dual']
  const unlockedExhausts = typeof data.version === 'number' && data.version >= 8 && Array.isArray(data.unlockedExhausts) ? [...new Set(data.unlockedExhausts.filter((id): id is string => typeof id === 'string' && exhaustIds.includes(id)))] : ['stock']
  if (!unlockedExhausts.includes('stock')) unlockedExhausts.unshift('stock')
  const playerExhaust = typeof data.playerExhaust === 'string' && unlockedExhausts.includes(data.playerExhaust) ? data.playerExhaust : 'stock'
  const headlightIds = ['halogen', 'xenon', 'led']
  const unlockedHeadlights = typeof data.version === 'number' && data.version >= 8 && Array.isArray(data.unlockedHeadlights) ? [...new Set(data.unlockedHeadlights.filter((id): id is string => typeof id === 'string' && headlightIds.includes(id)))] : ['halogen']
  if (!unlockedHeadlights.includes('halogen')) unlockedHeadlights.unshift('halogen')
  const playerHeadlights = typeof data.playerHeadlights === 'string' && unlockedHeadlights.includes(data.playerHeadlights) ? data.playerHeadlights : 'halogen'
  const requestedPaint = typeof data.playerPaint === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.playerPaint) ? data.playerPaint.toLowerCase() : base.playerPaint
  const playerPaint = unlockedPaints.includes(requestedPaint) ? requestedPaint : '#4a5052'
  const requestedVehicle = VEHICLES.includes(data.playerVehicle as PlayerVehicleId) ? data.playerVehicle as PlayerVehicleId : base.playerVehicle
  const playerVehicle = unlockedVehicles.includes(requestedVehicle) ? requestedVehicle : 'gol-g5'
  const board = Array.isArray(data.leaderboard) ? data.leaderboard : []
  return {
    version: 8,
    locale: data.locale === 'en' || data.locale === 'zh-CN' ? data.locale : '',
    musicVolume: clamp01(data.musicVolume, base.musicVolume),
    sfxVolume: clamp01(data.sfxVolume, base.sfxVolume),
    muted: data.muted === true,
    sensitivity: typeof data.sensitivity === 'number' && data.sensitivity >= 0.2 && data.sensitivity <= 3 ? data.sensitivity : base.sensitivity,
    invertY: data.invertY === true,
    quality: data.quality === 'low' || data.quality === 'medium' || data.quality === 'high' ? data.quality : base.quality,
    reducedMotion: data.reducedMotion === true,
    tutorialDone: data.tutorialDone === true,
    playerName: typeof data.playerName === 'string' && data.playerName.trim() ? data.playerName.trim().slice(0, 16) : base.playerName,
    playerVehicle,
    playerPaint,
    unlockedPaints,
    playerWheels,
    unlockedWheels,
    playerTint,
    unlockedTints,
    playerSpoiler,
    unlockedSpoilers,
    playerSuspension,
    unlockedSuspensions,
    playerExhaust,
    unlockedExhausts,
    playerHeadlights,
    unlockedHeadlights,
    unlockedVehicles,
    credits: Number.isFinite(data.credits) ? Math.max(0, Math.floor(data.credits as number)) : base.credits,
    lifetimeCredits: Number.isFinite(data.lifetimeCredits) ? Math.max(0, Math.floor(data.lifetimeCredits as number)) : base.lifetimeCredits,
    completedRuns: Number.isFinite(data.completedRuns) ? Math.max(0, Math.floor(data.completedRuns as number)) : base.completedRuns,
    leaderboard: board
      .filter((e): e is ScoreEntry => !!e && typeof e === 'object' && typeof (e as ScoreEntry).name === 'string' && Number.isFinite((e as ScoreEntry).score))
      .map(e => ({ name: e.name.slice(0, 16), score: Math.max(0, Math.floor(e.score)), seconds: Number.isFinite(e.seconds) ? e.seconds : 0, at: Number.isFinite(e.at) ? e.at : 0 }))
      .slice(0, LEADERBOARD_SIZE),
  }
}

/** Insert a run into a bounded, deterministically ordered leaderboard (higher score, then faster, then earlier). */
export function insertScore(board: ScoreEntry[], entry: ScoreEntry): { board: ScoreEntry[]; rank: number } {
  const next = [...board, entry].sort((a, b) => b.score - a.score || a.seconds - b.seconds || a.at - b.at).slice(0, LEADERBOARD_SIZE)
  return { board: next, rank: next.indexOf(entry) }
}

export class SaveStore {
  data: SaveData

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = globalThis.localStorage) {
    let raw: string | null = null
    try {
      raw = this.storage?.getItem(SAVE_KEY) ?? LEGACY_SAVE_KEYS.map(key => this.storage?.getItem(key)).find(value => value !== null) ?? null
    } catch {
      raw = null
    }
    this.data = parseSave(raw)
  }

  update(patch: Partial<SaveData>): void {
    this.data = { ...this.data, ...patch }
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.data))
    } catch {
      // Private browsing or quota: the game keeps working with in-memory settings.
    }
  }
}
