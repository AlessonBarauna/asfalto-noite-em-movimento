import { defaultPowerLevels, powerDuration, type PowerLevels, CLEAR_REMOVES, FIRST_PICKUP_DISTANCE, POWERS, POWER_IDS, nextPickupGap, pickPower, powerFraction, type PowerId } from './powers'
import * as THREE from 'three'
import type { Audio } from '../engine/audio'
import { Soundscape } from '../engine/soundscape'
import type { Input } from '../engine/input'
import type { Renderer } from '../engine/renderer'
import { RACE_CONFIG } from './race-config'
import { calculateScore, clampSteering, cruiseSpeed, hasTrafficSpawnGap, laneCenter, steerSpeedFactor, levelForDistance, trafficDifficultyByDistance, trafficSpeedFactor, trafficWaveSizeByDistance } from './race-rules'
import type { TrafficKind } from './race-rules'
import { RaceWorld } from './race-world'
import { createGolG5Model } from './gol-g5'
import { BRAZILIAN_TRAFFIC_MODELS, createBrazilianTrafficVehicle } from './traffic-vehicles'
import { tuning } from './tuning'
import { applyGarageVisuals } from './garage-visuals'
import { Effects } from './fx'
import { createSupercar, loadedSupercar } from './supercar'
import { TINT_OPTIONS, WHEEL_OPTIONS } from './economy'
import type { ScenarioId } from './scenarios'
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
  level: number
  carsJumped: number
  hits: number
  power: { label: string; color: string; fraction: number } | null
  mode: 'title' | 'playing' | 'paused' | 'ended'
}

export type RaceResult = { score: number; distance: number; nearMisses: number; carsJumped: number; hits: number; city: string; seconds: number; unranked: boolean }
type TrafficCar = { root: THREE.Group; kind: TrafficKind; lane: number; active: boolean; tagged: boolean; speedFactor: number; width: number; length: number; height: number; jumped: boolean }

/** Pulo: ~1,9 m de altura e ~0,9 s no ar — passa por cima de carros comuns. */
const JUMP_SPEED = 8.6
const JUMP_GRAVITY = 19

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
  private speed = cruiseSpeed(0)
  private steer = 0
  private distance = 0
  private elapsed = 0
  private lives: number = RACE_CONFIG.startingLives
  private nearMisses = 0
  private power: PowerId | null = null
  private bonusDistance = 0
  private bonusNearMisses = 0
  private powerTimer = 0
  private powerTotal = 1
  private powerLevels: PowerLevels = defaultPowerLevels()
  private flyY = 0
  private altitude = 0
  private pickupGap = FIRST_PICKUP_DISTANCE
  private readonly pickups: Array<{ mesh: THREE.Group; id: PowerId }> = []
  private readonly pickupProtos = new Map<PowerId, THREE.Group>()
  private aura!: THREE.Mesh
  private readonly wings = new THREE.Group()
  private carsJumped = 0
  private hits = 0
  private scenarioId: ScenarioId = 'cidade'
  private trafficBoost = 1
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
  private garageView = false
  private readonly sound: Soundscape
  private jumpY = 0
  private jumpV = 0
  private jumpCooldown = 0
  private lastLevel = 1
  private garageYaw = 0.6
  private garagePitch = 0.2
  private garageDist = 8.2

  constructor(
    private readonly renderer: Renderer,
    private readonly input: Input,
    private readonly audio: Audio,
    sounds: { crash?: AudioBuffer; engine?: AudioBuffer; playerVehicle?: PlayerVehicleId; scenario?: ScenarioId; playerPaint?: string; playerWheels?: string; playerTint?: string; playerSpoiler?: string; playerSuspension?: string; playerExhaust?: string; playerHeadlights?: string } = {},
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
    this.createPowerVisuals()
    this.world.scene.add(this.effects.mesh)
    this.sound = new Soundscape(audio)
    this.sound.start()
    this.setScenario(sounds.scenario ?? 'cidade')
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
      const rimColor = WHEEL_OPTIONS.find(o => o.id === wheels)?.color ?? WHEEL_OPTIONS[0].color
      const glassTint = TINT_OPTIONS.find(o => o.id === tint)?.color ?? TINT_OPTIONS[0].color
      const lamp = headlights === 'led' ? '#bfe3ff' : headlights === 'xenon' ? '#e6f0ff' : '#fff1c9'
      car.group.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return
        const mat = node.material as THREE.MeshStandardMaterial
        if (/^Rim/.test(mat.name)) mat.color.set(rimColor)
        else if (mat.name === 'Glass') { mat.color.set(glassTint); mat.transparent = true; mat.opacity = tint === 'dark' ? 0.92 : tint === 'light' ? 0.55 : 0.78 }
        else if (mat.name === 'Headlight') mat.emissive.set(lamp)
      })
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

  /** While the garage is open the camera orbits the car and frames it beside the side panel. */
  setGarageView(on: boolean): void {
    if (on === this.garageView) return
    this.garageView = on
    if (on) this.resetGarageView()
    else this.camera.clearViewOffset()
  }

  resetGarageView(): void {
    this.garageYaw = 0.6
    this.garagePitch = 0.2
    this.garageDist = 8.2
  }

  /** Arrasto do mouse/dedo: gira em volta do carro e inclina a câmera (sem rotação automática). */
  garageOrbit(dx: number, dy: number): void {
    this.garageYaw -= dx * 0.0085
    this.garagePitch = THREE.MathUtils.clamp(this.garagePitch + dy * 0.006, -0.05, 1.0)
  }

  garageZoom(delta: number): void {
    this.garageDist = THREE.MathUtils.clamp(this.garageDist * Math.exp(delta * 0.0012), 4.2, 14)
  }

  /** Contratos de carga valiosa deixam o trânsito mais denso (multiplicador sobre a frequência). */
  setTrafficBoost(multiplier: number): void {
    this.trafficBoost = Math.max(1, Math.min(2, multiplier))
  }

  get city(): ScenarioId {
    return this.scenarioId
  }

  /** Visual de uma cidade do mapa: tema-base + clima + monumentos reais. */
  setCity(cityId: string, theme: ScenarioId): void {
    this.scenarioId = theme
    const scenario = this.world.setCity(cityId, theme)
    this.setRain(scenario.rain && this.renderer.rainAllowed)
    this.sound.setScene(theme, scenario.rain && this.renderer.rainAllowed)
  }

  setScenario(id: ScenarioId): void {
    this.scenarioId = id
    const scenario = this.world.setScenario(id)
    this.setRain(scenario.rain && this.renderer.rainAllowed)
    this.sound.setScene(id, scenario.rain && this.renderer.rainAllowed)
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
    this.speed = cruiseSpeed(0)
    this.steer = 0
    this.distance = 0
    this.elapsed = 0
    this.lives = RACE_CONFIG.startingLives
    this.nearMisses = 0
    this.bonusDistance = 0
    this.bonusNearMisses = 0
    this.carsJumped = 0
    this.hits = 0
    this.clearPowers()
    this.spawnTimer = 0.95
    this.invulnerable = 0
    this.boostTimer = 0
    this.boostCooldown = 0
    this.hitShake = 0
    this.hitFlash = 0
    this.jumpY = 0
    this.jumpV = 0
    this.jumpCooldown = 0
    this.lastLevel = 1
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
      this.sound.nitro()
    }

    // Pulo: sobe rápido, cai com gravidade; durante o salto o carro passa por cima do trânsito.
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt)
    if (this.input.consume('jump') && this.jumpY <= 0 && this.jumpCooldown <= 0) {
      this.jumpV = JUMP_SPEED
      this.sound.jump()
    }
    if (this.jumpV !== 0 || this.jumpY > 0) {
      this.jumpV -= JUMP_GRAVITY * dt
      this.jumpY += this.jumpV * dt
      if (this.jumpY <= 0) {
        this.jumpY = 0
        this.jumpV = 0
        this.jumpCooldown = 0.25
        this.sound.land()
        this.effects.burst(new THREE.Vector3(this.x, 0.15, RACE_CONFIG.playerZ), '#cfd8dc', 10, 3)
      }
    }
    // Poderes: o orbe vale por alguns segundos; as asas mantêm o carro no alto.
    this.powerTimer = Math.max(0, this.powerTimer - dt)
    if (this.power && this.powerTimer <= 0) this.endPower()
    // Nitro infinito: o turbo fica sempre aceso e a recarga não corre
    if (this.power === 'turbo') { this.boostTimer = Math.max(this.boostTimer, 0.25); this.boostCooldown = 0 }
    const flying = this.power === 'wings'
    this.flyY = THREE.MathUtils.damp(this.flyY, flying ? 3.5 + Math.sin(this.elapsed * 3) * 0.18 : 0, flying ? 3 : 4.5, dt)
    this.altitude = Math.max(this.jumpY, this.flyY)
    this.updatePowerVisuals(dt)
    this.player.position.y = this.altitude
    this.playerVisual.rotation.x = THREE.MathUtils.clamp(this.jumpV * 0.011, -0.11, 0.11)

    const level = levelForDistance(this.distance)
    if (level > this.lastLevel) { this.lastLevel = level; this.sound.levelUp() }

    // Velocidade de cruzeiro sobe com a distância (sem teto); acelerar/frear/nitro somam por cima.
    const base = cruiseSpeed(this.distance)
    let targetSpeed = base
    if (this.input.move.y > 0.12) targetSpeed += this.input.move.y * RACE_CONFIG.acceleration
    else if (this.input.move.y < -0.12) targetSpeed = Math.max(10, targetSpeed + this.input.move.y * RACE_CONFIG.brakePower)
    if (this.input.held('sprint')) targetSpeed += 7.5
    if (this.boostTimer > 0) targetSpeed += RACE_CONFIG.boostImpulse
    targetSpeed = Math.max(10, targetSpeed)
    const response = targetSpeed > this.speed ? 2.9 : 5.4
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * response)

    // Direção com inércia curta (teclado deixa de ser liga/desliga) e sensibilidade ajustável.
    const sensitivity = THREE.MathUtils.clamp(this.input.sensitivity || 1, 0.5, 2)
    const wanted = this.input.move.x
    const rate = Math.abs(wanted) > Math.abs(this.steer) ? 11 : 16
    this.steer += (wanted - this.steer) * Math.min(1, dt * rate)
    this.x = clampSteering(this.x + this.steer * RACE_CONFIG.steerSpeed * sensitivity * steerSpeedFactor(this.speed) * dt)
    this.player.position.x = this.x
    if (Math.abs(this.steer) > 0.82 && this.speed > 26 && this.jumpY <= 0) this.sound.screech()
    this.playerVisual.rotation.z = THREE.MathUtils.damp(this.playerVisual.rotation.z, -this.steer * 0.075, 7, dt)
    if (this.invulnerable > 0) this.player.visible = Math.floor(this.elapsed * 13) % 2 === 0
    else this.player.visible = true

    const movement = this.speed * dt
    this.distance += movement
    if (this.power === 'cash') this.bonusDistance += movement
    this.world.update(movement, dt)
    this.updateTraffic(movement)
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) this.spawnTraffic()
    this.updatePickups(movement, dt)
    if (this.engineVoice && this.engineVoice.playbackRate) {
      this.engineVoice.playbackRate.setTargetAtTime(0.84 + Math.min(0.5, this.speed / 120), this.audio.ctx.currentTime, 0.08)
    }
  }

  render(frameSeconds: number): RaceSnapshot {
    const dt = Math.max(0, frameSeconds)
    const follow = 1 - Math.exp(-5.8 * dt)
    this.cameraX += (this.x - this.cameraX) * follow
    const speed01 = this.mode === 'title' ? 0 : THREE.MathUtils.clamp((this.speed - 16) / 75, 0, 1)
    const boosting = this.mode === 'playing' && this.boostTimer > 0
    this.fovBoost = THREE.MathUtils.damp(this.fovBoost, speed01 * 9 + (boosting ? 7 : 0), 4, dt)
    if (Math.abs(this.camera.fov - (56 + this.fovBoost)) > 0.01) {
      this.camera.fov = 56 + this.fovBoost
      this.camera.updateProjectionMatrix()
    }
    if (this.garageView) {
      const w = window.innerWidth
      const h = window.innerHeight
      if (w > 760) this.camera.setViewOffset(w, h, -w * 0.17, 0, w, h)
      else this.camera.clearViewOffset()
      this.camera.fov = 38
      this.camera.updateProjectionMatrix()
      const cx = this.x
      const cz = RACE_CONFIG.playerZ
      const flat = Math.cos(this.garagePitch) * this.garageDist
      this.camera.position.set(cx + Math.sin(this.garageYaw) * flat, 0.75 + Math.sin(this.garagePitch) * this.garageDist, cz + Math.cos(this.garageYaw) * flat)
      this.camera.lookAt(cx, 0.75, cz)
      this.world.animate(dt, 0)
      this.effects.update(dt)
      this.updateCarLights(false)
      this.renderer.setFx(0, 0)
      this.renderer.render(this.world.scene, this.camera)
      return this.snapshot()
    }
    const rumble = this.mode === 'playing' ? speed01 * 0.035 : 0
    this.camera.position.set(
      this.cameraX * 0.36 + (Math.random() - 0.5) * rumble,
      5.05 + this.hitShake * 0.3 + (Math.random() - 0.5) * rumble,
      RACE_CONFIG.playerZ + 12.6 + this.hitShake - speed01 * 0.5,
    )
    this.camera.position.y += this.jumpY * 0.4
    this.camera.lookAt(this.cameraX * 0.65, 1.05, -21)
    this.wheelSpin += (this.mode === 'title' ? 0 : this.speed) * dt / 0.35
    for (const w of this.playerWheels) w.rotation.x = this.wheelSpin
    this.world.animate(dt, this.mode === 'title' ? 14 : this.speed)
    this.effects.update(dt)
    this.updateCarLights(boosting)
    this.sound.update(dt, {
      speed: this.speed,
      throttle: this.mode === 'playing' ? THREE.MathUtils.clamp(0.25 + Math.max(0, this.input.move.y) * 0.75, 0, 1) : 0,
      boosting,
      driving: this.mode === 'playing',
      level: levelForDistance(this.distance),
      airborne: this.jumpY > 0,
    })
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
      level: levelForDistance(this.distance),
      carsJumped: this.carsJumped,
      hits: this.hits,
      power: this.power ? { label: POWERS[this.power].label, color: POWERS[this.power].color, fraction: powerFraction(this.power, this.powerTimer, this.powerTotal) } : null,
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
      this.traffic.push({ root, kind, lane: 1, active: false, tagged: false, speedFactor: 1, width: model.width, length: model.length, height: 0, jumped: false })
    }
  }

  /** Oncoming cars carry headlight halos and a wet-road reflection streak. */
  private addTrafficGlow(root: THREE.Group, width: number, length: number): void {
    for (const side of [-1, 1]) {
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: '#fff1d0', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }))
      halo.scale.setScalar(1.35)
      halo.position.set(side * width * 0.31, 0.78, length * 0.5 + 0.12)
      root.add(halo)
    }
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 1.7, 15),
      new THREE.MeshBasicMaterial({ color: '#ffe6bd', map: this.streak, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
    )
    beam.rotation.x = -Math.PI / 2
    beam.position.set(0, 0.03, length * 0.5 + 7.2)
    root.add(beam)
  }

  /** Player headlight spots, tail/brake halos, nitro flames. */
  private createCarLights(): void {
    for (const side of [-1, 1]) {
      const spot = new THREE.SpotLight('#ffe9c4', 110, 70, 0.42, 0.7, 1.6)
      spot.position.set(side * 0.6, 0.85, RACE_CONFIG.playerZ - 2)
      spot.target.position.set(side * 0.4, 0, RACE_CONFIG.playerZ - 38)
      this.carLights.add(spot, spot.target)
      this.headSpots.push(spot)
      const tail = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: '#ff2a1c', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }))
      tail.scale.setScalar(1.7)
      tail.position.set(side * 0.72, 0.84, RACE_CONFIG.playerZ + 2.05)
      this.carLights.add(tail)
      this.tailGlows.push(tail)
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: '#6cc4ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }))
      flame.position.set(side * 0.55, 0.34, RACE_CONFIG.playerZ + 2.5)
      this.carLights.add(flame)
      this.nitroFlames.push(flame)
    }
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 34),
      new THREE.MeshBasicMaterial({ color: '#ffe3b0', map: this.streak, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
    )
    beam.rotation.x = -Math.PI / 2
    beam.position.set(0, 0.03, RACE_CONFIG.playerZ - 19)
    this.carLights.add(beam)
    const tailStreak = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 9),
      new THREE.MeshBasicMaterial({ color: '#ff3b2a', map: this.streak, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
    )
    tailStreak.rotation.set(-Math.PI / 2, 0, Math.PI)
    tailStreak.position.set(0, 0.03, RACE_CONFIG.playerZ + 6.4)
    this.carLights.add(tailStreak)
    const fill = new THREE.DirectionalLight('#bcd0ff', 1.1)
    fill.position.set(5, 9, RACE_CONFIG.playerZ + 22)
    fill.target.position.set(0, 0.6, RACE_CONFIG.playerZ)
    this.carLights.add(fill, fill.target)
    this.world.scene.add(this.carLights)
  }

  private updateCarLights(boosting: boolean): void {
    this.carLights.position.x = this.x
    this.carLights.position.y = this.jumpY
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
    const difficulty = trafficDifficultyByDistance(this.distance)
    this.spawnTimer = Math.max((difficulty.interval * (this.power === 'clear' ? 4 : 1) / this.trafficBoost) * (0.9 + this.random() * 0.2), activeCount > 5 ? 0.58 : 0)

    // Later in the run, occasional two-car waves leave one readable escape lane.
    const wanted = trafficWaveSizeByDistance(this.distance, this.random())
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
      car.jumped = false
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
      if (car.height === 0) car.height = Math.max(1.2, new THREE.Box3().setFromObject(car.root).max.y)
      const clearsCar = this.altitude > car.height * 0.82
      if (hitX && hitZ && clearsCar && this.power === null && this.flyY < 0.3) car.jumped = true
      if (this.invulnerable <= 0 && this.power !== 'ghost' && hitX && hitZ && !clearsCar) {
        car.active = false
        car.root.visible = false
        this.lives = Math.max(0, this.lives - 1)
        this.hits += 1
        this.invulnerable = 1.35
        this.hitShake = 1
        this.hitFlash = 1
        this.effects.burst(new THREE.Vector3(this.x, 0.8, RACE_CONFIG.playerZ - 1.4), '#ffb24a', 34, 9)
        this.effects.burst(new THREE.Vector3(this.x, 0.5, RACE_CONFIG.playerZ - 1.4), '#ffe9b0', 14, 5)
        if (this.crashBuffer) {
          try { this.audio.playBuffer(this.crashBuffer, 'sfx') } catch { this.audio.play('hurt') }
        } else this.audio.play('hurt')
        this.sound.crash()
        if (this.lives <= 0) this.finish()
        continue
      }
      if (!car.tagged && car.root.position.z > RACE_CONFIG.playerZ + 3.2) {
        car.tagged = true
        const pan = THREE.MathUtils.clamp((trafficX - this.x) / 5, -1, 1)
        if (car.jumped) { this.nearMisses += 2; if (this.power === 'cash') this.bonusNearMisses += 2; this.carsJumped += 1; this.sound.passBy(pan) }
        else if (Math.abs(this.x - trafficX) >= (car.width + 1.12) * 0.5 && Math.abs(this.x - trafficX) < 4.15) { this.nearMisses += 1; if (this.power === 'cash') this.bonusNearMisses += 1; this.sound.passBy(pan) }
      }
      if (car.root.position.z > RACE_CONFIG.playerZ + 15) {
        car.active = false
        car.root.visible = false
      }
    }
  }

  /** Aura colorida, asas e orbes (protótipos reaproveitados a cada sorteio). */
  private createPowerVisuals(): void {
    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }),
    )
    aura.scale.set(1.5, 0.95, 2.9)
    aura.position.set(0, 0.8, 0)
    aura.visible = false
    this.aura = aura
    this.player.add(aura)
    const wingMat = new THREE.MeshBasicMaterial({ color: POWERS.wings.color, transparent: true, opacity: 0.8, toneMapped: false, fog: false, side: THREE.DoubleSide })
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.8), wingMat)
      wing.position.set(side * 1.65, 0.85, 0.1)
      wing.rotation.z = side * 0.18
      this.wings.add(wing)
    }
    this.wings.visible = false
    this.player.add(this.wings)
    for (const id of POWER_IDS) {
      const color = POWERS[id].color
      const group = new THREE.Group()
      const core = new THREE.Mesh(
        id === 'clear' ? new THREE.SphereGeometry(0.42, 18, 12) : id === 'wings' ? new THREE.ConeGeometry(0.45, 0.9, 4) : id === 'turbo' ? new THREE.OctahedronGeometry(0.5, 0) : id === 'cash' ? new THREE.CylinderGeometry(0.42, 0.42, 0.14, 20) : new THREE.IcosahedronGeometry(0.45, 0),
        new THREE.MeshBasicMaterial({ color, toneMapped: false, fog: false }),
      )
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.055, 8, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, toneMapped: false, fog: false }))
      const glow = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }))
      group.add(core, ring, glow)
      this.pickupProtos.set(id, group)
    }
  }

  private updatePowerVisuals(dt: number): void {
    const on = this.power !== null && this.mode === 'playing'
    this.aura.visible = on
    this.wings.visible = this.power === 'wings'
    if (on && this.power) {
      ;(this.aura.material as THREE.MeshBasicMaterial).color.set(POWERS[this.power].color)
      ;(this.aura.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(this.elapsed * 8) * 0.06 + (this.power === 'ghost' ? 0.08 : 0)
      const left = this.powerTimer < 1.6 && Math.floor(this.elapsed * 8) % 2 === 0
      if (left) this.aura.visible = false // pisca no final para avisar que acaba
    }
    if (this.power === 'wings') {
      const flap = Math.sin(this.elapsed * 14) * 0.22
      this.wings.children.forEach((wing, i) => { wing.rotation.z = (i === 0 ? -1 : 1) * (0.18 + flap) })
    }
    void dt
  }

  /** Distância e quase-batidas feitas com "Créditos em dobro" ativo (pagas uma segunda vez). */
  get bonus(): { distance: number; nearMisses: number } {
    return { distance: this.bonusDistance, nearMisses: this.bonusNearMisses }
  }

  /** Som de comemoração (contrato entregue). */
  cheer(): void {
    this.sound.levelUp()
  }

  /** Evolução dos poderes comprada pelo jogador (vale a partir do próximo orbe). */
  setPowerLevels(levels: PowerLevels): void {
    this.powerLevels = { ...levels }
  }

  private grantPower(id: PowerId): void {
    this.power = id
    this.powerTotal = powerDuration(id, this.powerLevels[id])
    this.powerTimer = this.powerTotal
    this.sound.power()
    this.effects.burst(new THREE.Vector3(this.x, 1.1, RACE_CONFIG.playerZ - 0.6), POWERS[id].color, 26, 7)
    if (id === 'clear') {
      let n = 0
      for (const car of this.traffic) {
        if (!car.active || car.root.position.z > RACE_CONFIG.playerZ - 18) continue
        if ((n++ % 3) / 3 >= CLEAR_REMOVES) continue
        this.effects.burst(new THREE.Vector3(car.root.position.x, 0.9, car.root.position.z), POWERS.clear.color, 8, 4)
        car.active = false
        car.root.visible = false
      }
    }
  }

  private endPower(): void {
    if (this.power === 'wings' || this.power === 'ghost' || this.power === 'turbo') this.invulnerable = Math.max(this.invulnerable, 1.1)
    if (this.power === 'turbo') this.boostCooldown = RACE_CONFIG.boostCooldown * 0.6
    this.power = null
    this.sound.powerEnd()
  }

  private clearPowers(): void {
    this.power = null
    this.powerTimer = 0
    this.flyY = 0
    this.altitude = 0
    this.pickupGap = FIRST_PICKUP_DISTANCE
    for (const pickup of this.pickups) this.world.scene.remove(pickup.mesh)
    this.pickups.length = 0
    if (this.aura) { this.aura.visible = false; this.wings.visible = false }
  }

  private updatePickups(movement: number, dt: number): void {
    this.pickupGap -= movement
    if (this.pickupGap <= 0) {
      this.pickupGap = nextPickupGap(this.random())
      const id = pickPower(this.random())
      const proto = this.pickupProtos.get(id)
      if (proto) {
        const mesh = proto.clone(true)
        mesh.position.set(laneCenter(Math.floor(this.random() * 3)), 1.15, -RACE_CONFIG.spawnDistance)
        this.world.scene.add(mesh)
        this.pickups.push({ mesh, id })
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const { mesh, id } = this.pickups[i]
      mesh.position.z += movement
      mesh.rotation.y += dt * 2.4
      mesh.position.y = 1.15 + Math.sin(this.elapsed * 3 + i) * 0.14
      const taken = Math.abs(mesh.position.z - RACE_CONFIG.playerZ) < 1.9 && Math.abs(mesh.position.x - this.x) < 1.7
      if (taken) this.grantPower(id)
      if (taken || mesh.position.z > RACE_CONFIG.playerZ + 8) {
        this.world.scene.remove(mesh)
        this.pickups.splice(i, 1)
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
      carsJumped: this.carsJumped,
      hits: this.hits,
      city: this.scenarioId,
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
