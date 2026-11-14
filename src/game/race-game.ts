import * as THREE from 'three'
import type { Audio } from '../engine/audio'
import type { Input } from '../engine/input'
import type { Renderer } from '../engine/renderer'
import { RACE_CONFIG } from './race-config'
import { calculateScore, clampSteering, hasTrafficSpawnGap, laneCenter, trafficDifficulty, trafficSpeedFactor, trafficWaveSize } from './race-rules'
import type { TrafficKind } from './race-rules'
import { RaceWorld } from './race-world'
import { createGolG5Model } from './gol-g5'
import { tuning } from './tuning'

export type RaceSnapshot = {
  score: number
  distance: number
  speedKmh: number
  lives: number
  nearMisses: number
  nitro: number
  elapsed: number
  mode: 'title' | 'playing' | 'paused' | 'ended'
}

export type RaceResult = { score: number; distance: number; nearMisses: number; seconds: number; unranked: boolean }
type TrafficCar = { root: THREE.Group; kind: TrafficKind; lane: number; active: boolean; tagged: boolean; speedFactor: number; width: number; length: number }

const PLAYER_PAINT = new THREE.Color('#4a5052')
const TRAFFIC_PAINTS = ['#cbd0cc', '#395571', '#a3482d', '#666a70', '#aa9d7b', '#263f42', '#ddd5c7'].map(color => new THREE.Color(color))
const CAR_HEADLIGHT = new THREE.MeshStandardMaterial({ color: '#fff6df', emissive: '#ffe1a5', emissiveIntensity: 4.4 })
const CAR_TAILLIGHT = new THREE.MeshStandardMaterial({ color: '#8c241a', emissive: '#fc3426', emissiveIntensity: 3.2 })
const RUBBER = new THREE.MeshStandardMaterial({ color: '#101316', roughness: 0.92 })
const GLASS = new THREE.MeshPhysicalMaterial({ color: '#152633', roughness: 0.16, metalness: 0.18, clearcoat: 0.9, clearcoatRoughness: 0.12 })
const CHROME = new THREE.MeshStandardMaterial({ color: '#aeb8bd', metalness: 0.82, roughness: 0.24 })

/** Single-player traffic dodger: forward motion is expressed by scrolling the road and oncoming traffic. */
export class RaceGame {
  readonly world: RaceWorld
  readonly camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 520)
  mode: RaceSnapshot['mode'] = 'title'
  result?: RaceResult
  private readonly player = new THREE.Group()
  private readonly playerVisual = new THREE.Group()
  private readonly traffic: TrafficCar[] = []
  private readonly random = seeded(717)
  private crashBuffer?: AudioBuffer
  private engineBuffer?: AudioBuffer
  private engineVoice?: AudioBufferSourceNode
  private x = 0
  private speed = RACE_CONFIG.startSpeed
  private distance = 0
  private elapsed = 0
  private lives: number = RACE_CONFIG.startingLives
  private nearMisses = 0
  private spawnTimer = 0.9
  private invulnerable = 0
  private boostTimer = 0
  private boostCooldown = 0
  private hitShake = 0
  private cameraX = 0

  constructor(
    private readonly renderer: Renderer,
    private readonly input: Input,
    private readonly audio: Audio,
    sounds: { crash?: AudioBuffer; engine?: AudioBuffer } = {},
  ) {
    this.world = new RaceWorld()
    this.crashBuffer = sounds.crash
    this.engineBuffer = sounds.engine
    this.world.scene.add(this.player)
    this.player.add(this.playerVisual)
    this.playerVisual.add(createGolG5Model(PLAYER_PAINT))
    this.player.rotation.y = Math.PI // The player car faces +Z; rotate it toward the road's -Z direction.
    this.player.position.set(0, 0.02, RACE_CONFIG.playerZ)
    this.createTrafficPool()
    this.camera.position.set(0, 5.2, RACE_CONFIG.playerZ + 12.6)
    this.camera.lookAt(0, 1.2, -19)
  }

  start(): void {
    tuning.activate('run')
    this.stopEngine()
    this.world.reset()
    this.mode = 'playing'
    this.result = undefined
    this.x = 0
    this.speed = RACE_CONFIG.startSpeed
    this.distance = 0
    this.elapsed = 0
    this.lives = RACE_CONFIG.startingLives
    this.nearMisses = 0
    this.spawnTimer = 0.95
    this.invulnerable = 0
    this.boostTimer = 0
    this.boostCooldown = 0
    this.hitShake = 0
    this.player.position.x = 0
    this.player.visible = true
    for (const car of this.traffic) {
      car.active = false
      car.root.visible = false
    }
    this.audio.unlock()
    this.audio.play('ui')
    if (this.engineBuffer) {
      try { this.engineVoice = this.audio.playBuffer(this.engineBuffer, 'sfx', true) } catch { this.engineVoice = undefined }
    }
  }

  pause(): void {
    if (this.mode !== 'playing') return
    this.mode = 'paused'
    this.stopEngine()
  }

  resume(): void {
    if (this.mode !== 'paused') return
    this.mode = 'playing'
    if (this.engineBuffer) {
      try { this.engineVoice = this.audio.playBuffer(this.engineBuffer, 'sfx', true) } catch { this.engineVoice = undefined }
    }
  }

  toTitle(): void {
    this.stopEngine()
    this.mode = 'title'
    this.player.visible = true
    for (const car of this.traffic) {
      car.active = false
      car.root.visible = false
    }
  }

  step(dt: number): void {
    if (this.mode !== 'playing') return
    this.elapsed += dt
    this.invulnerable = Math.max(0, this.invulnerable - dt)
    this.boostCooldown = Math.max(0, this.boostCooldown - dt)
    this.boostTimer = Math.max(0, this.boostTimer - dt)
    this.hitShake = Math.max(0, this.hitShake - dt * 2.5)

    if (this.input.consume('dash') && this.boostCooldown <= 0) {
      this.boostTimer = RACE_CONFIG.boostDuration
      this.boostCooldown = RACE_CONFIG.boostCooldown
      this.audio.play('dash')
    }

    const ramp = Math.min(18, this.elapsed * 0.15)
    let targetSpeed = RACE_CONFIG.startSpeed + ramp
    if (this.input.move.y > 0.12) targetSpeed += this.input.move.y * RACE_CONFIG.acceleration
    else if (this.input.move.y < -0.12) targetSpeed = Math.max(14, targetSpeed + this.input.move.y * RACE_CONFIG.brakePower)
    if (this.input.held('sprint')) targetSpeed += 7.5
    if (this.boostTimer > 0) targetSpeed += RACE_CONFIG.boostImpulse
    const maxSpeed = RACE_CONFIG.maxSpeed + (this.boostTimer > 0 ? RACE_CONFIG.boostImpulse : 0)
    targetSpeed = Math.max(14, Math.min(maxSpeed, targetSpeed))
    const response = targetSpeed > this.speed ? 2.9 : 5.4
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * response)

    this.x = clampSteering(this.x + this.input.move.x * RACE_CONFIG.steerSpeed * dt)
    this.player.position.x = this.x
    this.playerVisual.rotation.z = THREE.MathUtils.damp(this.playerVisual.rotation.z, -this.input.move.x * 0.075, 7, dt)
    if (this.invulnerable > 0) this.player.visible = Math.floor(this.elapsed * 13) % 2 === 0
    else this.player.visible = true

    const movement = this.speed * dt
    this.distance += movement
    this.world.update(movement, dt)
    this.updateTraffic(movement)
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) this.spawnTraffic()
    if (this.engineVoice && this.engineVoice.playbackRate) {
      this.engineVoice.playbackRate.setTargetAtTime(0.84 + Math.min(0.5, this.speed / 120), this.audio.ctx.currentTime, 0.08)
    }
  }

  render(frameSeconds: number): RaceSnapshot {
    const follow = 1 - Math.exp(-5.8 * Math.max(0, frameSeconds))
    this.cameraX += (this.x - this.cameraX) * follow
    this.camera.position.set(this.cameraX * 0.36, 5.05 + this.hitShake * 0.3, RACE_CONFIG.playerZ + 12.6 + this.hitShake)
    this.camera.lookAt(this.cameraX * 0.65, 1.05, -21)
    this.renderer.render(this.world.scene, this.camera)
    return this.snapshot()
  }

  snapshot(): RaceSnapshot {
    return {
      score: calculateScore(this.distance, this.nearMisses),
      distance: this.distance,
      speedKmh: this.mode === 'title' ? 0 : this.speed * 3.6,
      lives: this.lives,
      nearMisses: this.nearMisses,
      nitro: Math.max(0, 1 - this.boostCooldown / RACE_CONFIG.boostCooldown),
      elapsed: this.elapsed,
      mode: this.mode,
    }
  }

  dispose(): void {
    this.stopEngine()
    this.input.dispose()
  }

  private createTrafficPool(): void {
    for (let i = 0; i < 14; i += 1) {
      const root = new THREE.Group()
      const kind = (['sedan', 'suv', 'van', 'pickup'] as const)[i % 4]
      const paint = TRAFFIC_PAINTS[i % TRAFFIC_PAINTS.length]
      this.createTrafficVehicle(root, kind, paint)
      root.rotation.y = 0
      root.position.set(0, 0.02, -100 - i * 9)
      root.visible = false
      this.world.scene.add(root)
      const dimensions = trafficDimensions(kind)
      this.traffic.push({ root, kind, lane: 1, active: false, tagged: false, speedFactor: 1, width: dimensions.width, length: dimensions.length })
    }
  }

  private createTrafficVehicle(target: THREE.Group, kind: TrafficKind, paint: THREE.Color): void {
    const dimensions = trafficDimensions(kind)
    const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: paint, metalness: 0.72, roughness: 0.24, clearcoat: 0.85, clearcoatRoughness: 0.18 })
    const darkMaterial = new THREE.MeshStandardMaterial({ color: '#20282e', metalness: 0.5, roughness: 0.42 })
    const addBox = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, bevel = false) => {
      const geometry = new THREE.BoxGeometry(w, h, d)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, y, z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      target.add(mesh)
      if (bevel) {
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.08 }))
        edge.position.copy(mesh.position)
        target.add(edge)
      }
      return mesh
    }
    const bodyHeight = kind === 'van' ? 1.05 : kind === 'suv' ? 0.88 : 0.68
    addBox(dimensions.width, bodyHeight, dimensions.length, bodyMaterial, 0, bodyHeight * 0.58, 0, true)
    addBox(dimensions.width * 0.94, 0.16, 0.5, darkMaterial, 0, 0.34, dimensions.length * 0.48)
    addBox(dimensions.width * 0.94, 0.16, 0.5, darkMaterial, 0, 0.34, -dimensions.length * 0.48)

    if (kind === 'van' || kind === 'pickup') {
      const cargoDepth = kind === 'van' ? 2.25 : 1.45
      addBox(dimensions.width * 0.88, kind === 'van' ? 1.45 : 0.78, cargoDepth, kind === 'van' ? bodyMaterial : darkMaterial, 0, bodyHeight + (kind === 'van' ? 0.55 : 0.34), -0.25)
      if (kind === 'van') {
        const sideWindow = new THREE.MeshPhysicalMaterial({ color: '#182b38', roughness: 0.24, metalness: 0.2, transparent: true, opacity: 0.86 })
        for (const side of [-1, 1]) addBox(0.025, 0.68, 1.25, sideWindow, side * dimensions.width * 0.445, 1.35, -0.28)
      } else {
        addBox(dimensions.width * 0.82, 0.08, 0.06, CHROME, 0, 0.82, -1.02)
      }
    } else {
      const cabinLength = kind === 'suv' ? 2.15 : 1.78
      addBox(dimensions.width * 0.78, kind === 'suv' ? 0.92 : 0.72, cabinLength, GLASS, 0, bodyHeight + 0.34, -0.12, true)
      addBox(dimensions.width * 0.7, 0.08, 0.16, darkMaterial, 0, bodyHeight + 0.78, -0.12)
    }

    const wheelRadius = kind === 'van' ? 0.43 : 0.38
    for (const side of [-1, 1]) {
      for (const z of [-dimensions.length * 0.32, dimensions.length * 0.32]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.24, 18), RUBBER)
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(side * (dimensions.width * 0.49), wheelRadius, z)
        wheel.castShadow = true
        target.add(wheel)
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.48, wheelRadius * 0.48, 0.255, 12), CHROME)
        hub.rotation.z = Math.PI / 2
        hub.position.copy(wheel.position)
        target.add(hub)
      }
    }
    for (const side of [-1, 1]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), CAR_HEADLIGHT)
      head.position.set(side * dimensions.width * 0.31, 0.55, dimensions.length * 0.5 + 0.015)
      target.add(head)
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.08), CAR_TAILLIGHT)
      tail.position.set(side * dimensions.width * 0.32, 0.56, -dimensions.length * 0.5 - 0.015)
      target.add(tail)
    }
    const plate = addBox(0.48, 0.12, 0.025, CHROME, 0, 0.46, dimensions.length * 0.5 + 0.06)
    plate.castShadow = false
  }

  private spawnTraffic(): void {
    const activeCount = this.traffic.filter(car => car.active).length
    const difficulty = trafficDifficulty(this.elapsed)
    this.spawnTimer = Math.max(difficulty.interval * (0.9 + this.random() * 0.2), activeCount > 5 ? 0.58 : 0)

    // Later in the run, occasional two-car waves leave one readable escape lane.
    const wanted = trafficWaveSize(this.elapsed, this.random())
    const spawnZ = -RACE_CONFIG.spawnDistance - this.random() * 18
    // Fisher-Yates keeps lane selection unbiased and reproducible with the seeded RNG.
    const candidates = [0, 1, 2]
    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.random() * (index + 1))
      ;[candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]]
    }
    const clearLanes = candidates.filter(lane => {
      const positions = this.traffic
        .filter(car => car.active && car.lane === lane)
        .map(car => car.root.position.z)
      return hasTrafficSpawnGap(positions, spawnZ, 26)
    })
    // Never add a pair if another vehicle already occupies the would-be escape lane.
    const safeWaveSize = wanted === 2 && clearLanes.length === 3 ? 2 : 1
    const lanes = clearLanes.slice(0, safeWaveSize)
    const availableCars = this.traffic.filter(car => !car.active).slice(0, lanes.length)

    lanes.forEach((lane, index) => {
      const car = availableCars[index]
      if (!car) return
      car.lane = lane
      car.tagged = false
      car.speedFactor = trafficSpeedFactor(difficulty.speedFactor, car.kind, this.random())
      // A paired wave arrives abreast: the third lane is always open for a clean dodge.
      car.root.position.set(laneCenter(lane), 0.02, spawnZ + (index ? -1.2 : 0))
      car.root.visible = true
      car.active = true
    })
  }

  private updateTraffic(movement: number): void {
    for (const car of this.traffic) {
      if (!car.active) continue
      car.root.position.z += movement * car.speedFactor
      const trafficX = laneCenter(car.lane)
      const hitX = Math.abs(this.x - trafficX) < (car.width + 1.12) * 0.5
      const hitZ = Math.abs(RACE_CONFIG.playerZ - car.root.position.z) < (car.length + 3.15) * 0.5
      if (this.invulnerable <= 0 && hitX && hitZ) {
        car.active = false
        car.root.visible = false
        this.lives = Math.max(0, this.lives - 1)
        this.invulnerable = 1.35
        this.hitShake = 1
        if (this.crashBuffer) {
          try { this.audio.playBuffer(this.crashBuffer, 'sfx') } catch { this.audio.play('hurt') }
        } else this.audio.play('hurt')
        if (this.lives <= 0) this.finish()
        continue
      }
      if (!car.tagged && car.root.position.z > RACE_CONFIG.playerZ + 3.2) {
        car.tagged = true
        if (Math.abs(this.x - trafficX) >= (car.width + 1.12) * 0.5 && Math.abs(this.x - trafficX) < 4.15) this.nearMisses += 1
      }
      if (car.root.position.z > RACE_CONFIG.playerZ + 15) {
        car.active = false
        car.root.visible = false
      }
    }
  }

  private finish(): void {
    if (this.mode !== 'playing') return
    this.mode = 'ended'
    this.stopEngine()
    this.audio.play('lose')
    this.result = {
      score: calculateScore(this.distance, this.nearMisses),
      distance: this.distance,
      nearMisses: this.nearMisses,
      seconds: this.elapsed,
      unranked: tuning.unranked,
    }
  }

  private stopEngine(): void {
    if (!this.engineVoice) return
    try { this.engineVoice.stop() } catch { /* already ended */ }
    this.engineVoice = undefined
  }
}

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function trafficDimensions(kind: TrafficKind): { width: number; length: number } {
  switch (kind) {
    case 'suv': return { width: 2.12, length: 4.85 }
    case 'van': return { width: 2.18, length: 5.35 }
    case 'pickup': return { width: 2.08, length: 5.05 }
    default: return { width: 1.86, length: 4.35 }
  }
}
