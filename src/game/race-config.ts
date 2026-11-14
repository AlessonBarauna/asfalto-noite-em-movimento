export const DEFAULT_RACE_CONFIG = {
  laneWidth: 3.45,
  roadHalfWidth: 5.45,
  playerZ: 5.2,
  startSpeed: 25,
  maxSpeed: 59,
  acceleration: 11,
  brakePower: 15,
  steerSpeed: 7.2,
  trafficInterval: 1.12,
  minTrafficInterval: 0.48,
  spawnDistance: 176,
  trafficSpeedFactor: 1.28,
  boostDuration: 1.55,
  boostImpulse: 17,
  boostCooldown: 3.8,
  startingLives: 3,
} as const

export const RACE_CONFIG = { ...DEFAULT_RACE_CONFIG }
