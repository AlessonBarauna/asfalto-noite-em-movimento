import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

export const SUPERCAR = { id: 'supercar', label: 'Concept GT (Khronos)', length: 4.36, width: 2.2 } as const

const URL = `${import.meta.env.BASE_URL}models/supercar.glb`
let template: Promise<THREE.Group> | undefined
let loaded: THREE.Group | undefined

/** Synchronous access once `preloadSupercar()` has resolved (undefined before that). */
export function loadedSupercar(): THREE.Group | undefined {
  return loaded
}

/** Loads and caches the glTF once (meshopt-compressed, ~2 MB). Resolves to a template that is never rendered itself. */
export function preloadSupercar(): Promise<THREE.Group> {
  template ??= (async () => {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    const gltf = await loader.loadAsync(URL)
    const root = gltf.scene
    // Recentre on the wheelbase so the car sits where the procedural cars do (+Z is the nose).
    const box = new THREE.Box3().setFromObject(root)
    root.position.z -= (box.min.z + box.max.z) / 2
    const wrapper = new THREE.Group()
    wrapper.add(root)
    wrapper.scale.setScalar(0.85) // closer to the lane width and hitbox the other cars use
    loaded = wrapper
    return wrapper
  })()
  return template
}

export type Supercar = { group: THREE.Group; wheels: THREE.Object3D[] }

/** Instances the car with its own paint materials so garage colours never leak between instances. */
export function createSupercar(base: THREE.Group, paint: THREE.ColorRepresentation): Supercar {
  const group = base.clone(true)
  group.name = 'supercar'
  const cloned = new Map<THREE.Material, THREE.Material>()
  const own = (m: THREE.Material): THREE.Material => {
    let c = cloned.get(m)
    if (!c) { c = m.clone(); cloned.set(m, c) }
    return c
  }
  const color = new THREE.Color(paint)
  group.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return
    // Parts nobody sees from the chase camera cost triangles for nothing.
    if (/^(BodyWindshieldWipers|BodyWindshieldWipersBase|Engine|BodyHoodInterior0[12]|BodyHoodUnder)$/.test(node.name)) { node.visible = false; return }
    node.castShadow = true
    node.receiveShadow = true
    const mat = own(node.material as THREE.Material) as THREE.MeshStandardMaterial
    node.material = mat
    if (/^Paint 1/.test(mat.name)) { mat.color.copy(color); mat.envMapIntensity = 1.4 }
    else if (/^Paint 2/.test(mat.name)) mat.color.copy(color).multiplyScalar(0.18).offsetHSL(0, 0, 0.02)
    else if (mat.name === 'Headlight') mat.emissiveIntensity = 4
    else if (mat.name === 'Brakelight') mat.emissiveIntensity = 1.6
    else if (mat.name === 'Glass') { mat.envMapIntensity = 2 }
  })
  // Group each wheel's rim, tyre and disc under one pivot so the car can spin them together.
  const wheels: THREE.Object3D[] = []
  const root = group.children[0]
  group.updateMatrixWorld(true) // Box3/worldToLocal read cached matrices; the clone has never been rendered
  for (const key of ['FrontL', 'FrontR', 'RearL', 'RearR']) {
    const rim = root.getObjectByName(`Wheel${key}Rim`)
    const disc = root.getObjectByName(`Wheel${key}BrakeDisc`)
    if (!rim) continue
    const center = new THREE.Box3().setFromObject(rim).getCenter(new THREE.Vector3())
    const pivot = new THREE.Group()
    pivot.name = `supercar-wheel-${key}`
    root.worldToLocal(center)
    pivot.position.copy(center)
    root.add(pivot)
    const tyres = root.children.filter(c => c !== pivot && c.name === '' && c instanceof THREE.Group && new THREE.Box3().setFromObject(c).getCenter(new THREE.Vector3()).distanceTo(center) < 0.2 && c.children.length > 0)
    for (const part of [rim, disc, ...tyres]) if (part) pivot.attach(part)
    wheels.push(pivot)
  }
  return { group, wheels }
}
