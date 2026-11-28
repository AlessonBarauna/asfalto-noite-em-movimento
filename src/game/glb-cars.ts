import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

import { GLB_CAR_LIST, type GlbCarDef, type GlbCarId } from './glb-car-list'

/** Carros realistas em glTF (licenças CC BY / CC BY-NC no README). Carregados só quando escolhidos na garagem. */
export const GLB_CARS: Record<string, GlbCarDef> = Object.fromEntries(GLB_CAR_LIST.map(c => [c.id, c]))
export const isGlbCar = (id: string): id is GlbCarId => id in GLB_CARS

const cache = new Map<string, Promise<THREE.Group>>()
const ready = new Map<string, THREE.Group>()

export function loadedGlbCar(id: GlbCarId): THREE.Group | undefined {
  return ready.get(id)
}

/** Carrega uma vez (meshopt, ~1 MB) e normaliza: comprimento em metros, centrado, rodas no chão, frente em +Z. */
export function preloadGlbCar(id: GlbCarId): Promise<THREE.Group> {
  let p = cache.get(id)
  if (!p) {
    const def = GLB_CARS[id]
    p = (async () => {
      const loader = new GLTFLoader()
      loader.setMeshoptDecoder(MeshoptDecoder)
      const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/${id}.glb`)
      const root = gltf.scene
      root.updateMatrixWorld(true)
      let box = new THREE.Box3().setFromObject(root)
      // Alguns modelos vêm deitados no eixo X; gira para que o comprimento fique em Z (a frente em +Z).
      const yaw = def.yaw ?? (box.max.x - box.min.x > box.max.z - box.min.z ? Math.PI / 2 : 0)
      if (yaw) { root.rotation.y = yaw; root.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(root) }
      const scale = def.length / (box.max.z - box.min.z)
      const wrapper = new THREE.Group()
      wrapper.add(root)
      wrapper.scale.setScalar(scale)
      wrapper.updateMatrixWorld(true)
      box = new THREE.Box3().setFromObject(wrapper)
      const c = box.getCenter(new THREE.Vector3())
      root.position.add(new THREE.Vector3(-c.x / scale, -box.min.y / scale, -c.z / scale))
      const outer = new THREE.Group()
      outer.add(wrapper)
      ready.set(id, outer)
      return outer
    })()
    p.catch(() => cache.delete(id)) // permite tentar de novo se a rede falhar
    cache.set(id, p)
  }
  return p
}

export type GlbCar = { group: THREE.Group; wheels: THREE.Object3D[] }

const GLASS = /^(?!.*(red|amber|orange|light|lamp|lens)).*(glass|vidrio|window|winsows|vitres)/i
const RED = /(red_glass|red_emis|tail_?light|Glass_-_Red|FUSIONluz|^M_Lights$)/i

export function createGlbCar(id: GlbCarId, base: THREE.Group, paint: THREE.ColorRepresentation, tint: { color: string; opacity: number }): GlbCar {
  const group = base.clone(true)
  const own = new Map<THREE.Material, THREE.Material>()
  const color = new THREE.Color(paint)
  const paintRe = GLB_CARS[id].paint
  group.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    node.castShadow = true
    let mat = own.get(node.material)
    if (!mat) { mat = (node.material as THREE.Material).clone(); own.set(node.material, mat) }
    node.material = mat
    const m = mat as THREE.MeshStandardMaterial
    if (paintRe?.test(m.name)) {
      m.map = null // o atlas de cores do modelo cede lugar à tinta escolhida na garagem
      m.color.copy(color)
      m.envMapIntensity = 1.5
      m.roughness = Math.min(m.roughness, 0.35)
      m.metalness = Math.max(m.metalness, 0.55)
    } else if (GLASS.test(m.name) && !paintRe?.test(m.name)) {
      m.color.set(tint.color); m.transparent = true; m.opacity = tint.opacity; m.envMapIntensity = 2
    } else if (RED.test(m.name) || m.name === 'M_Lights') {
      m.emissive.set('#ff1a14'); m.emissiveIntensity = 1.4
    }
  })
  // Sedan: junta pneu + roda de cada lado num pivô para girar; o Cutlass traz as quatro rodas numa só malha.
  const wheels: THREE.Object3D[] = []
  group.updateMatrixWorld(true)
  const parts: THREE.Object3D[] = []
  group.traverse(n => { if (/^generic-(tire-low|wheel)/.test(n.name)) parts.push(n) })
  const buckets = new Map<string, THREE.Object3D[]>()
  for (const p of parts) {
    const c = new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3())
    const key = `${c.x > 0 ? 'R' : 'L'}${c.z > 0 ? 'F' : 'B'}`
    buckets.set(key, [...(buckets.get(key) ?? []), p])
  }
  for (const [key, list] of buckets) {
    const box = new THREE.Box3()
    for (const p of list) box.expandByObject(p)
    const center = box.getCenter(new THREE.Vector3())
    const pivot = new THREE.Group()
    pivot.name = `glb-wheel-${key}`
    const host = list[0].parent ?? group
    host.worldToLocal(center)
    pivot.position.copy(center)
    host.add(pivot)
    for (const p of list) pivot.attach(p)
    wheels.push(pivot)
  }
  return { group, wheels }
}
