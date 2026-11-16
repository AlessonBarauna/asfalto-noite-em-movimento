import * as THREE from 'three'
import { RACE_CONFIG } from './race-config'
import { Sky } from './visuals/sky'
import { Rain } from './visuals/rain'
import { buildNightEnvironment } from './visuals/environment'
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
  private clock = 0
  private scroll = 0
  private postsApply?: (offset: number) => void

  constructor(gl: THREE.WebGLRenderer, shadowMapSize = 1024) {
    this.scene.fog = new THREE.FogExp2('#1a1b26', 0.0062)
    this.scene.environment = buildNightEnvironment(gl)
    this.scene.environmentIntensity = 0.95
    this.scene.add(this.sky.mesh)
    this.facadeMaterials = this.facades.map(f => new THREE.MeshStandardMaterial({
      color: '#ffffff', map: f.map, emissiveMap: f.emissive, emissive: '#ffffff', emissiveIntensity: 1.05, roughness: 0.62, metalness: 0.18,
    }))

    this.scene.add(new THREE.HemisphereLight('#7f9bc4', '#1c1410', 0.62))
    this.moon = new THREE.DirectionalLight('#9fb8e8', 1.15)
    this.moon.position.set(-16, 30, -8)
    this.moon.target.position.set(0, 0, -6)
    this.moon.castShadow = true
    this.moon.shadow.mapSize.set(shadowMapSize, shadowMapSize)
    Object.assign(this.moon.shadow.camera, { left: -14, right: 14, top: 22, bottom: -22, near: 1, far: 90 })
    this.moon.shadow.bias = -0.0004
    this.moon.shadow.normalBias = 0.03
    this.scene.add(this.moon, this.moon.target)

    this.addSkyline()
    this.addRoad()
    this.addSidewalks()
    this.addBuildings()
    this.addStreetLights()
    this.addGantries()
    this.addGuardPosts()
    this.scene.add(this.rain.mesh)
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
    this.postsApply?.(this.scroll)
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
    this.postsApply?.(0)
  }

  setRain(on: boolean): void {
    this.rain.enabled = on
    this.scene.fog = new THREE.FogExp2(on ? '#171a26' : '#1a1b26', on ? 0.0078 : 0.0062)
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
    this.scene.add(group)
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
      new THREE.MeshStandardMaterial({ color: '#0c1015', roughness: 1, metalness: 0 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.set(0, -0.2, -620)
    this.scene.add(ground)

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
    this.scene.add(asphalt)

    // Reflective road studs add depth cues at speed without cluttering the driving lanes.
    const studMaterial = new THREE.MeshStandardMaterial({ color: '#ffd9a8', emissive: '#ffb066', emissiveIntensity: 1.6, roughness: 0.3 })
    for (const side of [-1, 1]) {
      for (let i = 0; i < 36; i += 1) {
        const stud = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.34), studMaterial)
        stud.position.set(side * (ROAD_HALF - 0.42), 0.015, -12 - i * 11.5)
        this.markers.push(stud)
        this.scene.add(stud)
      }
    }

    const edgeL = new THREE.MeshStandardMaterial({ color: '#d7e2e4', emissive: '#9fb4b8', emissiveIntensity: 0.35, roughness: 0.55 })
    const edgeR = new THREE.MeshStandardMaterial({ color: '#f3c487', emissive: '#d49650', emissiveIntensity: 0.45, roughness: 0.55 })
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.012, 1500), side === -1 ? edgeL : edgeR)
      edge.position.set(side * (ROAD_HALF - 0.14), -0.004, -620)
      this.scene.add(edge)
    }

    const lineMat = new THREE.MeshStandardMaterial({ color: '#d6dad6', emissive: '#9aa29c', emissiveIntensity: 0.3, roughness: 0.5 })
    const orangeMat = new THREE.MeshStandardMaterial({ color: '#f6a566', emissive: '#e07a33', emissiveIntensity: 0.55, roughness: 0.5 })
    for (const laneX of [-RACE_CONFIG.laneWidth / 2, RACE_CONFIG.laneWidth / 2]) {
      for (let i = 0; i < 34; i += 1) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 4.2), i % 5 === 0 ? orangeMat : lineMat)
        dash.position.set(laneX, 0, -14 - i * 12)
        this.markers.push(dash)
        this.scene.add(dash)
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
      this.scene.add(walk)
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 1500), curbMat)
      curb.position.set(side * (ROAD_HALF + 0.15), 0.03, -620)
      this.scene.add(curb)
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
          new THREE.MeshBasicMaterial({ map: this.shopfronts[Math.floor(random() * this.shopfronts.length)], toneMapped: false, color: new THREE.Color(shopColors[Math.floor(random() * shopColors.length)]).lerp(new THREE.Color('#ffffff'), 0.4).multiplyScalar(0.95) }),
        )
        shop.position.set(faceX - side * 0.02, 2.1, 0)
        shop.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2
        root.add(shop)
        const spill = new THREE.Mesh(new THREE.PlaneGeometry(10, depth * 0.9), this.additive('#ffb878', 0.2, this.glow))
        spill.rotation.x = -Math.PI / 2
        spill.position.set(faceX - side * 3.4, 0.16, 0)
        root.add(spill)
        const awning = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, depth * 0.72), new THREE.MeshStandardMaterial({ color: neonColors[i % neonColors.length], roughness: 0.6, emissive: neonColors[i % neonColors.length], emissiveIntensity: 0.18 }))
        awning.position.set(faceX - side * 0.55, 3.4, 0)
        root.add(awning)
        // vertical neon blade sign
        if (i % 3 === 1) {
          const color = neonColors[(i + (side === 1 ? 2 : 0)) % neonColors.length]
          const signMat = new THREE.MeshBasicMaterial({ map: neonTexture(color, i * 7 + (side === 1 ? 3 : 0)), toneMapped: false, color: new THREE.Color('#ffffff').multiplyScalar(1.5) })
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 5.6), signMat)
          sign.position.set(faceX - side * 1.0, Math.min(height - 4, 9 + random() * 5), (random() - 0.5) * 8)
          sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2
          root.add(sign)
          const halo = new THREE.Mesh(new THREE.PlaneGeometry(6, 9), this.additive(color, 0.28, this.glow))
          halo.position.copy(sign.position)
          halo.position.x -= side * 0.1
          halo.rotation.y = sign.rotation.y
          root.add(halo)
          const reflect = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 18), this.additive(color, 0.2, this.streak))
          reflect.rotation.x = -Math.PI / 2
          reflect.position.set(side * (ROAD_HALF - 1.6), 0.012, sign.position.z + 8)
          root.add(reflect)
        }
        root.position.z = z
        this.scene.add(root)
        this.props.push({ root, homeZ: z, wrapAt: 40, wrapBy: count * spacing })
      }
    }
  }

  private addStreetLights(): void {
    const poleMat = new THREE.MeshStandardMaterial({ color: '#2b343b', roughness: 0.5, metalness: 0.55 })
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe4b5').multiplyScalar(2.2), toneMapped: false })
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
        halo.scale.setScalar(6.5)
        halo.position.set(lampX, 7.0, 0)
        root.add(halo)
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), this.additive('#ffb06a', 0.55, this.glow))
        pool.rotation.x = -Math.PI / 2
        pool.position.set(lampX, 0.02, 0)
        root.add(pool)
        const reflect = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 26), this.additive('#ffc788', 0.42, this.streak))
        reflect.rotation.x = -Math.PI / 2
        reflect.position.set(lampX * 0.55, 0.018, 12.5)
        root.add(reflect)
        const z = -18 - i * spacing
        root.position.set(side * (ROAD_HALF + 1.6), 0, z)
        this.scene.add(root)
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
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: '#3dff90', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
        halo.scale.setScalar(3.4)
        halo.position.set(x, 6.9, -0.5)
        root.add(halo)
        const wet = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 22), this.additive('#3dff90', 0.09, this.streak))
        wet.rotation.x = -Math.PI / 2
        wet.position.set(x, 0.014, 10.5)
        root.add(wet)
      }
      const z = -60 - i * spacing
      root.position.z = z
      this.scene.add(root)
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
    this.postsApply = (offset: number) => {
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
    }
    this.postsApply(0)
    group.add(mesh, reflector)
    this.scene.add(group)
  }
}
