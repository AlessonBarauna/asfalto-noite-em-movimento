import * as THREE from 'three'
import { waterSide } from './city-streets'

/** O que o RaceWorld empresta a cada cena de rua. */
export type StreetCtx = {
  group: THREE.Group
  strip: (x0: number, x1: number, y: number, mat: THREE.Material) => THREE.Mesh
  prop: (root: THREE.Object3D, z: number, period: number) => void
  tick: (fn: (scroll: number) => void) => void
  hideSide: (side: number) => void
  glow: THREE.Texture
  cityId: string
  curbX: number
  edgeX: number
  roadHalf: number
  sidewalk: number
}

export const std = (color: string, emissive = '#000000', extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1, roughness: 0.9, flatShading: true, ...extra })
export const basic = (color: string) => new THREE.MeshBasicMaterial({ color })
export const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  return m
}
export const glowPlane = (ctx: StreetCtx, color: string, w: number, h: number, opacity: number) =>
  new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ctx.glow, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }))

export function rng(seed: string): () => number {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296 }
}

const PASTEL = [['#e8b04a', '#4a360e'], ['#d9604a', '#44160d'], ['#5aa6c9', '#10303f'], ['#8fc47a', '#1c3714'], ['#e58fb0', '#44192a'], ['#f0e0a0', '#43391a'], ['#c9885a', '#3a2412']]

export function palm(mats: { trunk: THREE.Material; frond: THREE.Material }, scale = 1): THREE.Group {
  const g = new THREE.Group()
  const trunk = mesh(new THREE.CylinderGeometry(0.13 * scale, 0.24 * scale, 6.4 * scale, 6), mats.trunk, 0, 3.2 * scale)
  g.add(trunk)
  for (let f = 0; f < 7; f += 1) {
    const frond = mesh(new THREE.ConeGeometry(0.55 * scale, 3.4 * scale, 4), mats.frond)
    frond.scale.z = 0.25
    const ang = (f / 7) * Math.PI * 2
    frond.position.set(Math.cos(ang) * 1.4 * scale, 6.5 * scale, Math.sin(ang) * 1.4 * scale)
    frond.rotation.set(Math.sin(ang) * 1.15, 0, -Math.cos(ang) * 1.15)
    g.add(frond)
  }
  return g
}

/** Alameda arborizada: verde nas calçadas, árvores da cor típica da cidade e postes de globo. */
const TREE_COLORS: Record<string, [string, string]> = {
  'buenos-aires': ['#7a4fb0', '#2a1442'], 'cidade-do-mexico': ['#7a4fb0', '#2a1442'], brasilia: ['#d4a824', '#4a3a08'],
  belgrado: ['#b5651d', '#3a1c06'], bucareste: ['#b5651d', '#3a1c06'], ancara: ['#a8782a', '#352408'], auckland: ['#3a8a4a', '#0e2e16'],
}
export function boulevard(ctx: StreetCtx): void {
  const [leaf, glowC] = TREE_COLORS[ctx.cityId] ?? ['#2f7a3c', '#0c2a14']
  const grass = std('#16301c', '#06140a')
  const trunk = std('#4a3826', '#100a05')
  const crown = std(leaf, glowC, { emissiveIntensity: 1.2 })
  const pole = std('#1b1f24')
  const globe = basic('#fff1c9')
  for (const side of [-1, 1]) {
    ctx.strip(side * (ctx.curbX + ctx.sidewalk * 0.55), side * (ctx.edgeX + 0.2), 0.16, grass)
    for (let i = 0; i < 32; i += 1) {
      const t = new THREE.Group()
      t.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 3.6, 6), trunk, 0, 1.8))
      t.add(mesh(new THREE.SphereGeometry(2.0, 8, 6), crown, 0, 4.9))
      t.add(mesh(new THREE.SphereGeometry(1.5, 8, 6), crown, side * 0.2, 6.6))
      t.position.x = side * (ctx.curbX + ctx.sidewalk * 0.72)
      ctx.prop(t, 60 - i * 18 - (side > 0 ? 0 : 9), 576)
    }
    for (let i = 0; i < 32; i += 1) {
      const lamp = new THREE.Group()
      lamp.add(mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.6, 6), pole, 0, 2.3))
      lamp.add(mesh(new THREE.SphereGeometry(0.4, 8, 6), globe, 0, 4.9))
      const halo = glowPlane(ctx, '#ffd9a0', 4, 4, 0.5)
      halo.position.y = 4.9
      lamp.add(halo)
      lamp.position.x = side * (ctx.curbX + 1.1)
      ctx.prop(lamp, 51 - i * 18 - (side > 0 ? 0 : 9), 576)
    }
  }
}

/** Ladeira: um lado vira morro cheio de casinhas acesas (favela/ladeira) em vez de prédios. */
export function hillside(ctx: StreetCtx): void {
  const side = waterSide(ctx.cityId)
  ctx.hideSide(side)
  const x0 = ctx.edgeX + 2
  const profile: Array<[number, number]> = [[0, 0], [16, 7], [34, 18], [56, 34], [80, 52]]
  const slope = (x: number) => {
    for (let i = 1; i < profile.length; i += 1) {
      if (x <= profile[i][0]) { const [ax, ay] = profile[i - 1]; const [bx, by] = profile[i]; return ay + ((x - ax) / (bx - ax)) * (by - ay) }
    }
    return profile[profile.length - 1][1]
  }
  const shape = new THREE.Shape()
  shape.moveTo(0, -0.4)
  for (const [x, y] of profile) shape.lineTo(x, y)
  shape.lineTo(profile[profile.length - 1][0], -0.4)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1500, bevelEnabled: false })
  geo.translate(0, 0, -750)
  const hill = new THREE.Mesh(geo, std('#2a3a22', '#0f1d0c', { side: THREE.DoubleSide, emissiveIntensity: 1.2 }))
  hill.position.set(side * x0, 0, -620)
  hill.scale.x = side
  ctx.group.add(hill)
  const mats = PASTEL.map(([c, e]) => std(c, e, { emissiveIntensity: 0.9 }))
  const lamp = basic('#ffd88a')
  const rnd = rng(ctx.cityId)
  for (let i = 0; i < 90; i += 1) {
    const cluster = new THREE.Group()
    const xr = 2 + rnd() * 44
    const count = 2 + Math.floor(rnd() * 3)
    for (let k = 0; k < count; k += 1) {
      const w = 3.4 + rnd() * 2.6
      const h = 3 + rnd() * 3.2
      const ox = (rnd() - 0.5) * 2.4
      const oz = (k - count / 2) * 4.2
      const y = slope(xr + ox)
      cluster.add(mesh(new THREE.BoxGeometry(w, h, 4), mats[Math.floor(rnd() * mats.length)], side * (x0 + xr + ox), y + h / 2 - 0.4, oz))
      cluster.add(mesh(new THREE.BoxGeometry(0.2, 1.1, 1.3), lamp, side * (x0 + xr + ox) - side * (w / 2 + 0.05), y + h * 0.55, oz))
      if (rnd() > 0.5) cluster.add(mesh(new THREE.BoxGeometry(0.2, 0.9, 1.0), lamp, side * (x0 + xr + ox) - side * (w / 2 + 0.05), y + h * 0.55, oz + 1.4))
    }
    ctx.prop(cluster, 60 - i * 6.5, 585)
  }
}

/** Trópico úmido: gramado denso, palmeiras altas, moitas e barraquinhas de feira acesas. */
export function tropical(ctx: StreetCtx): void {
  const grass = std('#1b4a22', '#08200c')
  const trunk = std('#5a4630')
  const frond = std('#1f6a34', '#082a12', { side: THREE.DoubleSide })
  const bush = std('#27783a', '#0a2c14')
  const bulb = basic('#ffe3a0')
  const awnings = ['#d9453a', '#e8b030', '#3a9ac9', '#8ac04a'].map(c => std(c, '#000000', { emissive: c, emissiveIntensity: 0.25 }))
  const wood = std('#6a4a2a')
  const rnd = rng(ctx.cityId)
  for (const side of [-1, 1]) {
    ctx.strip(side * (ctx.curbX + ctx.sidewalk * 0.5), side * (ctx.edgeX + 36), 0.16, grass)
    for (let i = 0; i < 18; i += 1) {
      const p = palm({ trunk, frond }, 1.25)
      p.position.x = side * (ctx.edgeX - 0.6 + (i % 2) * 2.2)
      p.rotation.y = i * 1.3
      ctx.prop(p, 60 - i * 32 - (side > 0 ? 0 : 16), 576)
    }
    for (let i = 0; i < 48; i += 1) {
      const b = mesh(new THREE.SphereGeometry(1.1 + rnd() * 0.9, 7, 5), bush, side * (ctx.curbX + 1.0 + rnd() * 3), 0.7)
      b.scale.y = 0.7
      ctx.prop(b, 60 - i * 12 - rnd() * 4, 576)
    }
  }
  for (let i = 0; i < 6; i += 1) {
    const side = i % 2 ? 1 : -1
    const stall = new THREE.Group()
    stall.add(mesh(new THREE.BoxGeometry(3.6, 1, 1.6), wood, 0, 0.5, 0))
    const roof = mesh(new THREE.BoxGeometry(4.2, 0.2, 2.4), awnings[i % awnings.length], 0, 2.7, 0)
    roof.rotation.x = 0.18
    stall.add(roof)
    for (const px of [-1.9, 1.9]) stall.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 4), wood, px, 1.35, 0.9))
    for (let k = 0; k < 5; k += 1) stall.add(mesh(new THREE.SphereGeometry(0.12, 6, 4), bulb, -1.6 + k * 0.8, 2.45, 1.0))
    const halo = glowPlane(ctx, '#ffd080', 6, 5, 0.45)
    halo.position.set(0, 1.8, 1.1)
    stall.add(halo)
    stall.position.x = side * (ctx.curbX + ctx.sidewalk * 0.6)
    ctx.prop(stall, 30 - i * 96, 576)
  }
}

/** Deserto: areia e dunas no lugar de um lado da cidade, palmeiras de oásis e uma caravana de camelos. */
export function dunes(ctx: StreetCtx): void {
  const side = waterSide(ctx.cityId)
  ctx.hideSide(side)
  const sand = std('#a2824f', '#2e2410')
  const duneMat = std('#b08a52', '#3a2c14')
  const dark = std('#6a4a2a', '#150e06')
  const trunk = std('#5a4630')
  const frond = std('#2a6a34', '#0a2812', { side: THREE.DoubleSide })
  ctx.strip(side * ctx.edgeX, side * (ctx.edgeX + 240), -0.02, sand)
  const rnd = rng(ctx.cityId)
  for (let i = 0; i < 44; i += 1) {
    const w = 16 + rnd() * 20
    const d = mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), duneMat, side * (ctx.edgeX + 14 + rnd() * 70), -0.1)
    d.scale.set(w, 4 + rnd() * 9, 14 + rnd() * 22)
    d.rotation.y = rnd() * 0.6 - 0.3
    ctx.prop(d, 60 - i * 13.4, 590)
  }
  for (let i = 0; i < 6; i += 1) {
    const p = palm({ trunk, frond }, 1.1)
    p.position.x = side * (ctx.edgeX + 5 + (i % 3) * 2.4)
    p.rotation.y = i
    ctx.prop(p, 40 - i * 96, 576)
  }
  const camel = (): THREE.Group => {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(1.1, 1.3, 2.8), dark, 0, 2.0))
    g.add(mesh(new THREE.SphereGeometry(0.6, 6, 5), dark, 0, 2.9, -0.2))
    const neck = mesh(new THREE.BoxGeometry(0.4, 1.6, 0.5), dark, 0, 2.9, 1.5)
    neck.rotation.x = -0.5
    g.add(neck)
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.9), dark, 0, 3.7, 2.1))
    for (const [lx, lz] of [[-0.35, -1], [0.35, -1], [-0.35, 1], [0.35, 1]]) g.add(mesh(new THREE.BoxGeometry(0.22, 1.5, 0.22), dark, lx, 0.75, lz))
    return g
  }
  for (let i = 0; i < 4; i += 1) {
    const line = new THREE.Group()
    for (let k = 0; k < 3; k += 1) { const c = camel(); c.position.set(0, 0, k * 4.2); c.rotation.y = 0.15 * k; line.add(c) }
    line.position.x = side * (ctx.edgeX + 24 + (i % 2) * 8)
    ctx.prop(line, -20 - i * 150, 600)
  }
}

/** Lanternas: fios de lanternas acesas cruzando a pista e placas de neon na calçada. */
export function lanterns(ctx: StreetCtx): void {
  const japan = ctx.cityId === 'toquio' || ctx.cityId === 'osaka'
  const reds = [basic('#ff3b2a'), basic('#ffb02a'), basic(japan ? '#fff0d0' : '#ff6a3a')]
  const neon = ['#ff3b8b', '#3be0ff', '#ffd23a', '#7bff6a', '#b06bff'].map(c => basic(c))
  const neonColors = ['#ff3b8b', '#3be0ff', '#ffd23a', '#7bff6a', '#b06bff']
  const cable = std('#15181c')
  const post = std('#23272d')
  const half = ctx.roadHalf + 2.6
  for (let i = 0; i < 30; i += 1) {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(half * 2, 0.06, 0.06), cable, 0, 7.6))
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 7.7, 6), post, s * half, 3.85))
    const n = 9
    for (let k = 0; k < n; k += 1) {
      const x = -half + 1 + (k * (half * 2 - 2)) / (n - 1)
      const lantern = mesh(japan ? new THREE.CylinderGeometry(0.32, 0.32, 0.6, 8) : new THREE.SphereGeometry(0.34, 8, 6), reds[(k + i) % reds.length], x, 7.0 - (k % 2) * 0.25)
      g.add(lantern)
      const halo = glowPlane(ctx, k % 3 === 0 ? '#ffb070' : '#ff6a50', 2.2, 2.2, 0.55)
      halo.position.set(x, lantern.position.y, 0.1)
      g.add(halo)
    }
    ctx.prop(g, 60 - i * 19, 570)
  }
  for (let i = 0; i < 26; i += 1) {
    const side = i % 2 ? 1 : -1
    const sign = new THREE.Group()
    sign.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 5), post, 0, 3))
    const idx = i % neon.length
    const board = mesh(new THREE.BoxGeometry(0.25, 3.6 + (i % 3), 1.5), neon[idx], -side * 0.6, 4.4 + (i % 3) * 0.4)
    sign.add(board)
    const halo = glowPlane(ctx, neonColors[idx], 7, 7, 0.5)
    halo.rotation.y = Math.PI / 2
    halo.position.set(-side * 1.2, board.position.y, 0)
    sign.add(halo)
    sign.position.x = side * (ctx.curbX + ctx.sidewalk * 0.55)
    ctx.prop(sign, 50 - i * 22, 572)
  }
}

/** Metrô elevado: viaduto de concreto sobre a calçada de um lado, com um trem que passa. */
export function elevated(ctx: StreetCtx): void {
  const side = waterSide(ctx.cityId)
  const cx = side * (ctx.curbX + 1.4)
  const concrete = std('#4a4f55', '#0c0e10')
  ctx.group.add(mesh(new THREE.BoxGeometry(6.2, 1.2, 1500), concrete, cx, 11, -620))
  for (const s of [-1, 1]) ctx.group.add(mesh(new THREE.BoxGeometry(0.3, 0.9, 1500), concrete, cx + s * 3, 12.0, -620))
  for (let i = 0; i < 24; i += 1) {
    const pillar = new THREE.Group()
    pillar.add(mesh(new THREE.BoxGeometry(1.5, 10.4, 1.9), concrete, 0, 5.2))
    pillar.add(mesh(new THREE.BoxGeometry(5.4, 1.1, 2.4), concrete, 0, 10.4))
    pillar.position.x = cx - side * 0.2
    ctx.prop(pillar, 60 - i * 25, 600)
  }
  const bodyMat = std('#aab3bd', '#1a2026', { metalness: 0.4, roughness: 0.5 })
  const stripe = std(ctx.cityId === 'sao-paulo' ? '#c8281f' : '#2a7ad0', '#101820')
  const lit = basic('#fff0c0')
  const train = new THREE.Group()
  for (let c = 0; c < 4; c += 1) {
    const car = new THREE.Group()
    car.add(mesh(new THREE.BoxGeometry(2.7, 2.6, 8.0), bodyMat, 0, 0))
    car.add(mesh(new THREE.BoxGeometry(2.74, 0.5, 8.04), stripe, 0, -0.5))
    for (const s of [-1, 1]) car.add(mesh(new THREE.BoxGeometry(0.06, 0.9, 7.2), lit, s * 1.36, 0.45))
    car.position.z = c * 8.4
    train.add(car)
  }
  train.add(mesh(new THREE.BoxGeometry(1.2, 0.5, 0.1), lit, 0, -0.2, -4.1))
  const headlight = glowPlane(ctx, '#fff0c0', 5, 5, 0.6)
  headlight.position.set(0, -0.2, -4.4)
  train.add(headlight)
  train.position.set(cx, 13.0, -200)
  ctx.group.add(train)
  ctx.tick(scroll => { train.position.z = ((((-480 + scroll * 0.6) % 640) + 640) % 640) - 560 })
}
