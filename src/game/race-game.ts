import * as THREE from 'three'
import type { Audio } from '../engine/audio'
import type { Input } from '../engine/input'
import type { Renderer } from '../engine/renderer'
import { RACE_CONFIG } from './race-config'
import { calculateScore, clampSteering, hasTrafficSpawnGap, laneCenter, trafficDifficulty, trafficSpeedFactor, trafficWaveSize } from './race-rules'
import type { TrafficKind } from './race-rules'
import { RaceWorld } from './race-world'
import { createGolG5Model } from './gol-g5'
import { BRAZILIAN_TRAFFIC_MODELS, createBrazilianTrafficVehicle } from './traffic-vehicles'
import { tuning } from './tuning'
import { applyGarageVisuals } from './garage-visuals'
import { Effects } from './fx'
import { createSupercar, loadedSupercar } from './supercar'
import type { PlayerVehicleId } from '../engine/save'
import { glowTexture, streakTexture } from './visuals/textures'

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
  private readonly effects = new Effects()
  private readonly glow = glowTexture()
  private readonly streak = streakTexture()
  private readonly carLights = new THREE.Group()
  private readonly headSpots: THREE.SpotLight[] = []
  private readonly tailGlows: THREE.Sprite[] = []
  private readonly nitroFlames: THREE.Sprite[] = []
  private rainOn = true
  private hitFlash = 0
  private fovBoost = 0

  constructor(
    private readonly renderer: Renderer,
    private readonly input: Input,
    private readonly audio: Audio,
    sounds: { crash?: AudioBuffer; engine?: AudioBuffer; playerVehicle?: PlayerVehicleId; playerPaint?: string; playerWheels?: string; playerTint?: string; playerSpoiler?: string; playerSuspension?: string; playerExhaust?: string; playerHeadlights?: string } = {},
  ) {
    this.world = new RaceWorld(renderer.gl, renderer.shadowMapSize)
    this.crashBuffer = sounds.crash
    this.engineBuffer = sounds.engine
    this.world.scene.add(this.player)
    this.player.add(this.playerVisual)
    const initialCar = this.buildPlayerCar(sounds.playerVehicle ?? 'gol-g5', sounds.playerPaint ?? PLAYER_PAINT, sounds.playerWheels ?? 'alloy', sounds.playerTint ?? 'smoke', sounds.playerSpoiler ?? 'none', sounds.playerSuspension ?? 'stock', sounds.playerExhaust ?? 'stock', sounds.playerHeadlights ?? 'halogen')
    this.playerVisual.add(initialCar)
    this.player.rotation.y = Math.PI // The player car faces +Z; rotate it toward the road's -Z direction.
    this.player.position.set(0, 0.02, RACE_CONFIG.playerZ)
    this.createTrafficPool()
    this.createCarLights()
    this.world.scene.add(this.effects.mesh)
    this.setRain(renderer.rainAllowed)
    window.addEventListener('keydown', event => { if (event.code === 'KeyR' && !event.repeat && renderer.rainAllowed) this.setRain(!this.rainOn) })
    this.camera.position.set(0, 5.2, RACE_CONFIG.playerZ + 12.6)
    this.camera.lookAt(0, 1.2, -19)
  }

  private playerWheels: THREE.Object3D[] = []
  private wheelSpin = 0

  private buildPlayerCar(model: PlayerVehicleId, paint: THREE.ColorRepresentation, wheels: string, tint: string, spoiler: string, suspension: string, exhaust: string, headlights: string): THREE.Group {
    this.playerWheels = []
    const template = model === 'supercar' ? loadedSupercar() : undefined
    if (template) {
      const car = createSupercar(template, paint)
      this.playerWheels = car.wheels
      return car.group
    }
    const car = model === 'gol-g5' || model === 'supercar' ? createGolG5Model(paint) : createBrazilianTrafficVehicle(model, paint)
    applyGarageVisuals(car, wheels, tint, spoiler, suspension, exhaust, headlights)
    return car
  }

  setPlayerVehicle(model: PlayerVehicleId, paint = '#4a5052', wheels = 'alloy', tint = 'smoke', spoiler = 'none', suspension = 'stock', exhaust = 'stock', headlights = 'halogen'): void {
    this.playerVisual.clear()
    this.playerVisual.add(this.buildPlayerCar(model, paint, wheels, tint, spoiler, suspension, exhaust, headlights))
  }

  setRain(on: boolean): void {
    this.rainOn = on
    this.world.setRain(on)
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
    this.hitFlash = 0
    this.effects.clear()
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
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2.2)

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
    const dt = Math.max(0, frameSeconds)
    const follow = 1 - Math.exp(-5.8 * dt)
    this.cameraX += (this.x - this.cameraX) * follow
    const speed01 = this.mode === 'title' ? 0 : THREE.MathUtils.clamp((this.speed - RACE_CONFIG.startSpeed) / (RACE_CONFIG.maxSpeed + RACE_CONFIG.boostImpulse - RACE_CONFIG.startSpeed), 0, 1)
    const boosting = this.mode === 'playing' && this.boostTimer > 0
    this.fovBoost = THREE.MathUtils.damp(this.fovBoost, speed01 * 9 + (boosting ? 7 : 0), 4, dt)
    if (Math.abs(this.camera.fov - (56 + this.fovBoost)) > 0.01) {
      this.camera.fov = 56 + this.fovBoost
      this.camera.updateProjectionMatrix()
    }
    const rumble = this.mode === 'playing' ? speed01 * 0.035 : 0
    this.camera.position.set(
      this.cameraX * 0.36 + (Math.random() - 0.5) * rumble,
      5.05 + this.hitShake * 0.3 + (Math.random() - 0.5) * rumble,
      RACE_CONFIG.playerZ + 12.6 + this.hitShake - speed01 * 0.5,
    )
    this.camera.lookAt(this.cameraX * 0.65, 1.05, -21)
    this.wheelSpin += (this.mode === 'title' ? 0 : this.speed) * dt / 0.35
    for (const w of this.playerWheels) w.rotation.x = this.wheelSpin
    this.world.animate(dt, this.mode === 'title' ? 14 : this.speed)
    this.effects.update(dt)
    this.updateCarLights(boosting)
    this.renderer.setFx(speed01, this.hitFlash)
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
    for (let i = 0; i < 18; i += 1) {
      const root = new THREE.Group()
      const model = BRAZILIAN_TRAFFIC_MODELS[i % BRAZILIAN_TRAFFIC_MODELS.length]
      const kind = model.kind
      const paint = TRAFFIC_PAINTS[i % TRAFFIC_PAINTS.length]
      root.add(createBrazilianTrafficVehicle(model.id, paint))
      this.addTrafficGlow(root, model.width, model.length)
      root.rotation.y = 0
      root.position.set(0, 0.02, -100 - i * 9)
      root.visible = false
      this.world.scene.add(root)
      this.traffic.push({ root, kind, lane: 1, active: false, tagged: false, speedFactor: 1, width: model.width, length: model.length })
    }
  }

  /** Oncoming cars carry headlight halos and a wet-road reflection streak. */
  private addTrafficGlow(root: THREE.Group, width: number, length: number): void {
    for (const side of [-1, 1]) {
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: '#fff1d0', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
      halo.scale.setScalar(2.1)
      halo.position.set(side * width * 0.31, 0.78, length * 0.5 + 0.12)
      root.add(halo)
    }
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 1.7, 15),
      new THREE.MeshBasicMaterial({ color: '#ffe6bd', map: this.streak, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    )
    beam.rotation.x = -Math.PI / 2
    beam.position.set(0, 0.03, length * 0.5 + 7.2)
    root.add(beam)
  }

  /** Player headlight spots, tail/brake halos, nitro flames. */
  private createCarLights(): void {
    for (const side of [-1, 1]) {
      const spot = new THREE.SpotLight('#ffe9c4', 140, 70, 0.42, 0.7, 1.6)
      spot.position.set(side * 0.6, 0.85, RACE_CONFIG.playerZ - 2)
      spot.target.position.set(side * 0.4, 0, RACE_CONFIG.playerZ - 38)
      this.carLights.add(spot, spot.target)
      this.headSpots.push(spot)
      const tail = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: '#ff2a1c', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
      tail.scale.setScalar(1.7)
      tail.position.set(side * 0.72, 0.84, RACE_CONFIG.playerZ + 2.05)
      this.carLights.add(tail)
      this.tailGlows.push(tail)
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: '#6cc4ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
      flame.position.set(side * 0.55, 0.34, RACE_CONFIG.playerZ + 2.5)
      this.carLights.add(flame)
      this.nitroFlames.push(flame)
    }
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 34),
      new THREE.MeshBasicMaterial({ color: '#ffe3b0', map: this.streak, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    )
    beam.rotation.x = -Math.PI / 2
    beam.position.set(0, 0.03, RACE_CONFIG.playerZ - 19)
    this.carLights.add(beam)
    const tailStreak = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 9),
      new THREE.MeshBasicMaterial({ color: '#ff3b2a', map: this.streak, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    )
    tailStreak.rotation.set(-Math.PI / 2, 0, Math.PI)
    tailStreak.position.set(0, 0.03, RACE_CONFIG.playerZ + 6.4)
    this.carLights.add(tailStreak)
    const fill = new THREE.DirectionalLight('#bcd0ff', 1.5)
    fill.position.set(5, 9, RACE_CONFIG.playerZ + 22)
    fill.target.position.set(0, 0.6, RACE_CONFIG.playerZ)
    this.carLights.add(fill, fill.target)
    this.world.scene.add(this.carLights)
  }

  private updateCarLights(boosting: boolean): void {
    this.carLights.position.x = this.x
    const braking = this.mode === 'playing' && this.input.move.y < -0.12
    for (const tail of this.tailGlows) {
      tail.scale.setScalar(braking ? 3.2 : 1.7)
      tail.material.opacity = braking ? 1 : 0.8
    }
    for (const flame of this.nitroFlames) {
      const flicker = 0.75 + Math.random() * 0.25
      flame.material.opacity = boosting ? flicker : 0
      flame.scale.setScalar(boosting ? 2.6 * flicker : 0.1)
    }
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
        this.hitFlash = 1
        this.effects.burst(new THREE.Vector3(this.x, 0.8, RACE_CONFIG.playerZ - 1.4), '#ffb24a', 34, 9)
        this.effects.burst(new THREE.Vector3(this.x, 0.5, RACE_CONFIG.playerZ - 1.4), '#ffe9b0', 14, 5)
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
