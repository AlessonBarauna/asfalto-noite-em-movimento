import * as THREE from 'three'
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

const DARK = new THREE.MeshStandardMaterial({ color: '#171c20', roughness: 0.58, metalness: 0.25 })
const RUBBER = new THREE.MeshStandardMaterial({ color: '#101316', roughness: 0.94 })
const ALLOY = new THREE.MeshStandardMaterial({ color: '#aeb8bd', metalness: 0.86, roughness: 0.23 })
const GLASS = new THREE.MeshPhysicalMaterial({ color: '#172a36', metalness: 0.16, roughness: 0.17, clearcoat: 0.8, transparent: true, opacity: 0.94 })
const HEADLIGHT = new THREE.MeshStandardMaterial({ color: '#fff4d9', emissive: '#ffe4b0', emissiveIntensity: 2.4 })
const TAILLIGHT = new THREE.MeshStandardMaterial({ color: '#8d201c', emissive: '#f32c24', emissiveIntensity: 2.1 })
const CHROME = new THREE.MeshStandardMaterial({ color: '#b8c0c3', metalness: 0.9, roughness: 0.2 })

function box(
  parent: THREE.Group,
  name: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  material: THREE.Material,
  bevel = false,
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(...size)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  if (bevel) {
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.045 }),
    )
    edge.position.copy(mesh.position)
    parent.add(edge)
  }
  return mesh
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
    color: paint, metalness: 0.66, roughness: 0.25, clearcoat: 0.92, clearcoatRoughness: 0.14,
  })
  const width = spec.width
  const length = spec.length
  const halfWidth = width / 2
  const front = length / 2
  const rear = -length / 2
  const roofY = spec.roofHeight
  const lowerY = spec.bodyHeight
  const cabinZ = spec.utility === 'pickup' ? 0.45 : -0.06

  // Rounded lower body and separate bonnet / rear hatch create a hatchback profile.
  box(body, 'traffic-body-shell', [width, lowerY, length * 0.94], [0, lowerY * 0.54, 0], paintMaterial, true)
  box(body, 'traffic-hood', [width * 0.88, 0.11, length * 0.25], [0, lowerY * 0.98, front * 0.68], paintMaterial, true)
  box(body, 'traffic-rear-hatch', [width * 0.86, 0.12, length * 0.19], [0, lowerY * 0.96, rear * 0.82], paintMaterial, true)
  box(body, 'traffic-front-bumper', [width * 0.94, 0.16, 0.14], [0, 0.3, front * 0.98], DARK, true)
  box(body, 'traffic-rear-bumper', [width * 0.94, 0.16, 0.14], [0, 0.3, rear * 0.98], DARK, true)

  if (spec.utility === 'van') {
    // Fiorino: tall, squared cargo body and compact forward cabin.
    box(body, 'fiorino-cargo-box', [width * 0.91, roofY - 0.72, length * 0.48], [0, (roofY + 0.72) / 2, rear * 0.36], paintMaterial, true)
    box(cabin, 'fiorino-windshield', [width * 0.82, 0.48, 0.045], [0, roofY - 0.34, front * 0.44], GLASS, true)
    for (const side of [-1, 1]) {
      box(cabin, `fiorino-door-window-${side}`, [0.035, 0.4, 0.54], [side * (halfWidth * 0.91), roofY - 0.38, front * 0.15], GLASS, true)
      box(details, `fiorino-cargo-seam-${side}`, [0.018, 0.7, 0.025], [side * (halfWidth * 0.93), 0.83, rear * 0.4], DARK)
    }
  } else {
    const cabinWidth = width * (spec.utility === 'pickup' ? 0.82 : 0.84)
    const cabinRoofLength = spec.cabinLength * 0.68
    box(cabin, 'traffic-roof', [cabinWidth, 0.09, cabinRoofLength], [0, roofY, cabinZ], paintMaterial, true)
    box(cabin, 'traffic-windshield', [cabinWidth * 0.94, 0.43, 0.045], [0, roofY - 0.25, cabinZ + cabinRoofLength * 0.49], GLASS, true)
    box(cabin, 'traffic-rear-glass', [cabinWidth * 0.9, 0.38, 0.045], [0, roofY - 0.27, cabinZ - cabinRoofLength * 0.49], GLASS, true)
    for (const side of [-1, 1]) {
      box(cabin, `traffic-front-side-window-${side}`, [0.035, 0.36, cabinRoofLength * 0.43], [side * (halfWidth * 0.84), roofY - 0.25, cabinZ + 0.08], GLASS, true)
      if (spec.utility !== 'pickup') {
        box(cabin, `traffic-rear-side-window-${side}`, [0.035, 0.34, cabinRoofLength * 0.31], [side * (halfWidth * 0.84), roofY - 0.26, cabinZ - cabinRoofLength * 0.3], GLASS, true)
      }
      box(details, `traffic-mirror-${side}`, [0.14, 0.1, 0.16], [side * (halfWidth * 0.98), roofY - 0.34, cabinZ + cabinRoofLength * 0.38], paintMaterial, true)
    }
    if (spec.utility === 'pickup') {
      // Saveiro: short single cab, open cargo bed, side rails and tailgate.
      box(body, 'saveiro-bed-floor', [width * 0.78, 0.08, length * 0.34], [0, lowerY + 0.05, rear * 0.56], DARK)
      for (const side of [-1, 1]) {
        box(body, `saveiro-bed-rail-${side}`, [0.09, 0.28, length * 0.37], [side * (halfWidth * 0.82), lowerY + 0.18, rear * 0.56], paintMaterial, true)
      }
      box(body, 'saveiro-tailgate', [width * 0.82, 0.34, 0.08], [0, lowerY + 0.15, rear * 0.78], paintMaterial, true)
    }
  }

  // Distinctive fascia, grille, badges, door seams and plates.
  box(details, 'traffic-front-grille', [width * 0.46, 0.13, 0.045], [0, 0.66, front * 0.98], DARK, true)
  box(details, 'traffic-grille-trim', [width * 0.52, 0.025, 0.05], [0, 0.75, front * 0.985], CHROME)
  const badge = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), CHROME)
  badge.name = 'traffic-front-badge'
  badge.position.set(0, 0.7, front * 1.005)
  details.add(badge)
  box(details, 'traffic-front-plate', [0.42, 0.1, 0.025], [0, 0.43, front * 1.01], CHROME)
  box(details, 'traffic-rear-plate', [0.42, 0.1, 0.025], [0, 0.47, rear * 1.01], CHROME)

  for (const side of [-1, 1]) {
    box(details, `traffic-headlight-${side}`, [width * 0.22, 0.13, 0.055], [side * width * 0.31, 0.76, front * 0.985], HEADLIGHT, true)
    box(details, `traffic-taillight-${side}`, [width * 0.14, 0.25, 0.055], [side * width * 0.36, 0.69, rear * 0.985], TAILLIGHT, true)
    if (spec.utility !== 'van') {
      box(details, `traffic-door-seam-front-${side}`, [0.018, 0.34, 0.02], [side * halfWidth * 0.99, 0.62, 0.18], DARK)
      box(details, `traffic-door-handle-front-${side}`, [0.035, 0.035, 0.12], [side * halfWidth * 1.01, 0.78, -0.1], CHROME)
    }
  }

  const wheelRadius = spec.utility === 'van' ? 0.36 : 0.33
  const wheelZ = spec.wheelBase / 2
  for (const side of [-1, 1]) {
    for (const z of [-wheelZ, wheelZ]) {
      const wheel = new THREE.Group()
      wheel.name = `traffic-wheel-${side === -1 ? 'left' : 'right'}-${z > 0 ? 'front' : 'rear'}`
      wheel.position.set(side * (halfWidth * 0.94), wheelRadius, z)
      wheels.add(wheel)
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.2, 20), RUBBER)
      tire.name = 'traffic-tire'
      tire.rotation.z = Math.PI / 2
      tire.castShadow = true
      wheel.add(tire)
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, 0.215, 16), ALLOY)
      rim.name = 'traffic-alloy-wheel'
      rim.rotation.z = Math.PI / 2
      rim.position.x = side * 0.01
      wheel.add(rim)
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
