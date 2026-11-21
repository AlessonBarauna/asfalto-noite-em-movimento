import { RACE_CONFIG } from './race-config'

export type RacePhase = 'title' | 'playing' | 'paused' | 'ended'
export type TrafficDifficulty = { interval: number; speedFactor: number }
export type TrafficKind = 'sedan' | 'suv' | 'van' | 'pickup'

const TRAFFIC_KIND_SPEED: Record<TrafficKind, number> = {
  sedan: 1,
  suv: 0.94,
  van: 0.88,
  pickup: 0.97,
}

export function laneCenter(lane: number): number {
  return (lane - 1) * RACE_CONFIG.laneWidth
}

export function clampSteering(x: number, halfWidth = RACE_CONFIG.roadHalfWidth - 1): number {
  return Math.max(-halfWidth, Math.min(halfWidth, x))
}

/** Em velocidades muito altas o desvio lateral precisa acompanhar; sobe devagar e para em +50%. */
export function steerSpeedFactor(speedMs: number): number {
  return 1 + Math.min(0.5, Math.max(0, (speedMs - 30) / 200))
}

export function calculateScore(distanceMeters: number, nearMisses: number): number {
  return Math.max(0, Math.floor(distanceMeters * 10) + Math.max(0, Math.floor(nearMisses)) * 350)
}

export function trafficDifficulty(elapsedSeconds: number): TrafficDifficulty {
  const elapsed = Math.max(0, elapsedSeconds)
  return {
    interval: Math.max(RACE_CONFIG.minTrafficInterval, RACE_CONFIG.trafficInterval - elapsed * 0.006),
    speedFactor: Math.min(1.66, RACE_CONFIG.trafficSpeedFactor + elapsed * 0.0015),
  }
}

/** Applies a vehicle-specific pace and a seeded variation in the 90%-110% range. */
export function trafficSpeedFactor(baseFactor: number, kind: TrafficKind, variation: number): number {
  const roll = Math.max(0, Math.min(1, variation))
  return Math.max(0.1, baseFactor * TRAFFIC_KIND_SPEED[kind] * (0.9 + roll * 0.2))
}

/** Prevents a new vehicle from spawning too close to traffic already in the same lane. */
export function hasTrafficSpawnGap(existingPositions: number[], spawnZ: number, minimumGap: number): boolean {
  return existingPositions.every(position => Math.abs(position - spawnZ) >= minimumGap)
}

export function collides(playerX: number, playerZ: number, trafficX: number, trafficZ: number): boolean {
  return Math.abs(playerX - trafficX) < 1.52 && Math.abs(playerZ - trafficZ) < 3.25
}

export function isNearMiss(playerX: number, trafficX: number): boolean {
  const gap = Math.abs(playerX - trafficX)
  return gap >= 1.52 && gap < 4.15
}

export type TrafficLanePosition = { lane: number; z: number }

/**
 * Chooses a safe adjacent lane for a vehicle trying to pass slower traffic.
 * The preferred side is checked first; the other side is used as a fallback.
 */
export function chooseSafeAdjacentLane(
  currentLane: number,
  currentZ: number,
  traffic: TrafficLanePosition[],
  minimumGap: number,
  preferredDirection: -1 | 1 = 1,
): number | null {
  if (!Number.isInteger(currentLane) || currentLane < 0 || currentLane > 2) return null
  if (!Number.isFinite(currentZ) || !Number.isFinite(minimumGap) || minimumGap < 0) return null

  const candidates = [currentLane + preferredDirection, currentLane - preferredDirection]
  for (const lane of candidates) {
    if (lane < 0 || lane > 2) continue
    const isClear = traffic.every(vehicle =>
      vehicle.lane !== lane || Math.abs(vehicle.z - currentZ) >= minimumGap,
    )
    if (isClear) return lane
  }
  return null
}

/** Returns one vehicle early in a run and occasional two-lane traffic waves later on. */
export function trafficWaveSize(elapsedSeconds: number, roll: number): 1 | 2 {
  const elapsed = Math.max(0, elapsedSeconds)
  const chance = elapsed < 8 ? 0 : elapsed < 20 ? 0.18 : elapsed < 45 ? 0.3 : 0.4
  return roll >= 0 && roll < chance ? 2 : 1
}

// ---- Progressão por distância (sem limite) ----------------------------------------------------
// A corrida começa lenta e fácil; velocidade, densidade e ondas de tráfego crescem com a distância.

/** Nível de dificuldade exibido ao jogador: sobe a cada 600 m. */
export function levelForDistance(distanceMeters: number): number {
  return 1 + Math.floor(Math.max(0, Number.isFinite(distanceMeters) ? distanceMeters : 0) / 600)
}

/** Velocidade de cruzeiro (m/s). Sem teto: cresce rápido no começo (log) e segue subindo sempre (linear). ~58 km/h no início, ~330 km/h aos 50 km, ~490 km/h aos 100 km. */
export function cruiseSpeed(distanceMeters: number): number {
  const d = Math.max(0, Number.isFinite(distanceMeters) ? distanceMeters : 0)
  return 16 + 9.5 * Math.log1p(d / 450) + d * 0.0007
}

/** Intervalo entre veículos e velocidade relativa do tráfego conforme a distância. */
export function trafficDifficultyByDistance(distanceMeters: number): TrafficDifficulty {
  const d = Math.max(0, Number.isFinite(distanceMeters) ? distanceMeters : 0)
  return {
    interval: Math.max(0.34, 1.7 * Math.exp(-d / 5500)),
    speedFactor: 1.12 + 0.5 * (1 - Math.exp(-d / 6000)),
  }
}

/** Sem ondas de dois carros nos primeiros 250 m; depois a chance sobe até 70%. */
export function trafficWaveSizeByDistance(distanceMeters: number, roll: number): 1 | 2 {
  const d = Math.max(0, Number.isFinite(distanceMeters) ? distanceMeters : 0)
  const chance = d < 250 ? 0 : Math.min(0.7, 0.15 + (d - 250) / 9000)
  return roll >= 0 && roll < chance ? 2 : 1
}
