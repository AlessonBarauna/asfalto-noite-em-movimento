export type ScenarioId = 'cidade' | 'serra' | 'deserto'

type V3 = readonly [number, number, number]

export type Scenario = {
  id: ScenarioId
  label: string
  blurb: string
  rain: boolean
  exposure: number
  fog: { color: string; density: number; rainDensity: number }
  hemisphere: { sky: string; ground: string; intensity: number }
  key: { color: string; intensity: number; position: V3 }
  envIntensity: number
  ground: string
  sky: {
    zenith: V3
    mid: V3
    horizon: V3
    glow: V3
    band: V3
    stars: number
    bodyDir: V3
    bodyColor: V3
    bodyEdge: readonly [number, number]
    haloColor: V3
    haloPower: number
    haloAmount: number
    cloud: V3
  }
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'cidade',
    label: 'CIDADE',
    blurb: 'Avenida noturna com neon e chuva',
    rain: true,
    exposure: 0.92,
    fog: { color: '#1a1b26', density: 0.0062, rainDensity: 0.0078 },
    hemisphere: { sky: '#7f9bc4', ground: '#1c1410', intensity: 0.42 },
    key: { color: '#9fb8e8', intensity: 0.85, position: [-16, 30, -8] },
    envIntensity: 0.75,
    ground: '#0c1015',
    sky: {
      zenith: [0.012, 0.027, 0.07], mid: [0.045, 0.085, 0.16], horizon: [0.42, 0.22, 0.2],
      glow: [0.34, 0.15, 0.07], band: [0.05, 0.12, 0.2], stars: 1,
      bodyDir: [-0.34, 0.5, -0.8], bodyColor: [1, 0.97, 0.9], bodyEdge: [0.9984, 0.9992],
      haloColor: [0.35, 0.42, 0.6], haloPower: 90, haloAmount: 0.55, cloud: [0.16, 0.085, 0.07],
    },
  },
  {
    id: 'serra',
    label: 'SERRA',
    blurb: 'Rodovia na mata, névoa e luar',
    rain: false,
    exposure: 0.95,
    fog: { color: '#0d1822', density: 0.0105, rainDensity: 0.0125 },
    hemisphere: { sky: '#5f86b8', ground: '#0a120d', intensity: 0.5 },
    key: { color: '#a9c4f2', intensity: 1.05, position: [-14, 26, -20] },
    envIntensity: 0.65,
    ground: '#07100b',
    sky: {
      zenith: [0.006, 0.018, 0.05], mid: [0.02, 0.055, 0.11], horizon: [0.1, 0.17, 0.22],
      glow: [0.05, 0.1, 0.12], band: [0.04, 0.1, 0.16], stars: 1.6,
      bodyDir: [-0.3, 0.42, -0.85], bodyColor: [0.95, 0.98, 1], bodyEdge: [0.9976, 0.9988],
      haloColor: [0.3, 0.42, 0.65], haloPower: 55, haloAmount: 0.7, cloud: [0.06, 0.09, 0.12],
    },
  },
  {
    id: 'deserto',
    label: 'DESERTO',
    blurb: 'Estrada vazia ao pôr do sol',
    rain: false,
    exposure: 1.0,
    fog: { color: '#a7623e', density: 0.0052, rainDensity: 0.0052 },
    hemisphere: { sky: '#ffb27a', ground: '#4a2c1a', intensity: 0.7 },
    key: { color: '#ff9552', intensity: 2.1, position: [10, 9, -70] },
    envIntensity: 0.9,
    ground: '#8a5a37',
    sky: {
      zenith: [0.06, 0.07, 0.22], mid: [0.5, 0.25, 0.3], horizon: [1.0, 0.45, 0.16],
      glow: [0.9, 0.35, 0.08], band: [0.35, 0.12, 0.22], stars: 0.15,
      bodyDir: [0.05, 0.075, -1], bodyColor: [3, 1.9, 0.9], bodyEdge: [0.9965, 0.9988],
      haloColor: [1, 0.5, 0.18], haloPower: 14, haloAmount: 1.2, cloud: [0.95, 0.4, 0.22],
    },
  },
]

export function scenarioById(id: string): Scenario {
  return SCENARIOS.find(s => s.id === id) ?? SCENARIOS[0]
}
