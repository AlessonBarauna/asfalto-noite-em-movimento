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
  lamp: THREE.Material
  pastel: THREE.Material[]
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
    lamp: lit('#fff0c0', '#ffc860', { emissiveIntensity: 1.6 }),
    pastel: [['#e8b04a', '#7a5a1a'], ['#d9604a', '#6a2418'], ['#5aa6c9', '#1c4a66'], ['#8fc47a', '#2e5a22'], ['#e58fb0', '#6e2a45'], ['#f0e0a0', '#6a5e2a']].map(([c, e]) => wall(c, e)),
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

/** Prisma triangular (telhado de duas águas): largura w, altura h, comprimento d ao longo de z. */
const prism = (add: Add, w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const shape = new THREE.Shape()
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, h); shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false })
  geo.translate(0, 0, -d / 2)
  return add(geo, mat, x, y, z)
}
/** Fileira de janelas acesas coladas numa parede. */
const litWindows = (add: Add, m: LandmarkMats, xs: number[], ys: number[], z: number, w = 1.1, h = 2.2) => {
  for (const x of xs) for (const y of ys) add(new THREE.BoxGeometry(w, h, 0.25), m.lamp, x, y, z)
}
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
  const w = 24
  box(add, w, h * 0.42, 18, mat, 0, 0, 0)
  box(add, w, 2, 19, m.stoneDark, 0, h * 0.4)
  cyl(add, 3.6, 3.6, 0.8, m.glass, 0, h * 0.26, 9.2, 20).rotation.x = Math.PI / 2
  for (const x of [-7, 0, 7]) box(add, 4, 8, 1, m.stoneDark, x, 0, 9.2)
  const step = (w - 7) / Math.max(1, spires - 1)
  for (let i = 0; i < spires; i += 1) {
    const x = spires === 1 ? 0 : -(w - 7) / 2 + i * step
    const th = spires > 2 ? h * (0.7 + (i % 2) * 0.2) : h * 0.7
    box(add, 5.4, th, 5.4, mat, x, 0, 6)
    box(add, 1.2, 9, 0.8, m.stoneDark, x, th * 0.58, 8.8)
    cone(add, 3.6, h * 0.34, spires > 2 ? m.gold : m.roof, x, th, 6, 4).rotation.y = Math.PI / 4
  }
  cone(add, 2.2, h * 0.5, mat, 0, h * 0.42, -2, 4).rotation.y = Math.PI / 4
  for (const s2 of [-1, 1]) { const fly = box(add, 1, h * 0.3, 1, mat, s2 * (w / 2 + 3), 0, -3); fly.rotation.z = s2 * 0.5 }
  return done(group, w / 2 + 4)
}

function domeChurch(m: LandmarkMats, r = 10, mat: THREE.Material = m.stone, cap: THREE.Material = m.roof): Piece {
  const { group, add } = kit()
  box(add, r * 2.6, r * 0.9, r * 1.8, mat, 0, 0, 0)
  // escadaria + colunata de entrada
  for (let i = 0; i < 3; i += 1) box(add, r * 1.6 + i, 0.5, 1.4, m.stone, 0, i * 0.5, r * 0.9 + 2.2 - i * 0.7)
  for (let i = 0; i < 6; i += 1) cyl(add, 0.32, 0.36, r * 0.8, m.white, (i - 2.5) * (r * 0.28), r * 0.9 * 0.12, r * 0.9 + 0.8, 8)
  prism(add, r * 1.7, r * 0.45, 1.6, mat, 0, r * 0.9, r * 0.9 + 0.8)
  // tambor com janelas acesas e cúpula com lanterna
  cyl(add, r * 0.9, r * 0.9, r * 0.8, mat, 0, r * 0.9, 0, 18)
  for (let i = 0; i < 10; i += 1) { const a = (i / 10) * Math.PI * 2; add(new THREE.BoxGeometry(0.9, r * 0.38, 0.3), m.lamp, Math.cos(a) * r * 0.91, r * 1.3, Math.sin(a) * r * 0.91).rotation.y = -a + Math.PI / 2 }
  cyl(add, r * 0.95, r * 0.95, 0.5, m.stone, 0, r * 1.7, 0, 18)
  dome(add, r, cap, 0, r * 1.75, 0)
  cyl(add, r * 0.16, r * 0.16, r * 0.3, m.lamp, 0, r * 2.7, 0, 8)
  dome(add, r * 0.2, cap, 0, r * 3.0, 0)
  cyl(add, 0.12, 0.12, r * 0.5, m.gold, 0, r * 3.2, 0, 4)
  box(add, 1.6, 0.2, 0.2, m.gold, 0, r * 3.55, 0)
  for (const x of [-r * 1.3, r * 1.3]) {
    box(add, r * 0.5, r * 2, r * 0.5, mat, x, 0, r * 0.8)
    add(new THREE.BoxGeometry(r * 0.2, r * 0.5, 0.2), m.lamp, x, r * 1.4, r * 0.8 + r * 0.26)
    cone(add, r * 0.4, r * 0.7, cap, x, r * 2, r * 0.8, 4)
  }
  litWindows(add, m, [-r * 0.7, r * 0.7], [r * 0.45], r * 0.91, 1.2, 2.6)
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

function triomphe(m: LandmarkMats): Piece {
  const { group, add } = kit()
  for (const s2 of [-1, 1]) box(add, 14, 38, 22, m.stone, s2 * 11.5, 0, 0)
  box(add, 37, 8, 22, m.stone, 0, 28)
  box(add, 39, 3, 24, m.stoneDark, 0, 36)
  box(add, 39, 5, 24, m.stone, 0, 39)
  for (let i = 0; i < 12; i += 1) box(add, 2, 3.4, 0.6, m.stoneDark, -16.5 + i * 3, 39.8, 12.2)
  box(add, 10, 22, 0.8, m.stoneDark, 0, 0, 11.2)
  for (const s2 of [-1, 1]) box(add, 5, 12, 1.2, m.white, s2 * 11.5, 16, 11.3)
  return done(group, 20)
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
  const { group, add, strut } = kit()
  const deckY = towerH * 0.3
  for (const s2 of [-1, 1]) {
    const x = (s2 * span) / 2
    // torre art déco: duas pernas com travessas em X
    for (const z of [-3.6, 3.6]) box(add, 2.4, towerH, 2.4, mat, x, 0, z)
    for (const t of [0.35, 0.55, 0.75, 0.95]) box(add, 2.2, 1.6, 9.6, mat, x, towerH * t - 1.6, 0)
    strut([x, towerH * 0.38, -3.6], [x, towerH * 0.55, 3.6], 0.5, mat)
    strut([x, towerH * 0.38, 3.6], [x, towerH * 0.55, -3.6], 0.5, mat)
    strut([x, towerH * 0.58, -3.6], [x, towerH * 0.75, 3.6], 0.5, mat)
    strut([x, towerH * 0.58, 3.6], [x, towerH * 0.75, -3.6], 0.5, mat)
  }
  box(add, span * 1.7, 1.6, 10, m.stoneDark, 0, deckY, 0)
  const pts = (zz: number) => { const out: THREE.Vector3[] = []; for (let i = 0; i <= 28; i += 1) { const t = i / 28; const x = -span / 2 + t * span; out.push(new THREE.Vector3(x, towerH * 0.97 - Math.sin(t * Math.PI) * (towerH * 0.97 - deckY - 3), zz)) } return out }
  for (const zz of [-5, 5]) {
    const line = pts(zz)
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line), 40, 0.6, 5), mat, 0, 0, 0)
    for (let i = 1; i < line.length - 1; i += 1) strut([line[i].x, deckY + 1, zz], [line[i].x, line[i].y, zz], 0.12, mat)
  }
  for (const s2 of [-1, 1]) { const side = s2 * span; box(add, span * 0.4, 1.4, 8, m.stoneDark, side * 0.85, deckY, 0) }
  return done(group, span * 0.9)
}

function burj(m: LandmarkMats): Piece {
  const { group, add } = kit()
  const tiers = 8
  for (let t = 0; t < tiers; t += 1) {
    const size = 11 - t * 1.15
    for (let k = 0; k < 3; k += 1) {
      const a = (k / 3) * Math.PI * 2 + t * 0.35
      const r = 5 - t * 0.4
      towerBox(add, size * 0.7, 17, size * 0.7, m.towerBlue, Math.cos(a) * r, t * 17, Math.sin(a) * r)
    }
  }
  const top = tiers * 17
  cyl(add, 1.4, 2.4, 30, m.towerBlue, 0, top, 0, 8)
  cyl(add, 0.1, 0.6, 26, m.metal, 0, top + 30, 0, 6)
  return done(group, 14)
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
  // pátio com arcadas acesas na frente
  for (let i = 0; i < 7; i += 1) { box(add, 1, 6, 1, m.white, -9 + i * 3, 0, 14); if (i < 6) add(new THREE.BoxGeometry(2, 4, 0.2), m.lamp, -7.5 + i * 3, 3, 13.1) }
  box(add, 21, 1, 3.4, m.white, 0, 6, 13.2)
  litWindows(add, m, [-9, -4.5, 0, 4.5, 9], [4], 12.1, 1.2, 3.2)
  // cúpula principal sobre tambor com janelas, meias-cúpulas e cúpulas menores
  cyl(add, 10.5, 10.5, 2.6, mat, 0, 9, 0, 20)
  for (let i = 0; i < 12; i += 1) { const a = (i / 12) * Math.PI * 2; add(new THREE.BoxGeometry(0.9, 1.6, 0.3), m.lamp, Math.cos(a) * 10.55, 10.3, Math.sin(a) * 10.55).rotation.y = -a + Math.PI / 2 }
  dome(add, 12, m.roof, 0, 11.6, 0)
  cyl(add, 0.2, 0.2, 4, m.gold, 0, 23.6, 0, 5)
  const crescent = add(new THREE.TorusGeometry(1.1, 0.16, 6, 14, Math.PI * 1.5), m.gold, 0, 28, 0)
  crescent.rotation.z = Math.PI * 0.75
  for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) { dome(add, 4, m.roof, x * 1.05, 9, z * 1.05); cyl(add, 0.1, 0.1, 2, m.gold, x * 1.05, 13, z * 1.05, 4) }
  for (const z of [-1, 1]) dome(add, 7, m.roof, 0, 9, z * 11)
  // minaretes com duas sacadas e lanterna acesa
  for (const x of [-17, 17]) {
    cyl(add, 1.1, 1.5, minaretH, mat, x, 0, 10, 10)
    for (const f of [0.6, 0.82]) cyl(add, 2.2, 2.2, 0.5, m.white, x, minaretH * f, 10, 10)
    cyl(add, 1.2, 1.2, minaretH * 0.1, m.lamp, x, minaretH * 0.82 + 0.5, 10, 8)
    cone(add, 1.7, 8, m.roof, x, minaretH, 10, 8)
    cyl(add, 0.08, 0.08, 2.2, m.gold, x, minaretH + 8, 10, 4)
  }
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
  // muralha com ameias e portão aceso, torres de canto com telhado cônico
  box(add, 46, 8, 6, mat, 0, 22, 12)
  for (let i = 0; i < 12; i += 1) box(add, 2.2, 2, 6.4, mat, -20.2 + i * 3.7, 30, 12)
  add(new THREE.BoxGeometry(5, 6.5, 0.3), m.lamp, 0, 25.5, 15.15)
  box(add, 34, 14, 14, mat, 0, 22, -1)
  for (let i = 0; i < 9; i += 1) { box(add, 2.2, 2, 14.4, mat, -14 + i * 3.5, 36, -1) }
  litWindows(add, m, [-10, -4, 2, 8], [29, 33], 6.2, 1, 2)
  for (const x of [-15, 15]) { cyl(add, 3.4, 3.8, 26, mat, x, 22, 6, 10); cone(add, 5, 10, m.roof, x, 48, 6, 10); add(new THREE.BoxGeometry(0.9, 2.4, 0.25), m.lamp, x, 40, 6 + 3.5) }
  cyl(add, 4, 4.4, 36, mat, 0, 22, -3, 10)
  cone(add, 5.6, 13, m.roof, 0, 58, -3, 10)
  cyl(add, 0.1, 0.1, 6, m.metal, 0, 71, -3, 4)
  box(add, 3.4, 2, 0.15, m.red, 1.8, 74, -3)
  add(new THREE.BoxGeometry(0.9, 2.4, 0.25), m.lamp, 0, 50, -3 + 4.3)
  return done(group, 40)
}

function colonial(m: LandmarkMats, mat: THREE.Material = m.white, roof: THREE.Material = m.brick): Piece {
  const { group, add } = kit()
  // igrejinha de fachada barroca: nave, telhado, duas torres, frontão, portal e escadaria
  box(add, 18, 12, 24, mat, 0, 0, -2)
  prism(add, 20, 6, 25, roof, 0, 12, -2)
  for (const x of [-6.5, 6.5]) {
    box(add, 5.5, 22, 5.5, mat, x, 0, 10)
    box(add, 6.3, 1, 6.3, m.stone, x, 22, 10)
    box(add, 4.6, 4.6, 4.6, mat, x, 23, 10)
    for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.2, 3, 1.6), m.stoneDark, x + side * 2.32, 25.2, 10)
    add(new THREE.BoxGeometry(1.6, 3, 0.2), m.stoneDark, x, 25.2, 12.32)
    cone(add, 3.6, 7, roof, x, 27.6, 10, 4).rotation.y = Math.PI / 4
    cyl(add, 0.1, 0.1, 2.4, m.gold, x, 34.6, 10, 4)
    box(add, 1.3, 0.2, 0.2, m.gold, x, 36.4, 10)
  }
  box(add, 7.4, 13, 1.2, mat, 0, 0, 11.4)
  prism(add, 8.4, 4, 1.4, mat, 0, 13, 11.4)
  cyl(add, 1.1, 1.1, 0.3, m.lamp, 0, 15.5, 12.2, 14).rotation.x = Math.PI / 2
  add(new THREE.BoxGeometry(3.2, 5.6, 0.3), m.stoneDark, 0, 3.4, 12.1)
  litWindows(add, m, [-2.6, 2.6], [8.4], 12.1, 1, 2.4)
  for (let i = 0; i < 3; i += 1) box(add, 8 + i * 1.6, 0.5, 1.6 + i * 0.5, m.stone, 0, i * 0.5, 13 + (2 - i) * 0.4)
  // janelas laterais acesas
  for (const z of [-8, -2, 4]) for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.25, 3.2, 1.2), m.lamp, side * 9.05, 7, z)
  box(add, 1.2, 0.2, 0.2, m.gold, 0, 19.5, 11.4)
  cyl(add, 0.1, 0.1, 2.4, m.gold, 0, 17, 11.4, 4)
  return done(group, 14)
}

/** Casario colorido de ladeira: casas pastel emendadas, telhados de duas águas e uma torre de igreja. */
function casario(m: LandmarkMats): Piece {
  const { group, add } = kit()
  const widths = [8, 7, 9, 7.5, 8.5, 7]
  const heights = [10, 14, 11, 16, 12, 9]
  let x = -24
  widths.forEach((w, i) => {
    const mat = m.pastel[i % m.pastel.length]
    const h = heights[i]
    const cx = x + w / 2
    box(add, w - 0.3, h, 12, mat, cx, 0, 0)
    prism(add, w, 3.4, 12.6, i % 2 ? m.brick : m.roof, cx, h, 0)
    const floors = Math.floor((h - 3) / 4)
    for (let f = 0; f < floors; f += 1) litWindows(add, m, [cx - w * 0.22, cx + w * 0.22], [4 + f * 4], 6.1, 1.3, 2)
    add(new THREE.BoxGeometry(1.6, 3, 0.25), m.stoneDark, cx, 1.6, 6.1)
    x += w
  })
  // torre da igreja ao centro, pontuda e acesa
  box(add, 5, 30, 5, m.white, 0, 0, -2)
  add(new THREE.BoxGeometry(1, 3, 0.25), m.lamp, 0, 22, 0.55)
  box(add, 5.8, 1, 5.8, m.stone, 0, 30, -2)
  cone(add, 4.4, 11, m.red, 0, 31, -2, 4).rotation.y = Math.PI / 4
  box(add, 1, 0.2, 0.2, m.gold, 0, 43.4, -2)
  return done(group, 26)
}

function campanile(m: LandmarkMats, h = 60, mat: THREE.Material = m.brick): Piece {
  const { group, add } = kit()
  box(add, 11, 3, 11, m.stone, 0, 0, 0)
  box(add, 8, h, 8, mat, 0, 3, 0)
  // frestas acesas nos quatro lados, em três alturas
  for (const y of [h * 0.3, h * 0.5, h * 0.68]) {
    for (const s2 of [-1, 1]) {
      add(new THREE.BoxGeometry(0.9, 4, 0.25), m.lamp, 0, y, s2 * 4.05)
      add(new THREE.BoxGeometry(0.25, 4, 0.9), m.lamp, s2 * 4.05, y, 0)
    }
  }
  const top = h + 3
  box(add, 9.6, 1.2, 9.6, m.stone, 0, top, 0)
  // sineira com quatro arcos e cantoneiras
  for (const [x, z] of [[-3.8, -3.8], [3.8, -3.8], [-3.8, 3.8], [3.8, 3.8]]) box(add, 1.4, 8, 1.4, m.stone, x, top + 1.2, z)
  for (const s2 of [-1, 1]) {
    add(new THREE.BoxGeometry(5.2, 6.4, 0.3), m.lamp, 0, top + 5, s2 * 3.9)
    add(new THREE.BoxGeometry(0.3, 6.4, 5.2), m.lamp, s2 * 3.9, top + 5, 0)
    // relógio
    cyl(add, 1.6, 1.6, 0.3, m.white, 0, top - 4.6, s2 * 4.2, 16).rotation.x = Math.PI / 2
    cyl(add, 1.9, 1.9, 0.2, m.gold, 0, top - 4.6, s2 * 4.1, 16).rotation.x = Math.PI / 2
  }
  box(add, 10.2, 0.8, 10.2, m.stone, 0, top + 9.2, 0)
  cone(add, 7, 15, m.roof, 0, top + 10, 0, 4).rotation.y = Math.PI / 4
  cyl(add, 0.12, 0.12, 5, m.gold, 0, top + 24.5, 0, 4)
  ball(add, 0.6, m.gold, 0, top + 29.8, 0)
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
  cone(add, 36, 46, m.rock, 0, 0, 0, 8)
  for (let i = 0; i < 9; i += 1) { const a = (i / 9) * Math.PI * 2; cone(add, 3.4, 7, m.leaf, Math.cos(a) * 17, 8 + (i % 3) * 3, Math.sin(a) * 17, 6) }
  box(add, 9, 8, 9, m.stoneDark, 0, 46)
  box(add, 6, 4, 6, m.white, 0, 54)
  cyl(add, 1.9, 3.6, 22, m.white, 0, 58, 0, 10)
  box(add, 30, 2.4, 2.6, m.white, 0, 75)
  box(add, 6, 2.6, 2.8, m.white, 0, 74.4)
  for (const s2 of [-1, 1]) cyl(add, 0.9, 1.3, 7, m.white, s2 * 13.5, 68.2, 0, 6)
  ball(add, 2.2, m.white, 0, 80.6, 0)
  for (const x of [-4, 4]) add(new THREE.ConeGeometry(2.2, 8, 8, 1, true), m.gold, x, 51, 5)
  return done(group, 38)
}

function statueLiberty(m: LandmarkMats): Piece {
  const { group, add } = kit()
  box(add, 24, 5, 24, m.stoneDark, 0, 0).rotation.y = Math.PI / 4
  box(add, 17, 6, 17, m.stoneDark, 0, 5).rotation.y = Math.PI / 4
  box(add, 12, 22, 12, m.stone, 0, 11)
  box(add, 14, 2, 14, m.stoneDark, 0, 33)
  cyl(add, 3.4, 5.4, 26, m.roof, 0, 35, 0, 10)
  cyl(add, 1.3, 1.5, 17, m.roof, 5.2, 55, 0, 6)
  box(add, 1.8, 1.4, 1.8, m.gold, 5.2, 71.5)
  add(new THREE.ConeGeometry(1.5, 4, 6), m.gold, 5.2, 75.5, 0)
  ball(add, 2.8, m.roof, 0, 63, 0)
  for (let i = 0; i < 7; i += 1) {
    const a = -Math.PI / 2.1 + (i / 6) * (Math.PI / 1.05)
    cone(add, 0.45, 5, m.roof, Math.sin(a) * 3.2, 64.5 + Math.cos(a) * 0.6, Math.cos(a) * 3, 4).rotation.z = -Math.sin(a) * 0.9
  }
  box(add, 4, 6, 1.2, m.roof, -3.4, 50, 1.6)
  return done(group, 13)
}

function sails(m: LandmarkMats): Piece {
  const { group, add } = kit()
  box(add, 60, 6, 30, m.stone, 0, 0)
  const shell = (x: number, z: number, r: number, rot: number) => {
    const mesh = add(new THREE.SphereGeometry(r, 14, 8, 0, Math.PI / 2.2, 0, Math.PI / 1.9), m.white, x, 6, z)
    mesh.rotation.y = rot
    mesh.rotation.z = -0.55
    mesh.scale.set(1, 1.15, 1)
  }
  for (const [x, z, r, rot] of [
    [-22, 0, 13, 0.3], [-16, 1, 17, 0.3], [-9, 2, 21, 0.3], [-1, 3, 19, 0.3],
    [6, -1, 9, 3.5], [11, -1, 12, 3.5], [17, 0, 15, 3.5],
    [22, 6, 7, 0.1], [26, 7, 9, 0.1],
  ] as const) shell(x, z, r, rot)
  box(add, 64, 1.2, 4, m.glass, 0, 6, 15)
  return done(group, 32)
}

function clockTower(m: LandmarkMats): Piece {
  const { group, add } = kit()
  box(add, 10, 46, 10, m.stone, 0, 0)
  for (const [x, z] of [[-5.3, -5.3], [5.3, -5.3], [-5.3, 5.3], [5.3, 5.3]]) box(add, 1.8, 48, 1.8, m.stone, x, 0, z)
  box(add, 12.4, 3, 12.4, m.stoneDark, 0, 46)
  box(add, 11, 14, 11, m.stone, 0, 49)
  for (const [x, z, rot] of [[0, 5.8, 0], [0, -5.8, 0], [5.8, 0, Math.PI / 2], [-5.8, 0, Math.PI / 2]] as const) {
    const face = cyl(add, 4, 4, 0.6, m.white, x, 52, z, 24)
    face.rotation.x = Math.PI / 2
    face.rotation.z = rot
  }
  box(add, 12, 2, 12, m.stoneDark, 0, 63)
  cone(add, 8.4, 20, m.roof, 0, 65, 0, 4).rotation.y = Math.PI / 4
  cyl(add, 0.2, 0.5, 8, m.gold, 0, 85, 0, 6)
  box(add, 56, 16, 14, m.stone, -34, 0, 0)
  box(add, 56, 3, 15, m.stoneDark, -34, 16)
  for (const x of [-18, -34, -50, -60]) { box(add, 5, 26, 5, m.stone, x, 16, 0); cone(add, 3.8, 8, m.roof, x, 42, 0, 4).rotation.y = Math.PI / 4 }
  return done(group, 52)
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
  const sides = 32
  const rx = 30
  const rz = 24
  for (let i = 0; i < sides; i += 1) {
    const a = (i / sides) * Math.PI * 2
    const ruin = Math.sin(a) > 0.2 && Math.cos(a) > -0.3
    const levels = ruin ? 2 : 3
    for (let lv = 0; lv < levels; lv += 1) {
      const block = box(add, 5.5, 9, 3.2, lv === 2 ? m.stoneDark : m.stone, Math.cos(a) * rx, lv * 9, Math.sin(a) * rz)
      block.rotation.y = -a + Math.PI / 2
      const arc = box(add, 2.4, 5.4, 3.6, m.stoneDark, Math.cos(a) * rx * 1.005, lv * 9 + 1.2, Math.sin(a) * rz * 1.005)
      arc.rotation.y = block.rotation.y
    }
    if (!ruin) { const top = box(add, 5.5, 4, 3.4, m.stone, Math.cos(a) * rx, 27, Math.sin(a) * rz); top.rotation.y = -a + Math.PI / 2 }
  }
  add(new THREE.CylinderGeometry(rx * 0.8, rx * 0.8, 1, 24), m.sand, 0, 0.5, 0).scale.z = rz / rx
  return done(group, 33)
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
  cyl(add, 9, 12, 5, m.rock, 0, 0, 0, 9)
  box(add, 9, 4.4, 6.5, m.white, 7, 5, 4)
  prism(add, 10, 3, 7, m.red, 7, 9.4, 4)
  litWindows(add, m, [5, 9], [6.6], 7.3, 1, 1.6)
  // torre afunilada listrada
  for (let i = 0; i < 4; i += 1) cyl(add, 4.2 - (i + 1) * 0.5, 4.2 - i * 0.5, 9, i % 2 ? m.red : m.white, 0, 5 + i * 9, 0, 12)
  // galeria com grade
  cyl(add, 5.2, 5.2, 0.7, m.metal, 0, 41, 0, 14)
  for (let i = 0; i < 14; i += 1) { const a = (i / 14) * Math.PI * 2; cyl(add, 0.08, 0.08, 1.6, m.metal, Math.cos(a) * 5, 41.7, Math.sin(a) * 5, 4) }
  cyl(add, 5, 5, 0.12, m.metal, 0, 43.1, 0, 14)
  // lanterna acesa, cúpula e para-raios
  cyl(add, 2.5, 2.5, 4.2, m.lamp, 0, 41.7, 0, 12)
  cone(add, 3.5, 4.6, m.red, 0, 45.9, 0, 12)
  cyl(add, 0.1, 0.1, 3, m.metal, 0, 50.4, 0, 4)
  ball(add, 0.5, m.gold, 0, 53.5, 0)
  return done(group, 12)
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
  arco: (m) => triomphe(m),
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
  burj: (m) => burj(m),
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
  'colonial-colorido': (m) => casario(m),
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
