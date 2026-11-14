import { DEFAULT_RACE_CONFIG, RACE_CONFIG } from './race-config'

type Mode = 'NEXT_RUN'
type Boundary = 'jump' | 'dash' | 'run'
type RaceKey = 'startSpeed' | 'trafficInterval' | 'steerSpeed' | 'startingLives'
type Control = {
  id: string; type: 'number'; category: string; label: string; description: string; unit: string
  default: number; min: number; max: number; step: number; applyMode: Mode; integrity: 'GAMEPLAY'
}
type Binding = { key: RaceKey; control: Control }

const specifications: Array<Omit<Control, 'id' | 'default' | 'applyMode' | 'integrity'> & { key: RaceKey; min: number; max: number; step: number }> = [
  { key: 'startSpeed', type: 'number', category: 'Corrida', label: 'Velocidade inicial', description: 'Velocidade ativa quando uma nova corrida começa.', unit: 'm/s', min: 20, max: 35, step: 1 },
  { key: 'trafficInterval', type: 'number', category: 'Tráfego', label: 'Intervalo entre carros', description: 'Tempo-base entre a entrada dos carros; a dificuldade ainda cresce durante a corrida.', unit: 's', min: 0.72, max: 1.4, step: 0.04 },
  { key: 'steerSpeed', type: 'number', category: 'Controles', label: 'Resposta da direção', description: 'Rapidez lateral do carro quando você desvia.', unit: 'm/s', min: 4, max: 10, step: 0.25 },
  { key: 'startingLives', type: 'number', category: 'Corrida', label: 'Avarias permitidas', description: 'Colisões aceitas antes do fim de jogo.', unit: '', min: 1, max: 5, step: 1 },
]

const bindings: Binding[] = specifications.map(({ key, ...spec }) => ({
  key,
  control: Object.freeze({
    ...spec,
    id: `race.${key}`,
    default: DEFAULT_RACE_CONFIG[key],
    applyMode: 'NEXT_RUN',
    integrity: 'GAMEPLAY',
  }),
}))
const byId = new Map(bindings.map(binding => [binding.control.id, binding]))
const active = RACE_CONFIG as unknown as Record<RaceKey, number>
let requested: Record<string, number> = Object.fromEntries(bindings.map(({ control }) => [control.id, control.default]))
let unranked = false

function gameplayModified(): boolean {
  return bindings.some(({ key, control }) => active[key] !== control.default)
}

export const tuning = {
  get unranked(): boolean { return unranked },
  controls: Object.freeze(bindings.map(binding => binding.control)),
  read() {
    return {
      requested: { ...requested },
      active: Object.fromEntries(bindings.map(({ key, control }) => [control.id, active[key]])),
    }
  },
  apply(patch: unknown): void {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Patch de corrida inválido')
    const entries = Object.entries(patch)
    if (entries.length > bindings.length) throw new Error('Patch de corrida inválido')
    for (const [id, value] of entries) {
      const control = byId.get(id)?.control
      if (!control || typeof value !== 'number' || !Number.isFinite(value) || value < control.min || value > control.max) throw new Error('Valor de corrida inválido')
      const steps = (value - control.min) / control.step
      if (value !== control.default && Math.abs(steps - Math.round(steps)) > 1e-7) throw new Error('Incremento de corrida inválido')
    }
    requested = { ...requested, ...Object.fromEntries(entries) }
    // Drafts only become active at the game-owned race boundary. Never write disk or reload here.
    unranked ||= gameplayModified()
  },
  activate(boundary: Boundary): void {
    if (boundary === 'run') {
      for (const { key, control } of bindings) active[key] = requested[control.id]
      // A tuned attempt remains unranked; starting a fresh default run restores eligibility.
      unranked = gameplayModified()
    } else {
      unranked ||= gameplayModified()
    }
  },
}
