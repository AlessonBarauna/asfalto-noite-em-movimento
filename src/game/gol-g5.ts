import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/** Approximate, detailed Three.js model of a Brazilian Volkswagen Gol G5 hatchback. */
export const GOL_G5_DIMENSIONS = {
  length: 3.95,
  width: 1.72,
  height: 1.58,
} as const

type Point3 = readonly [number, number, number]

function addQuad(
  parent: THREE.Group,
  name: string,
  points: readonly [Point3, Point3, Point3, Point3],
  material: THREE.Material,
): THREE.Mesh {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(point => [...point]), 3))
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function addBox(
  parent: THREE.Group,
  name: string,
  size: Point3,
  position: Point3,
  material: THREE.Material,
  bevel = false,
): THREE.Mesh {
  const radius = bevel ? Math.min(0.1, Math.min(...size) * 0.42) : 0
  const geometry = radius > 0.012 ? new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius) : new THREE.BoxGeometry(...size)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}


type Station = readonly [z: number, top: number]
/** Perfil lateral (z, altura do teto/capô) igual ao do Gol G5 original. */
const BODY_PROFILE: readonly Station[] = [
  [-1.96, 0.78], [-1.92, 0.91], [-1.76, 0.95], [-1.48, 0.99], [-1.12, 1.4], [-0.9, 1.55], [-0.7, 1.585],
  [0.3, 1.585], [0.5, 1.5], [0.98, 1.04], [1.3, 0.985], [1.62, 0.98], [1.86, 0.95], [1.94, 0.78],
]

function topAt(z: number): number {
  for (let i = 0; i < BODY_PROFILE.length - 1; i += 1) {
    const [z0, y0] = BODY_PROFILE[i]
    const [z1, y1] = BODY_PROFILE[i + 1]
    if (z >= z0 && z <= z1) {
      const t = (z - z0) / (z1 - z0)
      const k = t * t * (3 - 2 * t)
      return y0 + (y1 - y0) * (0.55 * t + 0.45 * k)
    }
  }
  return 0.8
}

/** Casco suave: cada seção é um anel (base, ombro, teto) e as seções são ligadas em malha única. */
function createLoftedBodyGeometry(): THREE.BufferGeometry {
  const bottom = 0.38
  const stations = 46
  const z0 = BODY_PROFILE[0][0]
  const z1 = BODY_PROFILE[BODY_PROFILE.length - 1][0]
  const half: [number, number][] = []
  const ringFor = (z: number): [number, number][] => {
    const top = topAt(z)
    const u = (z - z0) / (z1 - z0)
    const end = Math.min(1, Math.min(u, 1 - u) / 0.07)
    const taper = 0.9 + 0.1 * Math.sqrt(Math.max(0, end))
    const shoulderY = Math.min(0.99, top - 0.05)
    const cabin = Math.max(0, Math.min(1, (top - 1.0) / 0.55))
    const wb = 0.85 * taper
    const ws = 0.86 * taper
    const wr = ws - 0.13 * cabin - 0.02
    const crown = Math.min(0.07, (top - shoulderY) * 0.5 + 0.03)
    const pts: [number, number][] = [
      [0, bottom], [wb * 0.8, bottom], [wb, bottom + 0.07], [ws, bottom + (shoulderY - bottom) * 0.55],
      [ws, shoulderY - 0.04], [ws * 0.985, shoulderY],
    ]
    if (cabin > 0.02) pts.push([(ws * 0.985 + wr) / 2, shoulderY + (top - shoulderY) * 0.5], [wr, top - 0.12 * cabin - crown])
    pts.push([wr * 0.9, top - crown * 0.45], [wr * 0.55, top - crown * 0.12], [0, top])
    return pts
  }
  // Todos os anéis precisam ter o mesmo número de pontos: usa o máximo e repete o primeiro quando faltar.
  const rings: [number, number][][] = []
  let maxLen = 0
  for (let i = 0; i <= stations; i += 1) {
    const r = ringFor(z0 + ((z1 - z0) * i) / stations)
    rings.push(r)
    maxLen = Math.max(maxLen, r.length)
  }
  for (const r of rings) {
    // Insere pontos repetidos logo antes da coroa para igualar o tamanho sem distorcer a forma.
    while (r.length < maxLen) r.splice(r.length - 2, 0, r[r.length - 3] ?? r[0])
  }
  half.length = 0
  const perRing = maxLen * 2 - 1
  const positions: number[] = []
  const indices: number[] = []
  rings.forEach((r, i) => {
    const z = z0 + ((z1 - z0) * i) / stations
    for (let k = 0; k < r.length; k += 1) positions.push(-r[k][0], r[k][1], z)
    for (let k = r.length - 2; k >= 0; k -= 1) positions.push(r[k][0], r[k][1], z)
  })
  for (let i = 0; i < stations; i += 1) {
    for (let k = 0; k < perRing - 1; k += 1) {
      const a = i * perRing + k
      const b = a + 1
      const c = (i + 1) * perRing + k
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  // Tampas frontal e traseira (leque a partir do centro do anel).
  for (const [ringIndex, flip] of [[0, false], [stations, true]] as const) {
    const base = positions.length / 3
    const first = ringIndex * perRing
    const z = z0 + ((z1 - z0) * ringIndex) / stations
    positions.push(0, bottom + 0.2, z)
    for (let k = 0; k < perRing - 1; k += 1) {
      const a = first + k
      const b = first + k + 1
      if (flip) indices.push(base, b, a)
      else indices.push(base, a, b)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Builds a named, modular Gol G5 model. Separate body, glass, trim, lights and wheel
 * groups make later paint, wheel and accessory customization straightforward.
 */
export function createGolG5Model(paint: THREE.ColorRepresentation = '#4a5052'): THREE.Group {
  const car = new THREE.Group()
  car.name = 'gol-g5-player-car'

  const body = new THREE.Group()
  body.name = 'gol-g5-body-group'
  const glass = new THREE.Group()
  glass.name = 'gol-g5-glass-group'
  const trim = new THREE.Group()
  trim.name = 'gol-g5-trim-group'
  const wheels = new THREE.Group()
  wheels.name = 'gol-g5-wheels-group'
  const lights = new THREE.Group()
  lights.name = 'gol-g5-lights-group'
  car.add(body, glass, trim, wheels, lights)

  const paintMaterial = new THREE.MeshPhysicalMaterial({
    color: paint, metalness: 0.55, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6,
  })
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: '#1b2f3d', metalness: 0.45, roughness: 0.07, clearcoat: 1, envMapIntensity: 2.2,
    clearcoatRoughness: 0.08, transparent: true, opacity: 0.94, side: THREE.DoubleSide,
  })
  const rubberMaterial = new THREE.MeshStandardMaterial({ color: '#101316', roughness: 0.92 })
  const alloyMaterial = new THREE.MeshStandardMaterial({ color: '#aeb7bb', metalness: 0.88, roughness: 0.2 })
  const darkTrim = new THREE.MeshStandardMaterial({ color: '#171c20', metalness: 0.28, roughness: 0.52 })
  const chromeMaterial = new THREE.MeshStandardMaterial({ color: '#c5cdd0', metalness: 0.92, roughness: 0.17 })
  const headlampMaterial = new THREE.MeshPhysicalMaterial({
    color: '#fff4d8', emissive: '#ffe3a6', emissiveIntensity: 1.45, roughness: 0.16,
  })
  const tailLampMaterial = new THREE.MeshPhysicalMaterial({
    color: '#a8201c', emissive: '#ff211b', emissiveIntensity: 1.35, roughness: 0.2,
  })
  const indicatorMaterial = new THREE.MeshStandardMaterial({
    color: '#e58a36', emissive: '#ff6a18', emissiveIntensity: 0.8,
  })

  // Casco em loft: seções transversais arredondadas (cintura, ombro, teto com abaulado) ao longo do comprimento.
  const shell = new THREE.Mesh(createLoftedBodyGeometry(), paintMaterial)
  shell.name = 'gol-g5-body-shell'
  shell.castShadow = true
  shell.receiveShadow = true
  body.add(shell)

  // Para-choques e caixas de roda escuras (a roda parece entrar na carroceria, como num carro de verdade).
  addBox(body, 'gol-g5-front-bumper', [1.7, 0.2, 0.16], [0, 0.43, 1.91], darkTrim, true)
  addBox(body, 'gol-g5-rear-bumper', [1.7, 0.2, 0.16], [0, 0.43, -1.94], darkTrim, true)
  const archMaterial = new THREE.MeshStandardMaterial({ color: '#06080a', roughness: 1 })
  for (const side of [-1, 1]) {
    for (const z of [1.25, -1.28]) {
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 28), archMaterial)
      arch.name = 'wheel-arch'
      arch.rotation.z = Math.PI / 2
      arch.position.set(side * 0.845, 0.4, z)
      body.add(arch)
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.022, 8, 28), darkTrim)
      lip.name = 'wheel-arch-lip'
      lip.rotation.y = Math.PI / 2
      lip.position.set(side * 0.862, 0.4, z)
      body.add(lip)
    }
  }
  // Faixa de LED traseira e luz diurna dianteira.
  const ledRed = new THREE.MeshBasicMaterial({ color: '#ff2a22', toneMapped: false })
  const ledWhite = new THREE.MeshBasicMaterial({ color: '#e8f4ff', toneMapped: false })
  addBox(lights, 'gol-g5-led-bar', [0.7, 0.026, 0.02], [0, 0.86, -1.975], ledRed)
  for (const side of [-1, 1]) {
    addBox(lights, `gol-g5-drl-${side}`, [0.36, 0.022, 0.02], [side * 0.58, 0.77, 1.975], ledWhite)
  }

  // Windshield and hatch glass, plus four side-window panes.
  addQuad(glass, 'gol-g5-windshield', [
    [-0.68, 1.48, 0.43], [0.68, 1.48, 0.43], [0.73, 1.04, 0.96], [-0.73, 1.04, 0.96],
  ], glassMaterial)
  addQuad(glass, 'gol-g5-rear-window', [
    [0.64, 1.48, -0.98], [-0.64, 1.48, -0.98], [-0.72, 1.04, -1.43], [0.72, 1.04, -1.43],
  ], glassMaterial)
  for (const side of [-1, 1]) {
    addQuad(glass, `gol-g5-front-side-window-${side}`, [
      [side * 0.865, 1.46, 0.36], [side * 0.865, 1.46, -0.38],
      [side * 0.865, 1.08, -0.66], [side * 0.865, 1.08, 0.78],
    ], glassMaterial)
    addQuad(glass, `gol-g5-rear-side-window-${side}`, [
      [side * 0.865, 1.46, -0.43], [side * 0.865, 1.46, -0.96],
      [side * 0.865, 1.08, -1.36], [side * 0.865, 1.08, -0.72],
    ], glassMaterial)

    // Door seams, handles and mirrors.
    addBox(trim, `gol-g5-door-seam-front-${side}`, [0.014, 0.43, 0.018], [side * 0.866, 0.78, 0.12], darkTrim)
    addBox(trim, `gol-g5-door-seam-rear-${side}`, [0.014, 0.42, 0.018], [side * 0.866, 0.77, -0.78], darkTrim)
    addBox(trim, `gol-g5-door-handle-front-${side}`, [0.035, 0.045, 0.17], [side * 0.89, 0.96, -0.12], chromeMaterial)
    addBox(trim, `gol-g5-door-handle-rear-${side}`, [0.035, 0.045, 0.17], [side * 0.89, 0.95, -0.91], chromeMaterial)
    addBox(trim, `gol-g5-side-mirror-arm-${side}`, [0.16, 0.035, 0.12], [side * 0.91, 1.12, 0.48], darkTrim)
    addBox(trim, `gol-g5-side-mirror-${side}`, [0.18, 0.13, 0.2], [side * 1.0, 1.15, 0.49], paintMaterial, true)
    addBox(trim, `gol-g5-side-skirt-${side}`, [0.06, 0.12, 1.7], [side * 0.84, 0.39, -0.05], darkTrim)
  }

  // Front fascia: grille, VW-style round badge, lower intake and fog lamps.
  addBox(trim, 'gol-g5-front-grille', [0.82, 0.19, 0.045], [0, 0.73, 1.965], darkTrim, true)
  addBox(trim, 'gol-g5-grille-upper-trim', [0.92, 0.035, 0.055], [0, 0.84, 1.97], chromeMaterial)
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.035, 24), chromeMaterial)
  badge.name = 'gol-g5-front-emblem'
  badge.rotation.x = Math.PI / 2
  badge.position.set(0, 0.75, 2.0)
  trim.add(badge)
  addBox(trim, 'gol-g5-lower-intake', [0.9, 0.09, 0.04], [0, 0.49, 1.98], darkTrim)
  for (const side of [-1, 1]) {
    addBox(lights, `gol-g5-headlamp-${side}`, [0.42, 0.2, 0.075], [side * 0.59, 0.88, 1.94], headlampMaterial, true)
    addBox(lights, `gol-g5-fog-lamp-${side}`, [0.12, 0.09, 0.04], [side * 0.64, 0.5, 1.99], headlampMaterial)
    addBox(lights, `gol-g5-front-indicator-${side}`, [0.09, 0.07, 0.035], [side * 0.83, 0.88, 1.93], indicatorMaterial)
    addBox(lights, `gol-g5-tail-lamp-${side}`, [0.25, 0.42, 0.075], [side * 0.73, 0.84, -1.93], tailLampMaterial, true)
    addBox(lights, `gol-g5-brake-lamp-${side}`, [0.15, 0.08, 0.04], [side * 0.73, 0.63, -1.95], tailLampMaterial)
  }

  // License plates, hatch details, wipers and exhaust.
  const plateMaterial = new THREE.MeshStandardMaterial({ color: '#e7e8df', roughness: 0.62 })
  addBox(trim, 'gol-g5-front-plate', [0.48, 0.12, 0.025], [0, 0.55, 2.0], plateMaterial)
  addBox(trim, 'gol-g5-rear-plate', [0.48, 0.12, 0.025], [0, 0.62, -1.99], plateMaterial)
  addBox(trim, 'gol-g5-hatch-handle', [0.24, 0.045, 0.035], [0, 0.99, -1.98], chromeMaterial)
  addBox(trim, 'gol-g5-rear-wiper', [0.025, 0.3, 0.025], [0.42, 1.23, -1.47], darkTrim)
  addBox(trim, 'gol-g5-front-wiper-left', [0.38, 0.018, 0.025], [-0.32, 1.02, 0.92], darkTrim)
  addBox(trim, 'gol-g5-front-wiper-right', [0.38, 0.018, 0.025], [0.32, 1.02, 0.92], darkTrim)
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.18, 12), chromeMaterial)
  exhaust.name = 'gol-g5-exhaust'
  exhaust.rotation.z = Math.PI / 2
  exhaust.position.set(0.63, 0.31, -1.92)
  trim.add(exhaust)

  // Four tires with separate alloy rims, brake discs and five spokes per wheel.
  for (const side of [-1, 1]) {
    for (const axle of ['front', 'rear'] as const) {
      const z = axle === 'front' ? 1.25 : -1.28
      const wheel = new THREE.Group()
      wheel.name = `gol-g5-wheel-${axle}-${side === -1 ? 'left' : 'right'}`
      wheel.position.set(side * 0.87, 0.39, z)
      wheels.add(wheel)

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.365, 0.24, 32), rubberMaterial)
      tire.name = 'tire'
      tire.rotation.z = Math.PI / 2
      tire.castShadow = true
      wheel.add(tire)

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.255, 32), alloyMaterial)
      rim.name = 'alloy-rim'
      rim.rotation.z = Math.PI / 2
      rim.position.x = side * 0.012
      wheel.add(rim)

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.27, 20), chromeMaterial)
      hub.name = 'wheel-hub'
      hub.rotation.z = Math.PI / 2
      hub.position.x = side * 0.02
      wheel.add(hub)

      const spokeSide = side * 0.145
      for (let spoke = 0; spoke < 5; spoke += 1) {
        const angle = (spoke / 5) * Math.PI * 2
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.19, 0.055), chromeMaterial)
        bar.name = `alloy-spoke-${spoke + 1}`
        bar.position.set(spokeSide, Math.sin(angle) * 0.115, Math.cos(angle) * 0.115)
        bar.rotation.x = -angle
        wheel.add(bar)
      }
    }
  }

  // Subtle roof antenna and fuel door, useful landmarks for later visual upgrades.
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.28, 8), darkTrim)
  antenna.name = 'gol-g5-roof-antenna'
  antenna.position.set(-0.42, 1.66, -0.62)
  antenna.rotation.z = -0.18
  trim.add(antenna)
  addBox(trim, 'gol-g5-fuel-door', [0.018, 0.2, 0.18], [-0.866, 0.83, -1.34], paintMaterial)

  car.traverse(node => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true
      node.receiveShadow = true
    }
  })
  return car
}
