import * as THREE from 'three'
import { RACE_CONFIG } from './race-config'

const ROAD_LENGTH = 408
const ROAD_HALF = RACE_CONFIG.roadHalfWidth

type MovingProp = { root: THREE.Group; homeZ: number; wrapAt: number; wrapBy: number }

/** Ambient city and road dressing. The world scrolls under the car to simulate forward motion. */
export class RaceWorld {
  readonly scene = new THREE.Scene()
  private readonly markers: THREE.Mesh[] = []
  private readonly props: MovingProp[] = []
  private clock = 0
  constructor() {
    this.scene.background = new THREE.Color('#101a24')
    this.scene.fog = new THREE.FogExp2('#101a24', 0.0065)
    this.scene.add(new THREE.HemisphereLight('#9ab6ca', '#10151b', 1.12))
    const moon = new THREE.DirectionalLight('#b3cbe0', 1.75)
    moon.position.set(-18, 32, -45)
    this.scene.add(moon)
    const warm = new THREE.PointLight('#f28b54', 2.2, 68, 1.8)
    warm.position.set(-7, 7, 8)
    this.scene.add(warm)
    const cool = new THREE.PointLight('#5886b4', 1.6, 58, 1.7)
    cool.position.set(8, 6, -18)
    this.scene.add(cool)
    this.addSkyline()
    this.addRoad()
    this.addBuildings()
    this.addStreetLights()
  }

  update(deltaMeters: number, dt: number): void {
    this.clock += dt
    for (const marker of this.markers) {
      marker.position.z += deltaMeters
      if (marker.position.z > 24) marker.position.z -= ROAD_LENGTH
    }
    for (const prop of this.props) {
      prop.root.position.z += deltaMeters
      if (prop.root.position.z > prop.wrapAt) prop.root.position.z -= prop.wrapBy
    }
  }

  reset(): void {
    this.markers.forEach((marker, index) => { marker.position.z = -14 - (index % 34) * 12 })
    for (const prop of this.props) prop.root.position.z = prop.homeZ
  }

  private addSkyline(): void {
    const group = new THREE.Group()
    const farMat = new THREE.MeshStandardMaterial({ color: '#1a2835', roughness: 1, metalness: 0 })
    const litMat = new THREE.MeshBasicMaterial({ color: '#cf8459' })
    const random = seeded(441)
    for (let i = 0; i < 34; i += 1) {
      const w = 8 + random() * 18
      const h = 28 + random() * 78
      const d = 12 + random() * 20
      const x = (i - 17) * 16 + (random() - 0.5) * 8
      const z = -245 - random() * 55
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), farMat)
      tower.position.set(x, h * 0.5 - 2, z)
      group.add(tower)
      if (i % 3 === 0) {
        const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, 0.35), litMat)
        beacon.position.set(x, h + 0.2, z)
        group.add(beacon)
      }
    }
    this.scene.add(group)
  }

  private addRoad(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 1500),
      new THREE.MeshStandardMaterial({ color: '#101820', roughness: 0.96, metalness: 0.02 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.set(0, -0.16, -620)
    ground.receiveShadow = true
    this.scene.add(ground)

    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_HALF * 2, 1500),
      new THREE.MeshStandardMaterial({ color: '#20272d', roughness: 0.34, metalness: 0.24 }),
    )
    asphalt.rotation.x = -Math.PI / 2
    asphalt.position.set(0, -0.08, -620)
    asphalt.receiveShadow = true
    this.scene.add(asphalt)

    // Subtle wet-asphalt sheen: broad, low-opacity reflections catch the city lights.
    const sheenMaterial = new THREE.MeshBasicMaterial({ color: '#8da3ad', transparent: true, opacity: 0.055, depthWrite: false })
    for (const x of [-3.65, 3.65]) {
      const sheen = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1500), sheenMaterial)
      sheen.rotation.x = -Math.PI / 2
      sheen.position.set(x, -0.067, -620)
      this.scene.add(sheen)
    }

    // Reflective road studs add depth cues at speed without cluttering the driving lanes.
    const studMaterial = new THREE.MeshBasicMaterial({ color: '#e8b98a' })
    for (const side of [-1, 1]) {
      for (let i = 0; i < 36; i += 1) {
        const stud = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.32), studMaterial)
        stud.position.set(side * (ROAD_HALF - 0.42), 0.015, -12 - i * 11.5)
        this.markers.push(stud)
        this.scene.add(stud)
      }
    }

    const shoulderMat = new THREE.MeshStandardMaterial({ color: '#3a3e40', roughness: 0.8, metalness: 0.06 })
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 1500), shoulderMat)
      shoulder.position.set(side * (ROAD_HALF + 0.2), -0.07, -620)
      this.scene.add(shoulder)
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.012, 1500),
        new THREE.MeshBasicMaterial({ color: side === -1 ? '#c2d1d3' : '#edb67b' }),
      )
      edge.position.set(side * (ROAD_HALF - 0.12), -0.005, -620)
      this.scene.add(edge)
    }

    const lineMat = new THREE.MeshBasicMaterial({ color: '#c3c7c3' })
    const orangeMat = new THREE.MeshBasicMaterial({ color: '#f29a5c' })
    for (const laneX of [-RACE_CONFIG.laneWidth / 2, RACE_CONFIG.laneWidth / 2]) {
      for (let i = 0; i < 34; i += 1) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 4.2), i % 5 === 0 ? orangeMat : lineMat)
        dash.position.set(laneX, 0, -14 - i * 12)
        this.markers.push(dash)
        this.scene.add(dash)
      }
    }
  }

  private addBuildings(): void {
    const random = seeded(186)
    const facadePalette = ['#1b2834', '#202b35', '#28313a', '#17242e', '#30373b']
    const windowPalette = ['#f2c28a', '#c6d8df', '#cf8158', '#72b9c6']
    for (const side of [-1, 1]) {
      for (let i = 0; i < 16; i += 1) {
        const root = new THREE.Group()
        const width = 8 + random() * 10
        const depth = 11 + random() * 9
        const height = 15 + random() * 57
        const x = side * (ROAD_HALF + width * 0.5 + 6 + random() * 6)
        const z = -24 - i * 30 - random() * 4
        const color = facadePalette[Math.floor(random() * facadePalette.length)]
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, depth),
          new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.08 }),
        )
        body.position.set(x, height * 0.5 - 0.06, 0)
        body.castShadow = true
        body.receiveShadow = true
        root.add(body)
        const windowCount = 4 + Math.floor(random() * 4)
        const faceX = x - side * (width * 0.5 + 0.018)
        for (let n = 0; n < windowCount; n += 1) {
          const row = n % Math.max(2, Math.floor(height / 5))
          const column = Math.floor(n / Math.max(2, Math.floor(height / 5)))
          const pane = new THREE.Mesh(
            new THREE.PlaneGeometry(0.82, 1.15),
            new THREE.MeshStandardMaterial({
              color: '#14232d',
              emissive: windowPalette[Math.floor(random() * windowPalette.length)],
              emissiveIntensity: 0.45 + random() * 0.9,
              roughness: 0.48,
              metalness: 0.15,
            }),
          )
          pane.position.set(faceX, 2.4 + row * 3.6, (column - 1) * 2.4)
          pane.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2
          root.add(pane)
        }
        if (i % 4 === 1) {
          const sign = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 2.4, 5.4),
            new THREE.MeshBasicMaterial({ color: i % 2 ? '#df7955' : '#5799aa' }),
          )
          sign.position.set(faceX + side * 0.1, Math.min(height - 4, 11), 0)
          root.add(sign)
        }
        root.position.z = z
        this.scene.add(root)
        this.props.push({ root, homeZ: z, wrapAt: 28, wrapBy: 490 })
      }
    }
  }

  private addStreetLights(): void {
    const poleMat = new THREE.MeshStandardMaterial({ color: '#313b42', roughness: 0.55, metalness: 0.42 })
    const lampMat = new THREE.MeshBasicMaterial({ color: '#ffe0ad' })
    for (let i = 0; i < 10; i += 1) {
      for (const side of [-1, 1]) {
        const root = new THREE.Group()
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.09, 6.5, 8), poleMat)
        pole.position.y = 3.25
        root.add(pole)
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.09, 0.1), poleMat)
        arm.position.set(-side * 0.55, 6.2, 0)
        root.add(arm)
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.26), lampMat)
        lamp.position.set(-side * 1.13, 6.12, 0)
        root.add(lamp)
        root.position.set(side * (ROAD_HALF + 1.9), 0, -18 - i * 46)
        this.scene.add(root)
        this.props.push({ root, homeZ: -18 - i * 46, wrapAt: 35, wrapBy: 460 })
      }
    }
  }
}

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}
