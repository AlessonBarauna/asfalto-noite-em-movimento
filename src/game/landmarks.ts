import * as THREE from 'three'

/**
 * Monumentos procedurais (low-poly, iluminados para a noite) que passam ao lado da pista em cada cidade.
 * Cada construtor devolve o grupo ancorado no chão (y = 0) e a meia-largura, para afastá-lo da pista.
 */
export type Piece = { group: THREE.Group; half: number }

export type LandmarkMats = {
  stone: THREE.Material
  stoneDark: THREE.Material
  white: THREE.Material
  metal: THREE.Material
  glass: THREE.Material
  gold: THREE.Material
  roof: THREE.Material
  brick: THREE.Material
  red: THREE.Material
  sand: THREE.Material
  water: THREE.Material
  leaf: THREE.Material
  rock: THREE.Material
  snow: THREE.Material
  tower: THREE.Material
  towerBlue: THREE.Material
}

const lit = (color: string, emissive: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1, roughness: 0.85, flatShading: true, ...extra })

/** Textura de janelas acesas para arranha-céus (só existe no navegador). */
function windowTexture(lit: string, dark: string, seed: number): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 96
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = dark
  ctx.fillRect(0, 0, 64, 96)
  let state = seed
  const rnd = () => { state = (state * 1664525 + 1013904223) % 4294967296; return state / 4294967296 }
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      ctx.fillStyle = rnd() > 0.42 ? lit : '#1c2330'
      ctx.fillRect(col * 16 + 3, row * 16 + 3, 10, 10)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Parede de pedra com juntas e janelas estreitas (algumas acesas): quebra o branco chapado dos monumentos. */
let wallMap: THREE.Texture | null = null
function wallTexture(): THREE.Texture {
  if (wallMap) return wallMap
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#d9d9d9'
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = '#9d9d9d'
  for (let i = 0; i < 4; i += 1) { ctx.fillRect(0, i * 16, 64, 1); ctx.fillRect(((i % 2) * 16 + i * 8) % 64, i * 16, 1, 16); ctx.fillRect(((i % 2) * 16 + 40) % 64, i * 16, 1, 16) }
  const lit = [true, false, true, true]
  for (let i = 0; i < 2; i += 1) {
    ctx.fillStyle = lit[i] ? '#fff0c4' : '#454b57'
    ctx.fillRect(14 + i * 28, 14, 8, 30)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  wallMap = tex
  return tex
}

const wall = (color: string, emissive: string) => {
  const map = wallTexture()
  return new THREE.MeshStandardMaterial({ color, map, emissive, emissiveMap: map, emissiveIntensity: 0.9, roughness: 0.85, flatShading: true })
}

const towerMat = (lit: string, dark: string, seed: number) => {
  const map = windowTexture(lit, dark, seed)
  return new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.7 })
}

export function landmarkMaterials(): LandmarkMats {
  return {
    tower: towerMat('#ffd58a', '#3a342c', 7),
    towerBlue: towerMat('#bfe6ff', '#1b3550', 19),
    stone: wall('#cfc4ad', '#5a4f3c'),
    stoneDark: wall('#8f877a', '#4a443a'),
    white: wall('#e8e4da', '#6a675f'),
    metal: lit('#6d7a86', '#1c2630', { metalness: 0.5, roughness: 0.5 }),
    glass: lit('#7fb4d8', '#1d4666', { metalness: 0.3, roughness: 0.25 }),
    gold: lit('#e2b64a', '#6a4a10', { metalness: 0.6, roughness: 0.4 }),
    roof: lit('#4f8f7c', '#12342b'),
    brick: wall('#b35a3e', '#7a3a26'),
    red: lit('#d6453a', '#521510'),
    sand: wall('#d9b779', '#7a5f30'),
    water: lit('#9fd8ff', '#2a6a9a', { transparent: true, opacity: 0.8 }),
    leaf: lit('#3f8a4d', '#10301a'),
    rock: lit('#6a665e', '#1e1c18'),
    snow: lit('#e6eef5', '#44505c'),
  }
}

const geos: THREE.BufferGeometry[] = []
const track = <T extends THREE.BufferGeometry>(geo: T): T => { geos.push(geo); return geo }

/** Libera as geometrias criadas pelos monumentos (chamado ao trocar de cidade). */
export function disposeLandmarkGeometry(): void {
  while (geos.length) geos.pop()?.dispose()
}

type Add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => THREE.Mesh

function kit(): { group: THREE.Group; add: Add; strut: (a: readonly [number, number, number], b: readonly [number, number, number], r: number, mat: THREE.Material) => void } {
  const group = new THREE.Group()
  const add: Add = (geo, mat, x, y, z) => {
    const mesh = new THREE.Mesh(track(geo), mat)
    mesh.position.set(x, y, z)
    group.add(mesh)
    return mesh
  }
  const strut = (a: readonly [number, number, number], b: readonly [number, number, number], r: number, mat: THREE.Material) => {
    const from = new THREE.Vector3(...a)
    const to = new THREE.Vector3(...b)
    const mesh = new THREE.Mesh(track(new THREE.CylinderGeometry(r, r, from.distanceTo(to), 5)), mat)
    mesh.position.copy(from).add(to).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize())
    group.add(mesh)
  }
  return { group, add, strut }
}

const tiledBox = (w: number, h: number, d: number, tileW: number, tileH: number): THREE.BoxGeometry => {
  const geo = new THREE.BoxGeometry(w, h, d)
  const uv = geo.attributes.uv as THREE.BufferAttribute
  const spans: Array<[number, number]> = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  spans.forEach(([sw, sh], face) => {
    for (let v = 0; v < 4; v += 1) { const i = face * 4 + v; uv.setXY(i, uv.getX(i) * (sw / tileW), uv.getY(i) * (sh / tileH)) }
  })
  return geo
}
const box = (add: Add, w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => add(tiledBox(w, h, d, 9, 9), mat, x, y + h / 2, z)
/** Caixa com UVs proporcionais ao tamanho: as janelas mantêm o tamanho real em qualquer andar. */
const towerBox = (add: Add, w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const geo = new THREE.BoxGeometry(w, h, d)
  const uv = geo.attributes.uv as THREE.BufferAttribute
  const spans: Array<[number, number]> = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  spans.forEach(([sw, sh], face) => {
    for (let v = 0; v < 4; v += 1) { const i = face * 4 + v; uv.setXY(i, uv.getX(i) * (sw / 8), uv.getY(i) * (sh / 12)) }
  })
  return add(geo, mat, x, y + h / 2, z)
}
const cyl = (add: Add, rt: number, rb: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 12) => add(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y + h / 2, z)
const cone = (add: Add, r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 8) => add(new THREE.ConeGeometry(r, h, seg), mat, x, y + h / 2, z)
const dome = (add: Add, r: number, mat: THREE.Material, x = 0, y = 0, z = 0) => add(new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat, x, y, z)
const ball = (add: Add, r: number, mat: THREE.Material, x = 0, y = 0, z = 0) => add(new THREE.SphereGeometry(r, 12, 10), mat, x, y, z)

const done = (group: THREE.Group, half: number): Piece => ({ group, half })

type Builder = (m: LandmarkMats) => Piece

/** Torre de treliça: quatro pernas que se fecham, plataformas e agulha (Eiffel, Torre de Tóquio). */
function lattice(_m: LandmarkMats, h: number, base: number, mat: THREE.Material): Piece {
  const { group, add, strut } = kit()
  const corners: Array<[number, number]> = [[1, 1], [-1, 1], [-1, -1], [1, -1]]
  const level = (t: number, k: number): [number, number, number][] => corners.map(([sx, sz]) => [sx * k, h * t, sz * k])
  const rings = [level(0, base), level(0.27, base * 0.42), level(0.58, base * 0.16), level(0.82, 1.4)]
  for (let r = 0; r < rings.length - 1; r += 1) {
    const w = [2.2, 1.6, 1.1][r]
    for (let c = 0; c < 4; c += 1) {
      strut(rings[r][c], rings[r + 1][c], w, mat)
      strut(rings[r][c], rings[r + 1][(c + 1) % 4], w * 0.35, mat)
    }
  }
  // arcos entre as pernas na base e plataformas
  for (let c = 0; c < 4; c += 1) strut([rings[0][c][0] * 0.62, h * 0.13, rings[0][c][2] * 0.62], [rings[0][(c + 1) % 4][0] * 0.62, h * 0.13, rings[0][(c + 1) % 4][2] * 0.62], 1.3, mat)
  box(add, base * 0.92, 2, base * 0.92, mat, 0, h * 0.27)
  box(add, base * 0.36, 1.6, base * 0.36, mat, 0, h * 0.58)
  box(add, 4.2, 4, 4.2, mat, 0, h * 0.82)
  cone(add, 1.1, h * 0.2, mat, 0, h * 0.86, 0, 6)
  return done(group, base)
}

/** Torre de TV com cabine(s) esférica(s) (CN Tower, Pérola do Oriente, Skytree...). */
function needle(_m: LandmarkMats, h: number, pods: number[], mat: THREE.Material, podMat: THREE.Material, podR = 5): Piece {
  const { group, add } = kit()
  cyl(add, 1.1, 3.4, h, mat, 0, 0, 0, 10)
  for (const t of pods) ball(add, podR * (1.2 - t * 0.5), podMat, 0, h * t, 0)
  cyl(add, 0.1, 0.5, h * 0.2, mat, 0, h, 0, 6)
  return done(group, 5)
}

/** Arranha-céu escalonado (Burj Khalifa, 101, Empire State). */
function stepped(m: LandmarkMats, tiers: Array<[number, number]>, w: number, mat: THREE.Material, spire = 14): Piece {
  const { group, add } = kit()
  let y = 0
  for (const [tw, th] of tiers) { towerBox(add, w * tw, th, w * tw, mat, 0, y); y += th }
  cyl(add, 0.1, 0.9, spire, m.metal, 0, y, 0, 6)
  return done(group, w / 2)
}

function gothic(m: LandmarkMats, spires = 2, h = 46, mat: THREE.Material = m.stone): Piece {
  const { group, add } = kit()
  box(add, 22, h * 0.45, 16, mat, 0, 0, 0)
  const step = 14 / Math.max(1, spires - 1)
  for (let i = 0; i < spires; i += 1) {
    const x = spires === 1 ? 0 : -7 + i * step
    box(add, 4, h * 0.7, 4, mat, x, 0, 6)
    cone(add, 2.9, h * 0.38, mat, x, h * 0.7, 6, 4).rotation.y = Math.PI / 4
  }
  cone(add, 2.2, h * 0.5, mat, 0, h * 0.45, -1, 4).rotation.y = Math.PI / 4
  return done(group, 12)
}

function domeChurch(m: LandmarkMats, r = 10, mat: THREE.Material = m.stone, cap: THREE.Material = m.roof): Piece {
  const { group, add } = kit()
  box(add, r * 2.6, r * 0.9, r * 1.8, mat, 0, 0, 0)
  cyl(add, r * 0.9, r * 0.9, r * 0.8, mat, 0, r * 0.9, 0, 18)
  dome(add, r, cap, 0, r * 1.7, 0)
  cyl(add, 0.2, 0.5, r * 0.6, m.gold, 0, r * 2.7, 0, 6)
  for (const x of [-r * 1.3, r * 1.3]) { box(add, r * 0.5, r * 2, r * 0.5, mat, x, 0, r * 0.8); cone(add, r * 0.4, r * 0.7, cap, x, r * 2, r * 0.8, 4) }
  return done(group, r * 1.4)
}

function hyperboloid(m: LandmarkMats): Piece {
  const { group, add } = kit()
  cyl(add, 14, 15, 1.2, m.white, 0, 0, 0, 20)
  const crown = add(new THREE.CylinderGeometry(9, 14, 13, 16, 1, true), m.glass, 0, 6.5 + 1.2, 0)
  ;(crown.material as THREE.Material).side = THREE.DoubleSide
  const top = add(new THREE.CylinderGeometry(14, 9, 13, 16, 1, true), m.glass, 0, 19.7, 0)
  ;(top.material as THREE.Material).side = THREE.DoubleSide
  for (let i = 0; i < 16; i += 1) { const a = (i / 16) * Math.PI * 2; box(add, 0.8, 26, 0.8, m.white, Math.cos(a) * 11.5, 0, Math.sin(a) * 11.5) }
  cyl(add, 0.3, 0.3, 8, m.white, 0, 26, 0, 6)
  return done(group, 16)
}

function mountain(m: LandmarkMats, kind: 'sugar' | 'table' | 'volcano' | 'alps' | 'ridge'): Piece {
  const { group, add } = kit()
  if (kind === 'sugar') {
    add(new THREE.SphereGeometry(38, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.rock, 0, 0, 0).scale.set(1, 1.5, 0.9)
    add(new THREE.SphereGeometry(22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.rock, -52, 0, -6).scale.set(1, 1.1, 1)
    cone(add, 3, 12, m.red, -52, 24, -6, 4)
  } else if (kind === 'table') {
    cyl(add, 52, 78, 56, m.rock, 0, 0, 0, 9)
    cyl(add, 54, 54, 2.5, m.stoneDark, 0, 56, 0, 9)
  } else if (kind === 'volcano') {
    cone(add, 62, 82, m.rock, 0, 0, 0, 9)
    cone(add, 17, 21, m.snow, 0, 61, 0, 9)
  } else if (kind === 'alps') {
    for (const [x, s] of [[-46, 0.85], [0, 1.2], [52, 0.95]] as const) { cone(add, 40 * s, 92 * s, m.rock, x, 0, 0, 6); cone(add, 14 * s, 30 * s, m.snow, x, 62 * s, 0, 6) }
  } else {
    for (const [x, s] of [[-40, 0.8], [0, 1.1], [44, 0.9]] as const) cone(add, 38 * s, 60 * s, m.rock, x, 0, 0, 7)
  }
  return done(group, 70)
}

function arch(_m: LandmarkMats, w: number, h: number, depth: number, mat: THREE.Material, columns = 0): Piece {
  const { group, add } = kit()
  const leg = (w - Math.min(w * 0.45, 14)) / 2
  for (const s of [-1, 1]) box(add, leg, h, depth, mat, s * (w - leg) / 2, 0, 0)
  box(add, w, h * 0.22, depth, mat, 0, h * 0.78, 0)
  if (columns) for (let i = 0; i < columns; i += 1) cyl(add, 1, 1, h * 0.62, mat, -w * 0.4 + (i * w * 0.8) / (columns - 1), 0, depth * 0.5 + 1, 8)
  return done(group, w / 2)
}

function suspension(m: LandmarkMats, towerH: number, span: number, mat: THREE.Material): Piece {
  const { group, add } = kit()
  for (const s of [-1, 1]) {
    box(add, 3, towerH, 3, mat, s * span / 2, 0, 0)
    box(add, 3.4, 3.4, 11, mat, s * span / 2, towerH * 0.62, 0)
  }
  box(add, span * 1.6, 1.4, 9, m.stoneDark, 0, towerH * 0.3, 0)
  const cable = (sign: number) => {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-span / 2, towerH, sign * 4), new THREE.Vector3(0, towerH * 0.2, sign * 4), new THREE.Vector3(span / 2, towerH, sign * 4))
    add(new THREE.TubeGeometry(curve, 24, 0.5, 4), mat, 0, 0, 0)
  }
  cable(-1); cable(1)
  return done(group, span * 0.8)
}

function pagoda(m: LandmarkMats, tiers = 5, mat: THREE.Material = m.red): Piece {
  const { group, add } = kit()
  let y = 0
  for (let i = 0; i < tiers; i += 1) {
    const s = 1 - i * 0.14
    box(add, 9 * s, 3.4, 9 * s, mat, 0, y)
    cone(add, 8 * s, 3.2, m.roof, 0, y + 3.4, 0, 4).rotation.y = Math.PI / 4
    y += 6
  }
  cyl(add, 0.15, 0.4, 7, m.gold, 0, y, 0, 6)
  return done(group, 6)
}

function mosque(m: LandmarkMats, minaretH = 52, mat: THREE.Material = m.stone): Piece {
  const { group, add } = kit()
  box(add, 26, 9, 24, mat, 0, 0, 0)
  dome(add, 12, m.roof, 0, 9, 0)
  for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) dome(add, 4, m.roof, x * 1.05, 9, z * 1.05)
  for (const x of [-17, 17]) { cyl(add, 1.1, 1.5, minaretH, mat, x, 0, 10, 10); cyl(add, 1.9, 1.9, 1.2, mat, x, minaretH * 0.78, 10, 10); cone(add, 1.6, 7, m.roof, x, minaretH, 10, 8) }
  return done(group, 20)
}

function pyramid(m: LandmarkMats, h = 60, steps = false): Piece {
  const { group, add } = kit()
  if (steps) {
    for (let i = 0; i < 7; i += 1) box(add, 54 - i * 7, 6, 54 - i * 7, m.stone, 0, i * 6)
    box(add, 10, 6, 10, m.stoneDark, 0, 42)
  } else {
    cone(add, h * 0.9, h, m.sand, 0, 0, 0, 4).rotation.y = Math.PI / 4
    cone(add, h * 0.5, h * 0.55, m.sand, -h * 1.3, 0, -h * 0.4, 4).rotation.y = Math.PI / 4
  }
  return done(group, h)
}

function castle(m: LandmarkMats, mat: THREE.Material = m.stone): Piece {
  const { group, add } = kit()
  add(new THREE.CylinderGeometry(30, 44, 22, 8), m.rock, 0, 11, 0)
  box(add, 34, 12, 14, mat, 0, 22, 0)
  for (const x of [-15, 0, 15]) { cyl(add, 3, 3.4, 22, mat, x, 22, 2, 8); cone(add, 4, 9, m.roof, x, 44, 2, 8) }
  return done(group, 40)
}

function colonial(m: LandmarkMats, mat: THREE.Material = m.white, roof: THREE.Material = m.brick): Piece {
  const { group, add } = kit()
  box(add, 18, 12, 14, mat, 0, 0, 0)
  box(add, 18, 3, 14, roof, 0, 12, 0)
  for (const x of [-6, 6]) { box(add, 4, 22, 4, mat, x, 0, 6); cone(add, 3.2, 6, roof, x, 22, 6, 4).rotation.y = Math.PI / 4 }
  dome(add, 5, roof, 0, 12, -1)
  return done(group, 12)
}

function campanile(m: LandmarkMats, h = 60, mat: THREE.Material = m.brick): Piece {
  const { group, add } = kit()
  box(add, 8, h, 8, mat, 0, 0, 0)
  box(add, 9, 7, 9, m.stone, 0, h)
  cone(add, 6.5, 14, m.roof, 0, h + 7, 0, 4).rotation.y = Math.PI / 4
  return done(group, 8)
}

function windmill(m: LandmarkMats): Piece {
  const { group, add } = kit()
  cone(add, 8, 30, m.brick, 0, 0, 0, 8)
  const hub = new THREE.Group()
  hub.position.set(0, 24, 8)
  group.add(hub)
  for (let i = 0; i < 4; i += 1) {
    const blade = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 22, 0.4)), m.white)
    blade.position.y = 11
    const arm = new THREE.Group()
    arm.rotation.z = (i * Math.PI) / 2 + 0.4
    arm.add(blade)
    hub.add(arm)
  }
  return done(group, 24)
}

function palmResort(m: LandmarkMats): Piece {
  const { group, add } = kit()
  box(add, 30, 40, 12, m.white, 0, 0, 0)
  box(add, 30.5, 1.6, 12.5, m.glass, 0, 14)
  box(add, 30.5, 1.6, 12.5, m.glass, 0, 28)
  for (const [x, z, s] of [[-24, 8, 1], [-30, 2, 0.8], [26, 9, 1.1], [32, 3, 0.9]] as const) {
    cyl(add, 0.35 * s, 0.6 * s, 14 * s, m.sand, x, 0, z, 6)
    add(new THREE.SphereGeometry(5.2 * s, 10, 6), m.leaf, x, 14.5 * s, z).scale.y = 0.38
  }
  return done(group, 36)
}

function eye(m: LandmarkMats, r = 34): Piece {
  const { group, add } = kit()
  const wheel = new THREE.Mesh(track(new THREE.TorusGeometry(r, 0.9, 6, 36)), m.white)
  wheel.position.set(0, r + 6, 0)
  group.add(wheel)
  const hub = new THREE.Mesh(track(new THREE.TorusGeometry(r * 0.5, 0.5, 4, 24)), m.white)
  hub.position.set(0, r + 6, 0)
  group.add(hub)
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2
    ball(add, 1.8, m.glass, Math.cos(a) * r, r + 6 + Math.sin(a) * r, 0)
  }
  for (const s of [-1, 1]) { const leg = box(add, 1.4, r + 10, 1.4, m.metal, s * 7, 0, 0); leg.rotation.z = s * 0.18 }
  return done(group, r)
}

function cristo(m: LandmarkMats): Piece {
  const { group, add } = kit()
  cone(add, 34, 44, m.rock, 0, 0, 0, 7)
  box(add, 7, 9, 7, m.white, 0, 44)
  cyl(add, 1.6, 2.4, 22, m.white, 0, 53, 0, 8)
  box(add, 28, 2.2, 2.2, m.white, 0, 70)
  ball(add, 2.1, m.white, 0, 76, 0)
  return done(group, 36)
}

function statueLiberty(m: LandmarkMats): Piece {
  const { group, add } = kit()
  box(add, 18, 8, 18, m.stoneDark, 0, 0)
  box(add, 11, 22, 11, m.stone, 0, 8)
  cyl(add, 3, 4.6, 26, m.roof, 0, 30, 0, 8)
  ball(add, 2.4, m.roof, 0, 58, 0)
  for (let i = 0; i < 5; i += 1) cone(add, 0.5, 4, m.roof, Math.sin((i / 5) * 3.1 - 1.5) * 2.5, 60.5, Math.cos((i / 5) * 3.1 - 1.5) * 0.4, 4)
  cyl(add, 0.45, 0.45, 12, m.roof, 5.5, 44, 0, 6)
  ball(add, 1.5, m.gold, 5.5, 57, 0)
  return done(group, 10)
}

function sails(m: LandmarkMats): Piece {
  const { group, add } = kit()
  box(add, 54, 6, 28, m.stone, 0, 0)
  for (const [x, s] of [[-14, 1], [4, 1.25], [20, 0.8]] as const) {
    const sail = cone(add, 9 * s, 24 * s, m.white, x, 6, 0, 3)
    sail.scale.z = 1.5
    sail.rotation.y = Math.PI / 6
  }
  return done(group, 30)
}

function clockTower(m: LandmarkMats): Piece {
  const { group, add } = kit()
  box(add, 9, 40, 9, m.stone, 0, 0)
  box(add, 11, 12, 11, m.stone, 0, 40)
  for (const [x, z] of [[0, 5.6], [0, -5.6]] as const) cyl(add, 3.6, 3.6, 0.5, m.white, x, 46, z, 20).rotation.x = Math.PI / 2
  cone(add, 7, 16, m.roof, 0, 52, 0, 4).rotation.y = Math.PI / 4
  box(add, 24, 14, 12, m.stone, -17, 0, 0)
  return done(group, 22)
}

function towerBridge(m: LandmarkMats): Piece {
  const { group, add } = kit()
  for (const s of [-1, 1]) { box(add, 8, 38, 8, m.stone, s * 22, 0, 0); cone(add, 6.4, 12, m.roof, s * 22, 38, 0, 4).rotation.y = Math.PI / 4 }
  box(add, 36, 3, 8, m.metal, 0, 26, 0)
  box(add, 66, 2, 8, m.stoneDark, 0, 10, 0)
  return done(group, 38)
}

function coliseu(m: LandmarkMats): Piece {
  const { group, add } = kit()
  const geo = new THREE.CylinderGeometry(26, 28, 28, 28, 1, true)
  const wall = add(geo, m.stone, 0, 14, 0)
  ;(wall.material as THREE.Material).side = THREE.DoubleSide
  for (let i = 0; i < 28; i += 1) {
    const a = (i / 28) * Math.PI * 2
    for (const y of [5, 13, 21]) box(add, 2, 5, 1.2, m.stoneDark, Math.cos(a) * 27, y, Math.sin(a) * 27).rotation.y = -a + Math.PI / 2
  }
  return done(group, 30)
}

function parthenon(m: LandmarkMats): Piece {
  const { group, add } = kit()
  cone(add, 40, 18, m.rock, 0, 0, 0, 8)
  box(add, 38, 2, 16, m.stone, 0, 18)
  for (let i = 0; i < 9; i += 1) cyl(add, 1, 1.1, 12, m.stone, -16 + i * 4, 20, 6, 10)
  for (let i = 0; i < 9; i += 1) cyl(add, 1, 1.1, 12, m.stone, -16 + i * 4, 20, -6, 10)
  box(add, 38, 2, 16, m.stone, 0, 32)
  cone(add, 21, 6, m.stone, 0, 34, 0, 4).scale.set(1, 1, 0.5)
  return done(group, 40)
}

function torii(m: LandmarkMats): Piece {
  const { group, add } = kit()
  for (const s of [-1, 1]) cyl(add, 1.1, 1.3, 20, m.red, s * 7, 0, 0, 8)
  box(add, 22, 1.8, 2.2, m.red, 0, 18)
  box(add, 18, 1.2, 1.8, m.red, 0, 14.5)
  box(add, 26, 1, 2.8, m.stoneDark, 0, 20)
  return done(group, 13)
}

function prang(m: LandmarkMats): Piece {
  const { group, add } = kit()
  box(add, 16, 8, 16, m.white, 0, 0)
  cone(add, 6.5, 40, m.white, 0, 8, 0, 4).rotation.y = Math.PI / 4
  for (const x of [-9, 9]) for (const z of [-9, 9]) cone(add, 2.4, 16, m.white, x, 0, z, 4)
  return done(group, 14)
}

function atomium(m: LandmarkMats): Piece {
  const { group, add } = kit()
  const top = new THREE.Vector3(0, 70, 0)
  const nodes = [new THREE.Vector3(-16, 50, -16), new THREE.Vector3(16, 50, -16), new THREE.Vector3(-16, 50, 16), new THREE.Vector3(16, 50, 16)]
  const bottom = new THREE.Vector3(0, 22, 0)
  for (const point of [top, bottom, ...nodes]) ball(add, 7, m.metal, point.x, point.y, point.z)
  for (const node of nodes) {
    for (const end of [top, bottom]) {
      const len = node.distanceTo(end)
      const strut = new THREE.Mesh(track(new THREE.CylinderGeometry(0.8, 0.8, len, 6)), m.metal)
      strut.position.copy(node).add(end).multiplyScalar(0.5)
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(node).normalize())
      group.add(strut)
    }
  }
  return done(group, 22)
}

function jet(m: LandmarkMats): Piece {
  const { group, add } = kit()
  box(add, 18, 1.4, 18, m.stoneDark, 0, 0)
  cone(add, 3.2, 90, m.water, 0, 1, 0, 8)
  ball(add, 5, m.water, 0, 90, 0)
  return done(group, 12)
}

function hollywood(m: LandmarkMats): Piece {
  const { group, add } = kit()
  cone(add, 60, 40, m.rock, 0, 0, 0, 7)
  for (let i = 0; i < 9; i += 1) box(add, 3.4, 7, 1, m.white, -17 + i * 4.3, 40)
  return done(group, 40)
}

function spire(m: LandmarkMats): Piece {
  const { group, add } = kit()
  cone(add, 2.4, 110, m.metal, 0, 0, 0, 8)
  return done(group, 4)
}

function marinaBay(m: LandmarkMats): Piece {
  const { group, add } = kit()
  for (const x of [-15, 0, 15]) { const t = box(add, 11, 54, 14, m.glass, x, 0, 0); t.rotation.z = (x / 15) * 0.07 }
  box(add, 52, 3, 18, m.white, 0, 54)
  add(new THREE.CapsuleGeometry(1.4, 24, 4, 8), m.water, -10, 59, 0).rotation.z = Math.PI / 2
  return done(group, 28)
}

function twinTowers(m: LandmarkMats): Piece {
  const { group, add } = kit()
  for (const x of [-13, 13]) { cyl(add, 6, 8, 70, m.metal, x, 0, 0, 8); cyl(add, 4, 6, 34, m.metal, x, 70, 0, 8); cone(add, 1.8, 14, m.metal, x, 104, 0, 6) }
  box(add, 14, 3, 3, m.metal, 0, 46)
  return done(group, 22)
}

function chicago(m: LandmarkMats): Piece {
  const { group, add } = kit()
  for (const [x, z, h] of [[-5, -5, 78], [5, -5, 62], [-5, 5, 48], [5, 5, 78], [0, 0, 92]] as const) towerBox(add, 10, h, 10, m.tower, x, 0, z)
  for (const x of [-4, 6]) cyl(add, 0.3, 0.5, 20, m.metal, x, 92, 0, 6)
  return done(group, 12)
}

function gateIndia(m: LandmarkMats): Piece {
  return arch(m, 26, 40, 8, m.sand)
}

function sphinx(m: LandmarkMats): Piece {
  const { group, add } = kit()
  box(add, 14, 9, 36, m.sand, 0, 0, 0)
  box(add, 8, 8, 8, m.sand, 0, 9, 14)
  ball(add, 4.2, m.sand, 0, 15, 15)
  return done(group, 10)
}

function lighthouse(m: LandmarkMats): Piece {
  const { group, add } = kit()
  cyl(add, 3, 5, 38, m.white, 0, 0, 0, 10)
  cyl(add, 3.6, 3.6, 1.2, m.red, 0, 38, 0, 10)
  cyl(add, 2.4, 2.4, 4, m.gold, 0, 39, 0, 10)
  cone(add, 3.4, 5, m.red, 0, 43, 0, 10)
  return done(group, 8)
}

function bigStatueHill(m: LandmarkMats): Piece {
  const { group, add } = kit()
  cone(add, 28, 36, m.rock, 0, 0, 0, 7)
  cyl(add, 2.2, 3.4, 26, m.white, 0, 36, 0, 8)
  ball(add, 3, m.white, 0, 64, 0)
  add(new THREE.BoxGeometry(10, 0.8, 3.2), m.white, 0, 58, 0)
  return done(group, 30)
}

function tvPod(m: LandmarkMats, h: number): Piece {
  return needle(m, h, [0.7], m.metal, m.red, 6)
}

function stupa(m: LandmarkMats): Piece {
  const { group, add } = kit()
  for (let i = 0; i < 3; i += 1) cyl(add, 15 - i * 3, 17 - i * 3, 3, m.white, 0, i * 3, 0, 14)
  dome(add, 12, m.white, 0, 9, 0)
  cone(add, 2.4, 22, m.gold, 0, 21, 0, 8)
  return done(group, 18)
}

export const LANDMARKS = {
  cristo: (m) => cristo(m),
  'pao-acucar': (m) => mountain(m, 'sugar'),
  'catedral-brasilia': (m) => hyperboloid(m),
  'ponte-estaiada': (m) => suspension(m, 62, 70, m.white),
  eiffel: (m) => lattice(m, 112, 27, m.metal),
  arco: (m) => arch(m, 36, 46, 18, m.stone),
  notre: (m) => gothic(m, 2, 50),
  bigben: (m) => clockTower(m),
  'tower-bridge': (m) => towerBridge(m),
  'roda-gigante': (m) => eye(m, 34),
  coliseu: (m) => coliseu(m),
  parthenon: (m) => parthenon(m),
  piramide: (m) => pyramid(m, 64),
  'piramide-degraus': (m) => pyramid(m, 48, true),
  esfinge: (m) => sphinx(m),
  'opera-sydney': (m) => sails(m),
  'ponte-arco': (m) => { const p = suspension(m, 40, 56, m.metal); return p },
  'ponte-golden': (m) => suspension(m, 78, 90, m.red),
  'ponte-pensil': (m) => suspension(m, 44, 60, m.stone),
  liberdade: (m) => statueLiberty(m),
  empire: (m) => stepped(m, [[1, 36], [0.8, 18], [0.6, 16], [0.4, 14], [0.22, 10]], 22, m.tower, 22),
  hollywood: (m) => hollywood(m),
  burj: (m) => stepped(m, [[1, 30], [0.82, 26], [0.66, 24], [0.5, 22], [0.34, 20], [0.2, 16]], 20, m.towerBlue, 30),
  taipei: (m) => stepped(m, [[1, 14], [0.9, 12], [1, 12], [0.9, 12], [1, 12], [0.9, 12], [0.7, 14], [0.4, 14]], 18, m.towerBlue, 22),
  petronas: (m) => twinTowers(m),
  'marina-bay': (m) => marinaBay(m),
  'torre-oriental': (m) => needle(m, 110, [0.3, 0.68], m.white, m.red, 8),
  skytree: (m) => needle(m, 130, [0.55, 0.8], m.white, m.glass, 4),
  'torre-tv': (m) => tvPod(m, 100),
  'torre-cn': (m) => needle(m, 128, [0.62], m.stone, m.stone, 7),
  'space-needle': (m) => needle(m, 84, [0.82], m.white, m.white, 9),
  torii: (m) => torii(m),
  pagode: (m) => pagoda(m, 5),
  'pagode-azul': (m) => pagoda(m, 3, m.stoneDark),
  prang: (m) => prang(m),
  mesquita: (m) => mosque(m, 52),
  'mesquita-alta': (m) => mosque(m, 74, m.white),
  cupula: (m) => domeChurch(m, 10),
  'cupula-dourada': (m) => domeChurch(m, 9, m.white, m.gold),
  gotica: (m) => gothic(m, 2, 52),
  sagrada: (m) => gothic(m, 5, 70, m.sand),
  catedral: (m) => gothic(m, 3, 44, m.stoneDark),
  campanile: (m) => campanile(m, 60),
  'campanile-vermelho': (m) => campanile(m, 46, m.red),
  castelo: (m) => castle(m),
  'castelo-ardosia': (m) => castle(m, m.stoneDark),
  moinho: (m) => windmill(m),
  atomium: (m) => atomium(m),
  jet: (m) => jet(m),
  brandemburgo: (m) => arch(m, 40, 26, 10, m.sand, 6),
  'portao-india': (m) => gateIndia(m),
  'portao-mar': (m) => arch(m, 30, 34, 10, m.sand),
  colonial: (m) => colonial(m),
  'colonial-colorido': (m) => colonial(m, m.sand, m.red),
  'mesa-montanha': (m) => mountain(m, 'table'),
  vulcao: (m) => mountain(m, 'volcano'),
  alpes: (m) => mountain(m, 'alps'),
  serrania: (m) => mountain(m, 'ridge'),
  resort: (m) => palmResort(m),
  farol: (m) => lighthouse(m),
  agulha: (m) => spire(m),
  'estatua-colina': (m) => bigStatueHill(m),
  estupa: (m) => stupa(m),
  'torre-toquio': (m) => lattice(m, 92, 26, m.red),
  chicago: (m) => chicago(m),
} satisfies Record<string, Builder>

export type LandmarkId = keyof typeof LANDMARKS

export const LANDMARK_IDS = Object.keys(LANDMARKS) as LandmarkId[]

export function buildLandmark(id: LandmarkId, mats: LandmarkMats): Piece {
  const piece = LANDMARKS[id](mats)
  piece.group.traverse(obj => { if (obj instanceof THREE.Mesh) obj.castShadow = false })
  return piece
}

/** Monumentos pequenos ganham escala para ficarem à altura de um cartão-postal. */
export const LANDMARK_SCALE: Partial<Record<LandmarkId, number>> = {
  torii: 2.4, pagode: 1.9, 'pagode-azul': 2.3, colonial: 2.1, 'colonial-colorido': 2.1, cupula: 1.8, 'cupula-dourada': 1.9,
  'catedral-brasilia': 2.2, mesquita: 1.7, gotica: 1.5, catedral: 1.6, campanile: 1.4, 'campanile-vermelho': 1.5, castelo: 1.6,
  'castelo-ardosia': 1.6, moinho: 2.1, esfinge: 2.8, 'portao-india': 1.7, 'portao-mar': 1.8, brandemburgo: 1.5, farol: 1.7,
  estupa: 1.7, parthenon: 1.35, 'opera-sydney': 1.35, liberdade: 1.5, arco: 1.3, 'estatua-colina': 1.2, prang: 1.7, resort: 1.3,
  bigben: 1.3, 'tower-bridge': 1.3, notre: 1.5, coliseu: 1.35, 'ponte-pensil': 1.2, 'ponte-arco': 1.4, jet: 1, chicago: 1.2,
}
