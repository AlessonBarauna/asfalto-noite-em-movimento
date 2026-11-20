import * as THREE from 'three'
import { RACE_CONFIG } from './race-config'
import { Sky } from './visuals/sky'
import { Rain } from './visuals/rain'
import { buildEnvironment } from './visuals/environment'
import { MOODS, cityLook } from './city-looks'
import { streetOf, waterSide, type StreetId } from './city-streets'
import { boulevard, dunes, elevated, hillside, lanterns, tropical, type StreetCtx } from './street-scenes'
import { cobbleTexture, rippleTexture } from './visuals/street-textures'
import { LANDMARK_SCALE, buildLandmark, disposeLandmarkGeometry, landmarkMaterials } from './landmarks'
import { SCENARIOS, scenarioById, type Scenario, type ScenarioId } from './scenarios'
import { asphaltTextures, facadeStyle, gantrySignTexture, glowTexture, neonTexture, pavementTexture, shopfrontTexture, seeded, streakTexture, type FacadeStyle } from './visuals/textures'

const ROAD_LENGTH = 408
const ROAD_HALF = RACE_CONFIG.roadHalfWidth
const SIDEWALK_W = 4.2
const ASPHALT_TILE = 5.45
const PAVEMENT_TILE = 4

type MovingProp = { root: THREE.Object3D; homeZ: number; wrapAt: number; wrapBy: number }
type Blinker = { sprite: THREE.Sprite; phase: number }

/** Ambient city and road dressing. The world scrolls under the car to simulate forward motion. */
export class RaceWorld {
  readonly scene = new THREE.Scene()
  readonly sky = new Sky()
  readonly rain = new Rain()
  private readonly markers: THREE.Mesh[] = []
  private readonly props: MovingProp[] = []
  private readonly blinkers: Blinker[] = []
  private readonly glow = glowTexture()
  private readonly streak = streakTexture()
  private readonly asphalt = asphaltTextures()
  private readonly pavement = pavementTexture()
  private readonly facades: FacadeStyle[] = [
    facadeStyle(11, '#1d2733', ['#ffcf8f', '#ffb870', '#cfe6ff'], 0.34),
    facadeStyle(23, '#262a31', ['#ffd9a3', '#9fd8ff', '#ffa86b'], 0.28),
    facadeStyle(37, '#1a2630', ['#bfe3ff', '#ffe3b5', '#7fd0e0'], 0.4),
    facadeStyle(41, '#2d2b2a', ['#ffb36b', '#ffd9a0', '#ff8f5c'], 0.3),
    facadeStyle(59, '#202a26', ['#d9f5ff', '#ffe0a8', '#a8f0d0'], 0.36),
  ]
  private readonly facadeMaterials: THREE.MeshStandardMaterial[]
  private readonly roofMaterial = new THREE.MeshStandardMaterial({ color: '#171c21', roughness: 0.9, metalness: 0.1 })
  private readonly shopfronts = [1, 2, 3].map(n => shopfrontTexture(n * 13, ['#ffcf8a', '#ffe0b0', '#8fd8ff', '#ffb070']))
  private readonly random = seeded(186)
  private readonly moon: THREE.DirectionalLight
  private readonly hemi: THREE.HemisphereLight
  private readonly common = new THREE.Group()
  private readonly city = new THREE.Group()
  private readonly serra = new THREE.Group()
  private readonly desert = new THREE.Group()
  private target: THREE.Group = this.common
  private current: Scenario = SCENARIOS[0]
  private readonly envCache = new Map<ScenarioId, THREE.Texture>()
  private readonly groundMat = new THREE.MeshStandardMaterial({ color: '#0c1015', roughness: 1, metalness: 0 })
  private readonly fields: Array<(offset: number) => void> = []
  private readonly landmarkMats = landmarkMaterials()
  private readonly landmarks = new THREE.Group()
  private landmarkProps: MovingProp[] = []
  private cityId = ''
  private readonly street = new THREE.Group()
  private streetFields: Array<(scroll: number) => void> = []
  private streetProps: MovingProp[] = []
  private hiddenSide = 0
  private cobbleTex: THREE.CanvasTexture | null = null
  private rippleTex: THREE.CanvasTexture | null = null
  private skylineGroup: THREE.Group | null = null
  private fogTint: { color: THREE.Color; weight: number } | null = null
  private clock = 0
  private scroll = 0

  constructor(private readonly gl: THREE.WebGLRenderer, shadowMapSize = 1024) {
    this.scene.fog = new THREE.FogExp2('#1a1b26', 0.0036)
    this.scene.add(this.sky.mesh)
    this.facadeMaterials = this.facades.map(f => new THREE.MeshStandardMaterial({
      color: '#ffffff', map: f.map, emissiveMap: f.emissive, emissive: '#ffffff', emissiveIntensity: 0.62, roughness: 0.62, metalness: 0.18,
    }))

    this.hemi = new THREE.HemisphereLight('#7f9bc4', '#1c1410', 0.42)
    this.scene.add(this.hemi)
    this.moon = new THREE.DirectionalLight('#9fb8e8', 0.85)
    this.moon.position.set(-16, 30, -8)
    this.moon.target.position.set(0, 0, -6)
    this.moon.castShadow = true
    this.moon.shadow.mapSize.set(shadowMapSize, shadowMapSize)
    Object.assign(this.moon.shadow.camera, { left: -14, right: 14, top: 22, bottom: -22, near: 1, far: 120 })
    this.moon.shadow.bias = -0.0004
    this.moon.shadow.normalBias = 0.03
    this.scene.add(this.moon, this.moon.target)

    for (const g of [this.common, this.city, this.serra, this.desert]) this.scene.add(g)
    this.target = this.city
    this.addSkyline()
    this.addSidewalks()
    this.addBuildings()
    this.addStreetLights()
    this.target = this.common
    this.addRoad()
    this.addGantries()
    this.addGuardPosts()
    this.target = this.serra
    this.addSerra()
    this.target = this.desert
    this.addDeserto()
    this.scene.add(this.rain.mesh)
    this.scene.add(this.landmarks)
    this.scene.add(this.street)
    this.setScenario('cidade')
  }

  get scenario(): Scenario {
    return this.current
  }

  /** Swaps the whole look: dressing groups, sky, fog, lights and reflections. */
  setScenario(id: ScenarioId): Scenario {
    const sc = scenarioById(id)
    this.current = sc
    this.city.visible = sc.id === 'cidade'
    this.serra.visible = sc.id === 'serra'
    this.desert.visible = sc.id === 'deserto'
    this.sky.setPalette(sc.sky)
    this.hemi.color.set(sc.hemisphere.sky)
    this.hemi.groundColor.set(sc.hemisphere.ground)
    this.hemi.intensity = sc.hemisphere.intensity
    this.moon.color.set(sc.key.color)
    this.moon.intensity = sc.key.intensity
    this.moon.position.set(...sc.key.position)
    this.groundMat.color.set(sc.ground)
    this.gl.toneMappingExposure = sc.exposure
    let env = this.envCache.get(sc.id)
    if (!env) { env = buildEnvironment(this.gl, sc); this.envCache.set(sc.id, env) }
    this.scene.environment = env
    this.scene.environmentIntensity = sc.envIntensity
    this.setRain(sc.rain)
    return sc
  }

  /** Aplica o visual da cidade: clima por cima do cenário-base e monumentos reais passando ao lado da pista. */
  setCity(cityId: string, theme: ScenarioId): Scenario {
    this.fogTint = null
    const base = this.setScenario(theme)
    this.cityId = cityId
    const look = cityLook(cityId)
    const mood = MOODS[look.mood]
    if (look.mood !== 'neon' || base.id !== 'cidade') {
      const sky = { ...base.sky }
      // serra e deserto já têm clima próprio: o da cidade só tinge de leve
      const weight = base.id === 'cidade' ? 1 : 0.35
      const mix = (from: readonly [number, number, number], to?: readonly [number, number, number]): [number, number, number] =>
        to ? [from[0] + (to[0] - from[0]) * weight, from[1] + (to[1] - from[1]) * weight, from[2] + (to[2] - from[2]) * weight] : [from[0], from[1], from[2]]
      sky.zenith = mix(sky.zenith, mood.zenith)
      sky.mid = mix(sky.mid, mood.mid)
      sky.horizon = mix(sky.horizon, mood.horizon)
      sky.glow = mix(sky.glow, mood.glow)
      this.sky.setPalette(sky)
      if (mood.fog) { this.fogTint = { color: new THREE.Color(mood.fog), weight }; this.setRain(this.rain.enabled) }
      if (mood.ground) this.groundMat.color.lerp(new THREE.Color(mood.ground), weight)
    }
    this.buildLandmarks(look.marks)
    this.buildStreet(streetOf(cityId))
    return base
  }

  private clearLandmarks(): void {
    this.landmarks.clear()
    for (const prop of this.props) if (prop.root.userData.building) { prop.root.visible = true; prop.root.scale.y = 1 }
    if (this.skylineGroup) this.skylineGroup.scale.y = 1
    this.landmarkProps = this.landmarkProps.filter(() => false)
    for (let i = this.props.length - 1; i >= 0; i -= 1) if (this.props[i].root.userData.landmark) this.props.splice(i, 1)
    disposeLandmarkGeometry()
  }

  /** Três monumentos da cidade se revezam ao longo da pista, sempre longe do asfalto, emergindo da névoa. */
  private buildLandmarks(marks: readonly string[]): void {
    this.clearLandmarks()
    if (!marks.length) return
    // ruas mais baixas deixam os monumentos aparecerem acima dos prédios
    for (const prop of this.props) if (prop.root.userData.building) prop.root.scale.y = 0.3
    if (this.skylineGroup) this.skylineGroup.scale.y = 0.35
    const slots = 3
    const spacing = 340
    for (let i = 0; i < slots; i += 1) {
      const id = marks[i % marks.length] as Parameters<typeof buildLandmark>[0]
      const piece = buildLandmark(id, this.landmarkMats)
      const group = piece.group
      const boost = 1.3 * (LANDMARK_SCALE[id] ?? 1)
      group.scale.setScalar(boost)
      const half = piece.half * boost
      const side = i % 2 === 0 ? 1 : -1
      const root = new THREE.Group()
      root.userData.landmark = true
      group.position.x = 0
      root.add(group)
      root.position.set(side * (ROAD_HALF + 26 + half * 1.15), 0, -120 - i * spacing)
      root.rotation.y = side * -0.35
      // um brilho quente na base, como se o monumento fosse iluminado por refletores
      const wash = new THREE.Mesh(new THREE.PlaneGeometry(half * 3.2, half * 3.2), this.additive('#ffcf8f', 0.4, this.glow))
      wash.rotation.x = -Math.PI / 2
      wash.position.y = 0.05
      root.add(wash)
      this.landmarks.add(root)
      root.userData.half = half
      root.userData.side = side
      const prop = { root, homeZ: root.position.z, wrapAt: 60, wrapBy: slots * spacing }
      this.props.push(prop)
      this.landmarkProps.push(prop)
    }
  }

  private clearStreet(): void {
    this.street.traverse(node => {
      const mesh = node as THREE.Mesh
      if (mesh.isMesh) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose() }
    })
    this.street.clear()
    this.streetFields = []
    for (const prop of this.streetProps) { const at = this.props.indexOf(prop); if (at >= 0) this.props.splice(at, 1) }
    this.streetProps = []
    if (this.hiddenSide) for (const prop of this.props) if (prop.root.userData.building) prop.root.visible = true
    this.hiddenSide = 0
  }

  /** Faixa plana ao longo da pista (água, areia, neve, pedra); a textura corre com a velocidade. */
  private strip(x0: number, x1: number, y: number, mat: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), 1500), mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set((x0 + x1) / 2, y, -620)
    this.street.add(mesh)
    return mesh
  }

  private scrolling(tex: THREE.Texture, width: number, tile: number, speedFactor = 1): void {
    tex.repeat.set(width / tile, 1500 / tile)
    this.streetFields.push(scroll => { tex.offset.y = (scroll * speedFactor) / tile })
  }

  /** Objeto que passa pela lateral da pista e volta ao fim do trecho. */
  private streetProp(root: THREE.Object3D, z: number, period: number): void {
    root.userData.street = true
    this.street.add(root)
    const prop = { root, homeZ: z, wrapAt: 60, wrapBy: period }
    root.position.z = z
    this.props.push(prop)
    this.streetProps.push(prop)
  }

  /** Cada cidade com identidade própria na rua: canais, orla, neve ou paralelepípedo. */
  private buildStreet(kind: StreetId | null): void {
    this.clearStreet()
    if (!kind) return
    const ripple = (this.rippleTex ??= rippleTexture())
    const curbX = ROAD_HALF + 0.3
    const edgeX = curbX + SIDEWALK_W
    const scenes: Partial<Record<StreetId, (ctx: StreetCtx) => void>> = { boulevard, hillside, tropical, dunes, lanterns, elevated }
    const scene = scenes[kind]
    if (scene) {
      scene({
        group: this.street,
        strip: (x0, x1, y, mat) => this.strip(x0, x1, y, mat),
        prop: (root, z, period) => this.streetProp(root, z, period),
        tick: fn => this.streetFields.push(fn),
        hideSide: side => {
          this.hiddenSide = side
          for (const prop of this.props) if (prop.root.userData.building && prop.root.userData.building.side === side) prop.root.visible = false
        },
        glow: this.glow,
        cityId: this.cityId,
        curbX,
        edgeX,
        roadHalf: ROAD_HALF,
        sidewalk: SIDEWALK_W,
      })
      return
    }
    if (kind === 'cobble') {
      const tex = (this.cobbleTex ??= cobbleTexture())
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.02, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
      this.strip(-ROAD_HALF, ROAD_HALF, -0.05, mat)
      this.scrolling(tex, ROAD_HALF * 2, 4)
      return
    }
    if (kind === 'canal') {
      const mat = new THREE.MeshStandardMaterial({ color: '#12607f', emissive: '#0a4560', emissiveIntensity: 1.5, roughness: 0.18, metalness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
      const glint = new THREE.MeshBasicMaterial({ map: ripple, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
      const rip = ripple.clone()
      rip.needsUpdate = true
      glint.map = rip
      this.scrolling(rip, SIDEWALK_W + 1, 10, 0.9)
      const poleMat = new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.8 })
      const stripeMat = new THREE.MeshStandardMaterial({ color: '#d9d2c3', roughness: 0.7 })
      const lampMat = new THREE.MeshBasicMaterial({ color: '#ffd59a' })
      const hull = new THREE.MeshStandardMaterial({ color: '#16191d', roughness: 0.5, metalness: 0.2 })
      const trim = new THREE.MeshStandardMaterial({ color: '#c8a05a', roughness: 0.4, metalness: 0.4 })
      for (const side of [-1, 1]) {
        this.strip(side * curbX, side * (edgeX + 1.0), 0.15, mat)
        this.strip(side * curbX, side * (edgeX + 1.0), 0.16, glint)
        for (let i = 0; i < 36; i += 1) {
          const pole = new THREE.Group()
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 2.6, 7), poleMat)
          body.position.y = 1.0
          const band = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 7), stripeMat)
          band.position.y = 1.6
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), lampMat)
          lamp.position.y = 2.4
          pole.add(body, band, lamp)
          pole.position.x = side * (curbX + 1.7)
          this.streetProp(pole, 60 - i * 16, 576)
        }
        for (let i = 0; i < 8; i += 1) {
          const boat = new THREE.Group()
          const shell = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 4.6), hull)
          shell.position.y = 0.2
          const prow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), trim)
          prow.position.set(0, 0.9, -2.2)
          prow.rotation.x = 0.35
          boat.add(shell, prow)
          boat.position.x = side * (curbX + 2.9 + ((i * 7) % 3) * 0.2)
          this.streetProp(boat, 40 - i * 70 - (side > 0 ? 0 : 33), 560)
        }
      }
      return
    }
    if (kind === 'snow') {
      const mat = new THREE.MeshStandardMaterial({ color: '#cdd9e8', emissive: '#1a2636', emissiveIntensity: 0.8, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
      const bank = new THREE.MeshStandardMaterial({ color: '#dbe5f0', emissive: '#223046', emissiveIntensity: 0.8, roughness: 0.95 })
      for (const side of [-1, 1]) {
        this.strip(side * curbX, side * (edgeX + 24), 0.17, mat)
        for (let i = 0; i < 48; i += 1) {
          const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), bank)
          mound.scale.set(0.9 + (i % 3) * 0.3, 0.5 + (i % 4) * 0.12, 3.2 + (i % 5) * 0.8)
          mound.position.set(side * (ROAD_HALF + 0.9 + (i % 2) * 0.35), 0.1, 0)
          this.streetProp(mound, 60 - i * 12, 576)
        }
      }
      // lama de neve derretida na borda da pista
      const slushTex = ripple.clone()
      slushTex.needsUpdate = true
      const slush = new THREE.MeshBasicMaterial({ color: '#aab6c4', transparent: true, opacity: 0.35, depthWrite: false })
      this.strip(-ROAD_HALF, -ROAD_HALF + 1.1, -0.04, slush)
      this.strip(ROAD_HALF - 1.1, ROAD_HALF, -0.04, slush)
      return
    }
    // beach: calçadão + areia + mar de um lado; do outro, a cidade de sempre
    const side = waterSide(this.cityId)
    this.hiddenSide = side
    for (const prop of this.props) if (prop.root.userData.building && prop.root.userData.building.side === side) prop.root.visible = false
    const sandMat = new THREE.MeshStandardMaterial({ color: '#8a7757', emissive: '#2a2113', emissiveIntensity: 0.8, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    const seaMat = new THREE.MeshStandardMaterial({ color: '#0f5272', emissive: '#08405e', emissiveIntensity: 1.5, roughness: 0.2, metalness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    const sandEnd = edgeX + 18
    this.strip(side * edgeX, side * sandEnd, 0.0, sandMat)
    this.strip(side * sandEnd, side * (sandEnd + 220), -0.12, seaMat)
    const rip = ripple.clone()
    rip.needsUpdate = true
    const waves = new THREE.MeshBasicMaterial({ map: rip, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    this.scrolling(rip, 220, 14, 0.7)
    this.strip(side * sandEnd, side * (sandEnd + 220), -0.1, waves)
    const foamTex = ripple.clone()
    foamTex.needsUpdate = true
    const foam = new THREE.MeshBasicMaterial({ map: foamTex, color: '#ffffff', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
    this.scrolling(foamTex, 3, 6, 1.2)
    this.strip(side * (sandEnd - 1), side * (sandEnd + 2), 0.02, foam)
    // palmeiras na beira do calçadão
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 0.9 })
    const frondMat = new THREE.MeshStandardMaterial({ color: '#1f5a30', emissive: '#08200f', emissiveIntensity: 0.9, roughness: 0.8, side: THREE.DoubleSide })
    for (let i = 0; i < 26; i += 1) {
      const palm = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 6.4, 6), trunkMat)
      trunk.position.y = 3.2
      trunk.rotation.z = (i % 2 ? 1 : -1) * 0.08
      palm.add(trunk)
      for (let f = 0; f < 7; f += 1) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.4, 4), frondMat)
        frond.scale.z = 0.25
        const ang = (f / 7) * Math.PI * 2
        frond.position.set(Math.cos(ang) * 1.4, 6.5, Math.sin(ang) * 1.4)
        frond.rotation.set(Math.sin(ang) * 1.15, 0, -Math.cos(ang) * 1.15)
        palm.add(frond)
      }
      palm.position.x = side * (edgeX - 0.8)
      palm.rotation.y = i * 1.7
      this.streetProp(palm, 60 - i * 24 - (i % 3) * 3, 624)
    }
  }

  get currentCity(): string {
    return this.cityId
  }

  /** Fixed-step scrolling: road, markers and props rush toward the camera. */
  update(deltaMeters: number, dt: number): void {
    this.clock += dt
    this.scroll += deltaMeters
    this.asphalt.map.offset.y = this.asphalt.roughness.offset.y = this.asphalt.normal.offset.y = this.scroll / ASPHALT_TILE
    this.pavement.offset.y = this.scroll / PAVEMENT_TILE
    for (const marker of this.markers) {
      marker.position.z += deltaMeters
      if (marker.position.z > 24) marker.position.z -= ROAD_LENGTH
    }
    for (const prop of this.props) {
      prop.root.position.z += deltaMeters
      if (prop.root.position.z > prop.wrapAt) prop.root.position.z -= prop.wrapBy
    }
    for (const apply of this.fields) apply(this.scroll)
    for (const apply of this.streetFields) apply(this.scroll)
    this.openViewCorridors()
  }

  /** Enquanto um monumento se aproxima, os prédios entre o carro e ele (do mesmo lado) somem para ele aparecer. */
  private openViewCorridors(): void {
    if (!this.landmarkProps.length && !this.hiddenSide) return
    for (const prop of this.props) {
      const info = prop.root.userData.building as { side: number } | undefined
      if (!info) continue
      let blocked = info.side === this.hiddenSide
      for (const lm of this.landmarkProps) {
        if (lm.root.userData.side !== info.side) continue
        const lz = lm.root.position.z
        if (lz > 40 || lz < -330) continue
        if (prop.root.position.z > lz - (lm.root.userData.half as number) - 20) blocked = true
      }
      prop.root.visible = !blocked
    }
  }

  /** Per-frame, time-based visuals (sky twinkle, rain, beacons) that run even on the title screen. */
  animate(frameSeconds: number, speed: number): void {
    this.visualTime += frameSeconds
    this.sky.update(this.visualTime, 0)
    this.rain.update(this.visualTime, speed, 0)
    for (const b of this.blinkers) {
      const on = Math.sin(this.visualTime * 2.4 + b.phase) > 0.2
      b.sprite.material.opacity = on ? 1 : 0.12
    }
  }
  private visualTime = 0

  reset(): void {
    this.scroll = 0
    this.markers.forEach((marker, index) => { marker.position.z = -14 - (index % 34) * 12 })
    for (const prop of this.props) prop.root.position.z = prop.homeZ
    for (const apply of this.fields) apply(0)
    for (const apply of this.streetFields) apply(0)
  }

  setRain(on: boolean): void {
    this.rain.enabled = on
    const f = this.current.fog
    this.scene.fog = new THREE.FogExp2(f.color, on ? f.rainDensity : f.density)
    if (this.fogTint) (this.scene.fog as THREE.FogExp2).color.lerp(this.fogTint.color, this.fogTint.weight)
  }

  private additive(color: string, opacity: number, map: THREE.Texture): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  }

  private addSkyline(): void {
    const random = seeded(441)
    const group = new THREE.Group()
    for (let i = 0; i < 40; i += 1) {
      const w = 10 + random() * 22
      const h = 40 + random() * 120
      const d = 14 + random() * 22
      const x = (i - 20) * 15 + (random() - 0.5) * 8
      const z = -250 - random() * 80
      const material = this.facadeMaterials[Math.floor(random() * this.facadeMaterials.length)]
      const tower = new THREE.Mesh(this.buildingGeometry(w, h, d), [material, material, this.roofMaterial, this.roofMaterial, material, material])
      tower.position.set(x, h * 0.5 - 2, z)
      group.add(tower)
      if (i % 4 === 0) this.addBeacon(group, x, h + 1.2, z, 6)
    }
    this.skylineGroup = group
    this.target.add(group)
  }

  private addBeacon(parent: THREE.Object3D, x: number, y: number, z: number, size: number): void {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: '#ff3b30', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    sprite.scale.setScalar(size)
    sprite.position.set(x, y, z)
    parent.add(sprite)
    this.blinkers.push({ sprite, phase: this.random() * 6 })
  }

  /** Box with UVs scaled so one facade tile (8 x 12 windows) repeats at a realistic size. */
  private buildingGeometry(w: number, h: number, d: number): THREE.BoxGeometry {
    const g = new THREE.BoxGeometry(w, h, d)
    const uv = g.attributes.uv as THREE.BufferAttribute
    const tileW = 20.8
    const tileH = 42
    // face order in BoxGeometry: +x, -x, +y, -y, +z, -z; four vertices each
    const spans: Array<[number, number]> = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
    spans.forEach(([sw, sh], face) => {
      for (let v = 0; v < 4; v += 1) {
        const i = face * 4 + v
        uv.setXY(i, uv.getX(i) * (sw / tileW), uv.getY(i) * (sh / tileH))
      }
    })
    return g
  }

  private addRoad(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(420, 1500),
      this.groundMat,
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.set(0, -0.2, -620)
    this.target.add(ground)

    const { map, roughness, normal } = this.asphalt
    for (const t of [map, roughness, normal]) t.repeat.set((ROAD_HALF * 2) / ASPHALT_TILE, 1500 / ASPHALT_TILE)
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_HALF * 2, 1500),
      new THREE.MeshStandardMaterial({
        map, roughnessMap: roughness, roughness: 1, metalness: 0.12, normalMap: normal, normalScale: new THREE.Vector2(0.55, 0.55), envMapIntensity: 1.6,
      }),
    )
    asphalt.rotation.x = -Math.PI / 2
    asphalt.position.set(0, -0.08, -620)
    asphalt.receiveShadow = true
    this.target.add(asphalt)

    // Reflective road studs add depth cues at speed without cluttering the driving lanes.
    const studMaterial = new THREE.MeshStandardMaterial({ color: '#ffd9a8', emissive: '#ffb066', emissiveIntensity: 1.6, roughness: 0.3 })
    for (const side of [-1, 1]) {
      for (let i = 0; i < 36; i += 1) {
        const stud = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.34), studMaterial)
        stud.position.set(side * (ROAD_HALF - 0.42), 0.015, -12 - i * 11.5)
        this.markers.push(stud)
        this.target.add(stud)
      }
    }

    const edgeL = new THREE.MeshStandardMaterial({ color: '#d7e2e4', emissive: '#9fb4b8', emissiveIntensity: 0.35, roughness: 0.55 })
    const edgeR = new THREE.MeshStandardMaterial({ color: '#f3c487', emissive: '#d49650', emissiveIntensity: 0.45, roughness: 0.55 })
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.012, 1500), side === -1 ? edgeL : edgeR)
      edge.position.set(side * (ROAD_HALF - 0.14), -0.004, -620)
      this.target.add(edge)
    }

    const lineMat = new THREE.MeshStandardMaterial({ color: '#d6dad6', emissive: '#9aa29c', emissiveIntensity: 0.3, roughness: 0.5 })
    const orangeMat = new THREE.MeshStandardMaterial({ color: '#f6a566', emissive: '#e07a33', emissiveIntensity: 0.55, roughness: 0.5 })
    for (const laneX of [-RACE_CONFIG.laneWidth / 2, RACE_CONFIG.laneWidth / 2]) {
      for (let i = 0; i < 34; i += 1) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 4.2), i % 5 === 0 ? orangeMat : lineMat)
        dash.position.set(laneX, 0, -14 - i * 12)
        this.markers.push(dash)
        this.target.add(dash)
      }
    }
  }

  private addSidewalks(): void {
    this.pavement.repeat.set(SIDEWALK_W / PAVEMENT_TILE, 1500 / PAVEMENT_TILE)
    const mat = new THREE.MeshStandardMaterial({ map: this.pavement, roughness: 0.78, metalness: 0.05, envMapIntensity: 0.7 })
    const curbMat = new THREE.MeshStandardMaterial({ color: '#5b6166', roughness: 0.8 })
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.BoxGeometry(SIDEWALK_W, 0.22, 1500), mat)
      walk.position.set(side * (ROAD_HALF + 0.3 + SIDEWALK_W / 2), 0.02, -620)
      walk.receiveShadow = true
      this.target.add(walk)
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 1500), curbMat)
      curb.position.set(side * (ROAD_HALF + 0.15), 0.03, -620)
      this.target.add(curb)
    }
  }

  private addBuildings(): void {
    const random = this.random
    const neonColors = ['#ff4f8b', '#4fd1ff', '#ffb347', '#8f7bff', '#62ffb2']
    const count = 17
    const spacing = 30
    for (const side of [-1, 1]) {
      for (let i = 0; i < count; i += 1) {
        const root = new THREE.Group()
        const width = 9 + random() * 11
        const depth = 26 + random() * 3
        const height = 18 + random() * 62
        const inset = random() * 2.4
        const x = side * (ROAD_HALF + 0.3 + SIDEWALK_W + 0.6 + inset + width * 0.5)
        const z = -24 - i * spacing + (random() - 0.5) * 1.2
        const material = this.facadeMaterials[Math.floor(random() * this.facadeMaterials.length)]
        const body = new THREE.Mesh(this.buildingGeometry(width, height, depth), [material, material, this.roofMaterial, this.roofMaterial, material, material])
        body.position.set(x, height * 0.5 - 0.06, 0)
        root.add(body)
        let topY = height
        // stepped crown on taller blocks
        if (height > 40 && random() > 0.35) {
          const w2 = width * (0.55 + random() * 0.2)
          const h2 = 6 + random() * 10
          const crown = new THREE.Mesh(this.buildingGeometry(w2, h2, depth * 0.62), [material, material, this.roofMaterial, this.roofMaterial, material, material])
          crown.position.set(x + (random() - 0.5) * 1.2, height + h2 * 0.5 - 0.06, 0)
          root.add(crown)
          topY += h2
        }
        // rooftop plant + antenna
        const unit = new THREE.Mesh(new THREE.BoxGeometry(2 + random() * 3, 1.6, 2 + random() * 3), this.roofMaterial)
        unit.position.set(x + (random() - 0.5) * (width * 0.5), topY + 0.8, (random() - 0.5) * 10)
        root.add(unit)
        if (random() > 0.55) {
          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 8, 6), this.roofMaterial)
          mast.position.set(x, topY + 4, (random() - 0.5) * 6)
          root.add(mast)
          this.addBeacon(root, x, topY + 8.2, mast.position.z, 3.2)
        }
        // lit shopfront + warm light spilling over the pavement
        const faceX = x - side * (width * 0.5 + 0.03)
        const shopColors = ['#ffcf8a', '#ffe8c0', '#9fe3ff', '#ffb36b']
        const shop = new THREE.Mesh(
          new THREE.PlaneGeometry(depth * 0.9, 3.9),
          new THREE.MeshBasicMaterial({ map: this.shopfronts[Math.floor(random() * this.shopfronts.length)], toneMapped: false, color: new THREE.Color(shopColors[Math.floor(random() * shopColors.length)]).lerp(new THREE.Color('#ffffff'), 0.4).multiplyScalar(0.6) }),
        )
        shop.position.set(faceX - side * 0.02, 2.1, 0)
        shop.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2
        root.add(shop)
        const spill = new THREE.Mesh(new THREE.PlaneGeometry(10, depth * 0.9), this.additive('#ffb878', 0.09, this.glow))
        spill.rotation.x = -Math.PI / 2
        spill.position.set(faceX - side * 3.4, 0.16, 0)
        root.add(spill)
        const awning = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, depth * 0.72), new THREE.MeshStandardMaterial({ color: neonColors[i % neonColors.length], roughness: 0.6, emissive: neonColors[i % neonColors.length], emissiveIntensity: 0.18 }))
        awning.position.set(faceX - side * 0.55, 3.4, 0)
        root.add(awning)
        // vertical neon blade sign
        if (i % 3 === 1) {
          const color = neonColors[(i + (side === 1 ? 2 : 0)) % neonColors.length]
          const signMat = new THREE.MeshBasicMaterial({ map: neonTexture(color, i * 7 + (side === 1 ? 3 : 0)), toneMapped: false, color: new THREE.Color('#ffffff').multiplyScalar(1.1) })
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 5.6), signMat)
          sign.position.set(faceX - side * 1.0, Math.min(height - 4, 9 + random() * 5), (random() - 0.5) * 8)
          sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2
          root.add(sign)
          const halo = new THREE.Mesh(new THREE.PlaneGeometry(6, 9), this.additive(color, 0.13, this.glow))
          halo.position.copy(sign.position)
          halo.position.x -= side * 0.1
          halo.rotation.y = sign.rotation.y
          root.add(halo)
          const reflect = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 18), this.additive(color, 0.12, this.streak))
          reflect.rotation.x = -Math.PI / 2
          reflect.position.set(side * (ROAD_HALF - 1.6), 0.012, sign.position.z + 8)
          root.add(reflect)
        }
        root.position.z = z
        root.userData.building = { side, homeZ: z, period: count * spacing }
        this.target.add(root)
        this.props.push({ root, homeZ: z, wrapAt: 40, wrapBy: count * spacing })
      }
    }
  }

  private addStreetLights(): void {
    const poleMat = new THREE.MeshStandardMaterial({ color: '#2b343b', roughness: 0.5, metalness: 0.55 })
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe4b5').multiplyScalar(1.5), toneMapped: false })
    const count = 10
    const spacing = 46
    for (let i = 0; i < count; i += 1) {
      for (const side of [-1, 1]) {
        const root = new THREE.Group()
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 7.4, 10), poleMat)
        pole.position.y = 3.7
        pole.castShadow = true
        root.add(pole)
        const arm = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.12), poleMat)
        arm.position.set(-side * 1.35, 7.2, 0)
        root.add(arm)
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.34), lampMat)
        head.position.set(-side * 2.55, 7.08, 0)
        root.add(head)
        const lampX = -side * 2.55
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: '#ffc27a', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
        halo.scale.setScalar(4.2)
        halo.position.set(lampX, 7.0, 0)
        root.add(halo)
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), this.additive('#ffb06a', 0.34, this.glow))
        pool.rotation.x = -Math.PI / 2
        pool.position.set(lampX, 0.02, 0)
        root.add(pool)
        const reflect = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 26), this.additive('#ffc788', 0.26, this.streak))
        reflect.rotation.x = -Math.PI / 2
        reflect.position.set(lampX * 0.55, 0.018, 12.5)
        root.add(reflect)
        const z = -18 - i * spacing
        root.position.set(side * (ROAD_HALF + 1.6), 0, z)
        this.target.add(root)
        this.props.push({ root, homeZ: z, wrapAt: 40, wrapBy: count * spacing })
      }
    }
  }

  /** Overhead gantries (sign + lane signals) give rhythm and a strong speed cue. */
  private addGantries(): void {
    const steel = new THREE.MeshStandardMaterial({ color: '#3a444c', roughness: 0.45, metalness: 0.7 })
    const signMat = new THREE.MeshStandardMaterial({ map: gantrySignTexture(), emissiveMap: gantrySignTexture(), emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.2 })
    const half = ROAD_HALF + 1.3
    const count = 4
    const spacing = 112
    for (let i = 0; i < count; i += 1) {
      const root = new THREE.Group()
      const beam = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 0.4, 0.55, 0.6), steel)
      beam.position.y = 7.4
      root.add(beam)
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 7.6, 12), steel)
        post.position.set(side * half, 3.8, 0)
        root.add(post)
      }
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.8), signMat)
      sign.position.set(0, 8.6, 0.37)
      root.add(sign)
      const back = new THREE.Mesh(new THREE.BoxGeometry(5.9, 1.9, 0.08), steel)
      back.position.set(0, 8.6, 0.3)
      root.add(back)
      for (const lane of [-1, 0, 1]) {
        const x = lane * RACE_CONFIG.laneWidth
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#4dff9a').multiplyScalar(1.6), toneMapped: false }))
        lamp.position.set(x, 6.9, -0.34)
        root.add(lamp)
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: '#3dff90', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
        halo.scale.setScalar(2.3)
        halo.position.set(x, 6.9, -0.5)
        root.add(halo)
        const wet = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 22), this.additive('#3dff90', 0.09, this.streak))
        wet.rotation.x = -Math.PI / 2
        wet.position.set(x, 0.014, 10.5)
        root.add(wet)
      }
      const z = -60 - i * spacing
      root.position.z = z
      this.target.add(root)
      this.props.push({ root, homeZ: z, wrapAt: 40, wrapBy: count * spacing })
    }
  }

  /** Low concrete posts with reflectors along the curb — dense, cheap rhythm at speed. */
  private addGuardPosts(): void {
    const count = 44
    const spacing = 9
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.22, 0.9, 0.22),
      new THREE.MeshStandardMaterial({ color: '#4a5258', roughness: 0.7 }),
      count * 2,
    )
    const reflector = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.24, 0.12, 0.05),
      new THREE.MeshStandardMaterial({ color: '#ff5a3c', emissive: '#ff3a1c', emissiveIntensity: 1.8 }),
      count * 2,
    )
    const m = new THREE.Matrix4()
    const group = new THREE.Group()
    const homes: number[] = []
    for (let i = 0; i < count * 2; i += 1) homes.push(-6 - (i >> 1) * spacing)
    const span = count * spacing
    const near = 40
    this.fields.push((offset: number) => {
      for (let i = 0; i < count * 2; i += 1) {
        const side = i & 1 ? 1 : -1
        // wrap into [-(span - near), near) so posts reappear far ahead, hidden by fog
        const z = ((((homes[i] + offset + (span - near)) % span) + span) % span) - (span - near)
        const x = side * (ROAD_HALF + 0.55)
        m.makeTranslation(x, 0.5, z)
        mesh.setMatrixAt(i, m)
        m.makeTranslation(x, 0.78, z + 0.12)
        reflector.setMatrixAt(i, m)
      }
      mesh.instanceMatrix.needsUpdate = true
      reflector.instanceMatrix.needsUpdate = true
    })
    this.fields[this.fields.length - 1](0)
    group.add(mesh, reflector)
    this.target.add(group)
  }

  /**
   * Scrolling scenery made of instanced parts (trees, rocks...). Each item carries x, z, scale and yaw;
   * parts are stacked on that transform. Everything wraps behind the camera like the other props.
   */
  private addField(parts: Array<{ geo: THREE.BufferGeometry; mat: THREE.Material; y: number; shadow?: boolean }>, items: Array<{ x: number; z: number; s: number; r: number }>, span: number): void {
    const near = 40
    const meshes = parts.map(part => {
      const mesh = new THREE.InstancedMesh(part.geo, part.mat, items.length)
      mesh.castShadow = part.shadow ?? false
      mesh.frustumCulled = false
      this.target.add(mesh)
      return mesh
    })
    const dummy = new THREE.Object3D()
    this.fields.push((offset: number) => {
      items.forEach((item, i) => {
        const z = ((((item.z + offset + (span - near)) % span) + span) % span) - (span - near)
        parts.forEach((part, k) => {
          dummy.position.set(item.x, part.y * item.s, z)
          dummy.rotation.set(0, item.r, 0)
          dummy.scale.setScalar(item.s)
          dummy.updateMatrix()
          meshes[k].setMatrixAt(i, dummy.matrix)
        })
      })
      for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true
    })
    this.fields[this.fields.length - 1](0)
  }

  private scatter(random: () => number, count: number, spanZ: number, minX: number, maxX: number, minS: number, maxS: number): Array<{ x: number; z: number; s: number; r: number }> {
    const items = []
    for (let i = 0; i < count; i += 1) {
      const side = random() < 0.5 ? -1 : 1
      items.push({ x: side * (minX + random() * (maxX - minX)), z: -random() * spanZ, s: minS + random() * (maxS - minS), r: random() * Math.PI * 2 })
    }
    return items
  }

  /** Mountain road at night: pine forest, ridges, guard rails. */
  private addSerra(): void {
    const random = seeded(9001)
    const needles = new THREE.MeshStandardMaterial({ color: '#0f2a1d', roughness: 0.95, flatShading: true })
    const needles2 = new THREE.MeshStandardMaterial({ color: '#143524', roughness: 0.95, flatShading: true })
    const bark = new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 1 })
    const span = 440
    const near = this.scatter(random, 150, span, ROAD_HALF + 3, ROAD_HALF + 14, 0.8, 1.6)
    const far = this.scatter(random, 150, span, ROAD_HALF + 14, ROAD_HALF + 60, 1.1, 2.6)
    for (const [items, mat] of [[near, needles], [far, needles2]] as const) {
      this.addField([
        { geo: new THREE.CylinderGeometry(0.16, 0.24, 2, 6), mat: bark, y: 1 },
        { geo: new THREE.ConeGeometry(1.9, 4.6, 7), mat, y: 3.6, shadow: true },
        { geo: new THREE.ConeGeometry(1.45, 3.8, 7), mat, y: 5.9 },
        { geo: new THREE.ConeGeometry(0.95, 3.0, 7), mat, y: 7.9 },
      ], items, span)
    }
    // layered ridges fade into the fog
    const ridge = new THREE.MeshStandardMaterial({ color: '#0b1620', roughness: 1, flatShading: true })
    for (let i = 0; i < 18; i += 1) {
      const h = 50 + random() * 90
      const r = 60 + random() * 90
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6 + Math.floor(random() * 3)), ridge)
      cone.position.set((i - 9) * 40 + (random() - 0.5) * 30, h / 2 - 4, -250 - random() * 110)
      cone.rotation.y = random() * 3
      this.target.add(cone)
    }
    const rail = new THREE.MeshStandardMaterial({ color: '#8d979d', roughness: 0.4, metalness: 0.8 })
    for (const side of [-1, 1]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 1500), rail)
      beam.position.set(side * (ROAD_HALF + 1.15), 0.62, -620)
      this.target.add(beam)
    }
  }

  /** Empty desert highway at sunset: sand, buttes, rocks, cacti and power poles. */
  private addDeserto(): void {
    const random = seeded(777)
    const rock = new THREE.MeshStandardMaterial({ color: '#7a4a2c', roughness: 1, flatShading: true })
    const rockDark = new THREE.MeshStandardMaterial({ color: '#5a3622', roughness: 1, flatShading: true })
    const cactus = new THREE.MeshStandardMaterial({ color: '#3d5a2e', roughness: 0.9 })
    const wood = new THREE.MeshStandardMaterial({ color: '#4a3524', roughness: 0.95 })
    const span = 440
    this.addField([{ geo: new THREE.DodecahedronGeometry(1, 0), mat: rock, y: 0.45, shadow: true }], this.scatter(random, 90, span, ROAD_HALF + 3, ROAD_HALF + 38, 0.6, 2.4), span)
    this.addField([{ geo: new THREE.DodecahedronGeometry(1, 0), mat: rockDark, y: 1.2, shadow: true }], this.scatter(random, 28, span, ROAD_HALF + 20, ROAD_HALF + 90, 3, 8), span)
    // saguaro: trunk plus two upturned arms
    this.addField([
      { geo: new THREE.CapsuleGeometry(0.28, 3.2, 4, 8), mat: cactus, y: 1.9, shadow: true },
      { geo: new THREE.CapsuleGeometry(0.17, 1.1, 4, 6), mat: cactus, y: 2.7 },
    ], this.scatter(random, 80, span, ROAD_HALF + 3.5, ROAD_HALF + 26, 0.8, 1.5), span)
    // telegraph poles on one side, evenly spaced
    const poles = []
    for (let i = 0; i < 11; i += 1) poles.push({ x: -(ROAD_HALF + 3.2), z: -10 - i * 40, s: 1, r: 0 })
    this.addField([
      { geo: new THREE.CylinderGeometry(0.1, 0.14, 8, 6), mat: wood, y: 4 },
      { geo: new THREE.BoxGeometry(2.4, 0.14, 0.14), mat: wood, y: 7.4 },
    ], poles, 440)
    // far mesas
    const mesa = new THREE.MeshStandardMaterial({ color: '#8a4b2a', roughness: 1, flatShading: true })
    for (let i = 0; i < 14; i += 1) {
      const w = 40 + random() * 70
      const h = 24 + random() * 40
      const top = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.55, w * 0.8, h, 7), mesa)
      top.position.set((i - 7) * 52 + (random() - 0.5) * 30, h / 2 - 3, -240 - random() * 120)
      this.target.add(top)
    }
  }
}
