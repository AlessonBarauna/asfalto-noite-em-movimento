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

/** Returns one vehicle early in a run and occasional two-lane traffic waves later on. */
export function trafficWaveSize(elapsedSeconds: number, roll: number): 1 | 2 {
  const elapsed = Math.max(0, elapsedSeconds)
  const chance = elapsed < 8 ? 0 : elapsed < 20 ? 0.18 : elapsed < 45 ? 0.3 : 0.4
  return roll >= 0 && roll < chance ? 2 : 1
}
