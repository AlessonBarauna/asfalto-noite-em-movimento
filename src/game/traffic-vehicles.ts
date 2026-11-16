import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { TrafficKind } from './race-rules'

export type BrazilianTrafficModel =
  | 'gol-g5'
  | 'uno'
  | 'palio'
  | 'celta'
  | 'corsa'
  | 'onix'
  | 'hb20'
  | 'saveiro'
  | 'fiorino'

export type BrazilianTrafficSpec = {
  id: BrazilianTrafficModel
  label: string
  kind: TrafficKind
  width: number
  length: number
  bodyHeight: number
  roofHeight: number
  cabinLength: number
  wheelBase: number
  utility?: 'pickup' | 'van'
}

/** Brazilian everyday traffic roster; dimensions are gameplay approximations, not homologation data. */
export const BRAZILIAN_TRAFFIC_MODELS: readonly BrazilianTrafficSpec[] = [
  { id: 'gol-g5', label: 'Volkswagen Gol G5', kind: 'sedan', width: 1.72, length: 3.95, bodyHeight: 0.66, roofHeight: 1.38, cabinLength: 1.72, wheelBase: 2.42 },
  { id: 'uno', label: 'Fiat Uno', kind: 'suv', width: 1.63, length: 3.78, bodyHeight: 0.68, roofHeight: 1.48, cabinLength: 1.82, wheelBase: 2.37 },
  { id: 'palio', label: 'Fiat Palio', kind: 'sedan', width: 1.67, length: 3.87, bodyHeight: 0.65, roofHeight: 1.37, cabinLength: 1.7, wheelBase: 2.37 },
  { id: 'celta', label: 'Chevrolet Celta', kind: 'sedan', width: 1.62, length: 3.79, bodyHeight: 0.63, roofHeight: 1.34, cabinLength: 1.66, wheelBase: 2.44 },
  { id: 'corsa', label: 'Chevrolet Corsa', kind: 'sedan', width: 1.68, length: 4.0, bodyHeight: 0.66, roofHeight: 1.38, cabinLength: 1.72, wheelBase: 2.49 },
  { id: 'onix', label: 'Chevrolet Onix', kind: 'sedan', width: 1.73, length: 4.16, bodyHeight: 0.68, roofHeight: 1.43, cabinLength: 1.82, wheelBase: 2.55 },
  { id: 'hb20', label: 'Hyundai HB20', kind: 'sedan', width: 1.72, length: 4.02, bodyHeight: 0.67, roofHeight: 1.41, cabinLength: 1.78, wheelBase: 2.53 },
  { id: 'saveiro', label: 'Volkswagen Saveiro', kind: 'pickup', width: 1.72, length: 4.49, bodyHeight: 0.68, roofHeight: 1.39, cabinLength: 1.25, wheelBase: 2.75, utility: 'pickup' },
  { id: 'fiorino', label: 'Fiat Fiorino', kind: 'van', width: 1.74, length: 4.4, bodyHeight: 0.7, roofHeight: 1.76, cabinLength: 1.5, wheelBase: 2.72, utility: 'van' },
] as const

const DARK = new THREE.MeshStandardMaterial({ color: '#15191d', roughness: 0.6, metalness: 0.2 })
const TRIM = new THREE.MeshStandardMaterial({ color: '#0d1013', roughness: 0.82, metalness: 0.05 })
const RUBBER = new THREE.MeshStandardMaterial({ color: '#0e1114', roughness: 0.95 })
const ALLOY = new THREE.MeshStandardMaterial({ color: '#aeb8bd', metalness: 0.88, roughness: 0.22 })
const BRAKE = new THREE.MeshStandardMaterial({ color: '#6c7479', metalness: 0.8, roughness: 0.4 })
const GLASS = new THREE.MeshPhysicalMaterial({ color: '#1a2d3b', metalness: 0.45, roughness: 0.06, clearcoat: 1, envMapIntensity: 2.2, transparent: true, opacity: 0.94 })
const HEADLIGHT = new THREE.MeshStandardMaterial({ color: '#fff4d9', emissive: '#ffe4b0', emissiveIntensity: 2.4 })
const FOG = new THREE.MeshStandardMaterial({ color: '#fff8e8', emissive: '#ffe9c0', emissiveIntensity: 1.1 })
const TAILLIGHT = new THREE.MeshStandardMaterial({ color: '#8d201c', emissive: '#f32c24', emissiveIntensity: 2.1 })
const CHROME = new THREE.MeshStandardMaterial({ color: '#b8c0c3', metalness: 0.92, roughness: 0.18 })
const GOLD = new THREE.MeshStandardMaterial({ color: '#c9a24b', metalness: 0.9, roughness: 0.28 })

/** Front-end styling that tells the models apart from the front, which is what the player sees. */
type FaceStyle = { lamp: [number, number]; lampY: number; lampRound?: boolean; sweep?: number; grille: 'bar' | 'hex' | 'slats' | 'trap' | 'tie'; badge: 'chrome' | 'gold'; led?: boolean }
const FACE: Record<BrazilianTrafficModel, FaceStyle> = {
  'gol-g5': { lamp: [0.27, 0.12], lampY: 0.58, grille: 'bar', badge: 'chrome', sweep: 0.03 },
  uno: { lamp: [0.2, 0.17], lampY: 0.6, grille: 'trap', badge: 'chrome' },
  palio: { lamp: [0.31, 0.12], lampY: 0.58, grille: 'slats', badge: 'chrome', sweep: 0.05 },
  celta: { lamp: [0.22, 0.18], lampY: 0.58, lampRound: true, grille: 'trap', badge: 'gold' },
  corsa: { lamp: [0.34, 0.1], lampY: 0.58, grille: 'tie', badge: 'gold', sweep: 0.06 },
  onix: { lamp: [0.33, 0.09], lampY: 0.58, grille: 'hex', badge: 'gold', sweep: 0.08, led: true },
  hb20: { lamp: [0.32, 0.1], lampY: 0.58, grille: 'hex', badge: 'chrome', sweep: 0.07, led: true },
  saveiro: { lamp: [0.27, 0.12], lampY: 0.58, grille: 'bar', badge: 'chrome', sweep: 0.03 },
  fiorino: { lamp: [0.2, 0.2], lampY: 0.64, grille: 'slats', badge: 'chrome' },
}

type Pt = readonly [number, number]

/** Closed outline with softened corners (quadratic fillets) in the (z, y) plane. */
function roundedOutline(points: readonly Pt[], radius: number): THREE.Shape {
  const shape = new THREE.Shape()
  const n = points.length
  for (let i = 0; i < n; i += 1) {
    const prev = points[(i + n - 1) % n]
    const cur = points[i]
    const next = points[(i + 1) % n]
    const toPrev = new THREE.Vector2(prev[0] - cur[0], prev[1] - cur[1])
    const toNext = new THREE.Vector2(next[0] - cur[0], next[1] - cur[1])
    const rp = Math.min(radius, toPrev.length() * 0.45)
    const rn = Math.min(radius, toNext.length() * 0.45)
    const a = toPrev.clone().normalize().multiplyScalar(rp).add(new THREE.Vector2(cur[0], cur[1]))
    const b = toNext.clone().normalize().multiplyScalar(rn).add(new THREE.Vector2(cur[0], cur[1]))
    if (i === 0) shape.moveTo(a.x, a.y)
    else shape.lineTo(a.x, a.y)
    shape.quadraticCurveTo(cur[0], cur[1], b.x, b.y)
  }
  shape.closePath()
  return shape
}

/**
 * Side-profile loft: the outline is drawn in (z, y), pushed across the car's width with soft
 * bevelled edges, then pinched toward the top so the flanks lean in like a real body.
 */
function loft(name: string, outline: readonly Pt[], width: number, material: THREE.Material, opts: { corner?: number; bevel?: number; taper?: number } = {}): THREE.Mesh {
  const bevel = opts.bevel ?? 0.07
  const shape = roundedOutline(outline, opts.corner ?? 0.12)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.05, width - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 5 })
  geometry.translate(0, 0, -(width - bevel * 2) / 2)
  geometry.rotateY(-Math.PI / 2)
  const taper = opts.taper ?? 0
  if (taper > 0) {
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const pos = geometry.attributes.position
    for (let i = 0; i < pos.count; i += 1) {
      const t = (pos.getY(i) - box.min.y) / (box.max.y - box.min.y)
      pos.setX(i, pos.getX(i) * (1 - taper * t * t))
    }
    pos.needsUpdate = true
  }
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function box(
  parent: THREE.Group,
  name: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
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

function tireGeometry(radius: number, width: number): THREE.BufferGeometry {
  // Lathe profile of a real tyre: flat tread, rounded shoulders, inward-tapering sidewalls.
  const inner = radius * 0.62
  const half = width / 2
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(inner, -half * 0.8), new THREE.Vector2(radius * 0.8, -half), new THREE.Vector2(radius * 0.97, -half * 0.92),
    new THREE.Vector2(radius, -half * 0.55), new THREE.Vector2(radius, half * 0.55), new THREE.Vector2(radius * 0.97, half * 0.92),
    new THREE.Vector2(radius * 0.8, half), new THREE.Vector2(inner, half * 0.8),
  ]
  const g = new THREE.LatheGeometry(pts, 28)
  g.rotateZ(Math.PI / 2)
  return g
}

function buildWheel(radius: number, side: number, rimMat: THREE.Material): THREE.Group {
  const wheel = new THREE.Group()
  const tire = new THREE.Mesh(tireGeometry(radius, 0.21), RUBBER)
  tire.name = 'traffic-tire'
  tire.castShadow = true
  wheel.add(tire)
  const rimR = radius * 0.64
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, 0.15, 24), rimMat)
  disc.name = 'traffic-alloy-wheel'
  disc.rotation.z = Math.PI / 2
  wheel.add(disc)
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(rimR * 0.9, rimR * 0.9, 0.12, 20), BRAKE)
  brake.rotation.z = Math.PI / 2
  brake.position.x = -side * 0.03
  wheel.add(brake)
  // five slim spokes and a centre cap stand proud of the disc so the wheel reads as an alloy
  const outward = side * 0.085
  for (let i = 0; i < 5; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, rimR * 0.2, rimR * 0.92), rimMat)
    spoke.name = 'traffic-alloy-wheel-spoke'
    spoke.position.x = outward
    spoke.rotation.x = (i / 5) * Math.PI * 2
    spoke.translateZ(rimR * 0.46)
    wheel.add(spoke)
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(rimR * 0.2, rimR * 0.2, 0.03, 12), CHROME)
  cap.rotation.z = Math.PI / 2
  cap.position.x = outward
  wheel.add(cap)
  return wheel
}

/** Creates a distinct compact Brazilian car silhouette with separately named upgrade parts. */
export function createBrazilianTrafficVehicle(
  model: BrazilianTrafficModel,
  paint: THREE.ColorRepresentation,
): THREE.Group {
  const spec = BRAZILIAN_TRAFFIC_MODELS.find(item => item.id === model)
  if (!spec) throw new Error(`Unknown Brazilian traffic model: ${model}`)

  const car = new THREE.Group()
  car.name = `traffic-${model}`
  const body = new THREE.Group()
  body.name = 'traffic-body'
  const cabin = new THREE.Group()
  cabin.name = 'traffic-cabin'
  const details = new THREE.Group()
  details.name = 'traffic-details'
  const wheels = new THREE.Group()
  wheels.name = 'traffic-wheels'
  car.add(body, cabin, details, wheels)

  const paintMaterial = new THREE.MeshPhysicalMaterial({
    color: paint, metalness: 0.5, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.5,
  })
  const face = FACE[model]
  const width = spec.width
  const length = spec.length
  const halfWidth = width / 2
  const front = length / 2
  const rear = -length / 2
  const roofY = spec.roofHeight
  const lowerY = spec.bodyHeight
  const cabinZ = spec.utility === 'pickup' ? 0.45 : -0.06
  const isVan = spec.utility === 'van'
  const isPickup = spec.utility === 'pickup'
  const cabinMid = isPickup ? cabinZ - 0.04 : (cabinZ + spec.cabinLength * 0.62 + rear + 0.28) / 2

  // Lower body: slim nose, flat belt line, soft tail — extruded and bevelled as one shell.
  const lowerOutline: Pt[] = isVan
    ? [[rear, 0.27], [rear, lowerY + 0.05], [front * 0.18, lowerY + 0.05], [front * 0.72, lowerY + 0.02], [front - 0.04, lowerY * 0.82], [front, 0.62], [front, 0.28], [front * 0.7, 0.23], [rear * 0.7, 0.23]]
    : [[rear, 0.3], [rear, lowerY * 0.97], [rear + 0.2, lowerY + 0.03], [front * 0.42, lowerY + 0.02], [front - 0.06, lowerY * 0.84], [front, 0.64], [front, 0.29], [front * 0.7, 0.23], [rear * 0.7, 0.23]]
  const shell = loft('traffic-body-shell', lowerOutline, width, paintMaterial, { corner: 0.14, bevel: 0.07, taper: 0.1 })
  body.add(shell)
  // Hood crease and rear deck line give flat panels a visible edge under the lights.
  for (const side of [-1, 1]) box(body, `traffic-hood-crease-${side}`, [0.03, 0.02, length * 0.22], [side * width * 0.2, lowerY * 0.97 + 0.045, front * 0.66], paintMaterial)
  box(body, 'traffic-front-bumper', [width * 0.93, 0.2, 0.16], [0, 0.34, front * 0.985], TRIM, true)
  box(body, 'traffic-rear-bumper', [width * 0.93, 0.2, 0.16], [0, 0.34, rear * 0.985], TRIM, true)
  box(body, 'traffic-side-skirt-left', [0.05, 0.1, length * 0.46], [-halfWidth * 0.99, 0.29, 0], TRIM)
  box(body, 'traffic-side-skirt-right', [0.05, 0.1, length * 0.46], [halfWidth * 0.99, 0.29, 0], TRIM)

  if (isVan) {
    // Fiorino: tall squared cargo body with a short, steeply raked cab at the front.
    const cargoFront = front * 0.1
    box(body, 'fiorino-cargo-box', [width * 0.97, roofY - lowerY - 0.02, cargoFront - rear - 0.06], [0, (roofY + lowerY) / 2, (cargoFront + rear) / 2], paintMaterial, true)
    const cab: Pt[] = [[cargoFront + 0.02, lowerY + 0.02], [front * 0.52, lowerY + 0.02], [front * 0.18, roofY - 0.05], [cargoFront + 0.02, roofY - 0.05]]
    cabin.add(loft('fiorino-windshield', cab, width * 0.9, GLASS, { corner: 0.05, bevel: 0.04, taper: 0.1 }))
    for (const side of [-1, 1]) {
      box(cabin, `fiorino-door-window-${side}`, [0.03, 0.36, 0.5], [side * (halfWidth * 0.93), roofY - 0.4, front * 0.18], GLASS, true)
      box(details, `fiorino-cargo-seam-${side}`, [0.018, 0.78, 0.025], [side * (halfWidth * 0.99), 0.83, (cargoFront + rear) / 2], TRIM)
    }
    box(cabin, 'traffic-roof', [width * 0.96, 0.06, cargoFront - rear], [0, roofY, (cargoFront + rear) / 2], paintMaterial, true)
  } else {
    // Greenhouse: one glass volume with a raked windshield and a hatch or cab-length rear window,
    // framed by painted roof and pillars so it reads like windows rather than a black block.
    const roofLen = spec.cabinLength * 0.62
    const baseFront = cabinZ + spec.cabinLength * 0.62
    const baseRear = isPickup ? cabinZ - roofLen * 0.5 - 0.08 : rear + 0.28
    const topFront = isPickup ? cabinZ + roofLen * 0.5 : baseFront - 0.62
    const topRear = isPickup ? cabinZ - roofLen * 0.5 : baseRear + 0.5
    const ghHeight = roofY - lowerY
    const greenhouse: Pt[] = [[baseRear, lowerY], [topRear, roofY - 0.02], [topFront, roofY - 0.02], [baseFront, lowerY]]
    cabin.add(loft('traffic-windshield-glass', greenhouse, width * 0.88, GLASS, { corner: 0.08, bevel: 0.05, taper: 0.14 }))
    const roof: Pt[] = [[topRear - 0.05, roofY - 0.06], [topRear - 0.03, roofY + 0.015], [topFront + 0.02, roofY + 0.015], [topFront + 0.05, roofY - 0.06]]
    const roofMesh = loft('traffic-roof', roof, width * 0.78, paintMaterial, { corner: 0.04, bevel: 0.035, taper: 0.1 })
    cabin.add(roofMesh)
    const slopeFront = new THREE.Vector2(topFront - baseFront, ghHeight)
    const slopeRear = new THREE.Vector2(topRear - baseRear, ghHeight)
    for (const side of [-1, 1]) {
      const px = side * halfWidth * 0.78
      const aPillar = box(cabin, `traffic-a-pillar-${side}`, [0.05, slopeFront.length(), 0.055], [px, lowerY + ghHeight / 2, (baseFront + topFront) / 2], paintMaterial)
      aPillar.rotation.x = Math.atan2(slopeFront.x, slopeFront.y)
      const cPillar = box(cabin, `traffic-c-pillar-${side}`, [0.05, slopeRear.length(), 0.09], [side * halfWidth * 0.79, lowerY + ghHeight / 2, (baseRear + topRear) / 2], paintMaterial)
      cPillar.rotation.x = Math.atan2(slopeRear.x, slopeRear.y)
      box(cabin, `traffic-b-pillar-${side}`, [0.045, ghHeight * 0.9, 0.07], [side * halfWidth * 0.8, lowerY + ghHeight * 0.48, cabinMid - 0.05], paintMaterial)
      box(details, `traffic-mirror-${side}`, [0.16, 0.1, 0.14], [side * (halfWidth * 1.02), lowerY + 0.2, baseFront + 0.02], paintMaterial, true)
      const wiper = box(details, `traffic-wiper-${side}`, [0.012, 0.012, 0.42], [side * 0.28 - 0.05, lowerY + 0.07, baseFront - 0.1], TRIM)
      wiper.rotation.z = side * 0.18
    }
    if (isPickup) {
      // Saveiro: short single cab, open cargo bed, side rails and tailgate.
      box(body, 'saveiro-bed-floor', [width * 0.8, 0.08, length * 0.34], [0, lowerY + 0.04, rear * 0.56], DARK)
      for (const side of [-1, 1]) {
        box(body, `saveiro-bed-rail-${side}`, [0.09, 0.3, length * 0.37], [side * (halfWidth * 0.86), lowerY + 0.17, rear * 0.56], paintMaterial, true)
      }
      box(body, 'saveiro-tailgate', [width * 0.9, 0.36, 0.08], [0, lowerY + 0.17, rear * 0.78], paintMaterial, true)
      box(body, 'saveiro-bed-headboard', [width * 0.86, 0.34, 0.07], [0, lowerY + 0.16, cabinZ - roofLen * 0.5 - 0.16], paintMaterial, true)
    }
  }

  // Front fascia: model-specific lamps and grille so each hatch is recognisable head-on.
  const headZ = front + 0.03
  const [lampW, lampH] = face.lamp
  const grilleY = 0.44
  if (face.grille === 'hex') {
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 6), TRIM)
    hex.name = 'traffic-front-grille'
    hex.rotation.x = Math.PI / 2
    hex.rotation.z = Math.PI / 2
    hex.scale.set(1.5, 1, 0.72)
    hex.position.set(0, grilleY - 0.04, headZ + 0.005)
    details.add(hex)
    box(details, 'traffic-grille-trim', [0.62, 0.025, 0.05], [0, grilleY + 0.14, headZ + 0.01], CHROME)
  } else if (face.grille === 'slats') {
    box(details, 'traffic-front-grille', [width * 0.5, 0.17, 0.05], [0, grilleY, headZ], TRIM, true)
    for (let i = 0; i < 3; i += 1) box(details, `traffic-grille-slat-${i}`, [width * 0.46, 0.014, 0.055], [0, grilleY - 0.05 + i * 0.05, headZ + 0.01], CHROME)
  } else if (face.grille === 'tie') {
    box(details, 'traffic-front-grille', [width * 0.5, 0.15, 0.05], [0, grilleY, headZ], TRIM, true)
    box(details, 'traffic-grille-trim', [width * 0.54, 0.03, 0.055], [0, grilleY + 0.095, headZ + 0.005], CHROME)
  } else if (face.grille === 'trap') {
    box(details, 'traffic-front-grille', [width * 0.36, 0.16, 0.05], [0, grilleY + 0.02, headZ], TRIM, true)
    box(details, 'traffic-grille-trim', [width * 0.4, 0.024, 0.055], [0, grilleY + 0.115, headZ + 0.005], CHROME)
  } else {
    box(details, 'traffic-front-grille', [width * 0.46, 0.12, 0.05], [0, grilleY + 0.03, headZ], TRIM, true)
    box(details, 'traffic-grille-trim', [width * 0.52, 0.025, 0.055], [0, grilleY + 0.105, headZ + 0.005], CHROME)
  }
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 14), face.badge === 'gold' ? GOLD : CHROME)
  badge.name = 'traffic-front-badge'
  badge.rotation.x = Math.PI / 2
  badge.position.set(0, grilleY + (face.grille === 'hex' ? -0.03 : 0.04), headZ + 0.04)
  details.add(badge)
  // lower air intake, fog lamps and number plate
  box(details, 'traffic-lower-intake', [width * 0.55, 0.08, 0.05], [0, 0.29, headZ + 0.01], TRIM, true)
  box(details, 'traffic-front-plate', [0.42, 0.11, 0.025], [0, 0.34, headZ + 0.05], CHROME)
  for (const side of [-1, 1]) {
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 14), FOG)
    fog.name = `traffic-fog-lamp-${side}`
    fog.rotation.x = Math.PI / 2
    fog.position.set(side * width * 0.37, 0.3, headZ + 0.02)
    details.add(fog)

    const lamp = face.lampRound
      ? new THREE.Mesh(new THREE.CylinderGeometry(lampW * 0.5, lampW * 0.5, 0.06, 18), HEADLIGHT)
      : new THREE.Mesh(new RoundedBoxGeometry(lampW, lampH, 0.06, 3, Math.min(lampH * 0.4, 0.04)), HEADLIGHT)
    lamp.name = `traffic-headlight-${side}`
    if (face.lampRound) lamp.rotation.x = Math.PI / 2
    lamp.position.set(side * width * 0.3, face.lampY, headZ)
    lamp.rotation.z = (face.sweep ?? 0) * -side * 1.2
    lamp.castShadow = true
    details.add(lamp)
    const bezelGeo = face.lampRound ? new THREE.CylinderGeometry(lampW * 0.56, lampW * 0.56, 0.05, 18) : new THREE.BoxGeometry(lampW * 1.14, lampH * 1.28, 0.05)
    const bezel = new THREE.Mesh(bezelGeo, TRIM)
    bezel.name = `traffic-headlight-bezel-${side}`
    if (face.lampRound) bezel.rotation.x = Math.PI / 2
    bezel.position.set(lamp.position.x, lamp.position.y, headZ - 0.012)
    bezel.rotation.z = lamp.rotation.z
    details.add(bezel)
    if (face.led) {
      const drl = box(details, `traffic-drl-${side}`, [lampW * 0.8, 0.014, 0.01], [lamp.position.x, face.lampY - lampH * 0.62, headZ + 0.03], FOG)
      drl.rotation.z = lamp.rotation.z
    }

    // tail lamps wrap around the corners and sit under the tail edge
    box(details, `traffic-taillight-${side}`, [width * 0.15, 0.22, 0.06], [side * width * 0.37, lowerY * 0.97 - 0.05, rear - 0.03], TAILLIGHT, true)
    if (!isVan) {
      box(details, `traffic-door-seam-front-${side}`, [0.014, 0.4, 0.016], [side * halfWidth * 0.99, 0.62, cabinMid + 0.45], TRIM)
      box(details, `traffic-door-seam-rear-${side}`, [0.014, 0.4, 0.016], [side * halfWidth * 0.99, 0.62, cabinMid - 0.4], TRIM)
      box(details, `traffic-door-handle-front-${side}`, [0.03, 0.03, 0.12], [side * halfWidth * 1.01, lowerY + 0.04, cabinMid + 0.25], CHROME)
    }
  }
  box(details, 'traffic-rear-plate', [0.42, 0.11, 0.025], [0, 0.5, rear - 0.06], CHROME)
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 6), TRIM)
  antenna.position.set(halfWidth * 0.5, roofY + 0.14, cabinZ - 0.4)
  antenna.rotation.z = -0.3
  details.add(antenna)

  // Wheels with real tyre profile and alloys, plus dark arches and flared trim on the bodywork.
  const wheelRadius = isVan ? 0.36 : 0.33
  const wheelZ = spec.wheelBase / 2
  for (const side of [-1, 1]) {
    for (const z of [-wheelZ, wheelZ]) {
      const wheel = buildWheel(wheelRadius, side, ALLOY)
      wheel.name = `traffic-wheel-${side === -1 ? 'left' : 'right'}-${z > 0 ? 'front' : 'rear'}`
      wheel.position.set(side * (halfWidth * 0.9), wheelRadius, z)
      wheels.add(wheel)
      const arch = new THREE.Mesh(new THREE.CircleGeometry(wheelRadius * 1.2, 24), TRIM)
      arch.name = 'traffic-wheel-arch'
      arch.rotation.y = side * Math.PI / 2
      arch.position.set(side * (halfWidth * 0.992), wheelRadius, z)
      details.add(arch)
      const flare = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius * 1.2, 0.028, 6, 24, Math.PI), TRIM)
      flare.name = 'traffic-wheel-flare'
      flare.rotation.y = side * Math.PI / 2
      flare.position.set(side * (halfWidth * 0.992), wheelRadius, z)
      details.add(flare)
    }
  }

  car.traverse(node => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true
      node.receiveShadow = true
    }
  })
  return car
}

/** Z of the rear edge of the roof, so add-ons like the street spoiler sit on the roof line. */
export function roofRearZ(spec: BrazilianTrafficSpec): number {
  const rear = -spec.length / 2
  if (spec.utility === 'van') return -spec.length * 0.42
  if (spec.utility === 'pickup') return 0.45 - spec.cabinLength * 0.62 * 0.5 - 0.02
  return rear + 0.28 + 0.5 - 0.05
}
