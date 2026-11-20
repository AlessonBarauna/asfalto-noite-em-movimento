/** Preferências de controle no celular: tipo de movimento e posição de cada botão (salvas no aparelho). */
export type ControlScheme = 'touch' | 'buttons' | 'tilt'
export type PadId = 'jump' | 'sprint' | 'dash' | 'left' | 'right'
export type PadPos = { x: number; y: number }

export type ControlPrefs = {
  scheme: ControlScheme
  invertTilt: boolean
  /** Centro de cada botão, em fração da tela (0–1). */
  pads: Record<PadId, PadPos>
}

export const PAD_LABELS: Record<PadId, string> = { jump: 'PULAR', sprint: 'ACELERAR', dash: 'NITRO', left: '◀', right: '▶' }

export const DEFAULT_PADS: Record<PadId, PadPos> = {
  sprint: { x: 0.9, y: 0.4 },
  dash: { x: 0.9, y: 0.64 },
  jump: { x: 0.77, y: 0.64 },
  left: { x: 0.09, y: 0.8 },
  right: { x: 0.25, y: 0.8 },
}

const KEY = 'asfalto.controls.v1'
const SCHEMES: ControlScheme[] = ['touch', 'buttons', 'tilt']
const PAD_IDS = Object.keys(DEFAULT_PADS) as PadId[]
const clamp01 = (v: number, fallback: number): number => (Number.isFinite(v) ? Math.min(0.97, Math.max(0.03, v)) : fallback)

export const defaultPrefs = (): ControlPrefs => ({
  scheme: 'touch',
  invertTilt: false,
  pads: Object.fromEntries(PAD_IDS.map(id => [id, { ...DEFAULT_PADS[id] }])) as Record<PadId, PadPos>,
})

export function parsePrefs(raw: unknown): ControlPrefs {
  const base = defaultPrefs()
  if (!raw || typeof raw !== 'object') return base
  const data = raw as Record<string, unknown>
  if (typeof data.scheme === 'string' && SCHEMES.includes(data.scheme as ControlScheme)) base.scheme = data.scheme as ControlScheme
  base.invertTilt = data.invertTilt === true
  const pads = (data.pads && typeof data.pads === 'object' ? data.pads : {}) as Record<string, Partial<PadPos>>
  for (const id of PAD_IDS) {
    const p = pads[id]
    if (p && typeof p === 'object') base.pads[id] = { x: clamp01(Number(p.x), base.pads[id].x), y: clamp01(Number(p.y), base.pads[id].y) }
  }
  return base
}

type Listener = (prefs: ControlPrefs) => void

class PrefsStore {
  private prefs: ControlPrefs
  private readonly listeners = new Set<Listener>()

  constructor() {
    let raw: unknown = null
    try { raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { /* sem armazenamento: usa o padrão */ }
    this.prefs = parsePrefs(raw)
  }

  get(): ControlPrefs { return this.prefs }

  update(patch: Partial<ControlPrefs>): void {
    this.prefs = parsePrefs({ ...this.prefs, ...patch })
    try { localStorage.setItem(KEY, JSON.stringify(this.prefs)) } catch { /* ignora */ }
    for (const fn of this.listeners) fn(this.prefs)
  }

  setPad(id: PadId, pos: PadPos): void {
    this.update({ pads: { ...this.prefs.pads, [id]: pos } })
  }

  resetPads(): void {
    this.update({ pads: defaultPrefs().pads })
  }

  subscribe(fn: Listener): void {
    this.listeners.add(fn)
    fn(this.prefs)
  }
}

export const controlPrefs = new PrefsStore()

let tiltGranted = false
export function isTiltGranted(): boolean { return tiltGranted }

/** iOS exige permissão (e um toque do usuário) para ler o movimento; outros navegadores liberam direto.
 *  No iOS a permissão vale só para a página aberta: depois de recarregar, é preciso pedir de novo num toque. */
export async function requestTiltPermission(): Promise<boolean> {
  const w = window as unknown as {
    DeviceMotionEvent?: { requestPermission?: () => Promise<string> }
    DeviceOrientationEvent?: { requestPermission?: () => Promise<string> }
  }
  if (!w.DeviceMotionEvent && !w.DeviceOrientationEvent) return false
  const asks = [w.DeviceMotionEvent, w.DeviceOrientationEvent].filter(
    (c): c is { requestPermission: () => Promise<string> } => typeof c?.requestPermission === 'function')
  if (asks.length === 0) { tiltGranted = true; return true }
  try {
    // as duas chamadas saem no mesmo toque (síncronas), senão o iOS recusa a segunda
    const results = await Promise.all(asks.map(c => c.requestPermission().catch(() => 'denied')))
    tiltGranted = results.some(r => r === 'granted')
  } catch { tiltGranted = false }
  return tiltGranted
}
