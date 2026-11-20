import * as THREE from 'three'
import { waterSide } from './city-streets'
import { basic, glowPlane, mesh, palm, std, type StreetCtx } from './street-scenes'
import { waveTexture } from './visuals/street-textures'

/** Assinatura de cada cidade importante: o que só existe nela, por cima do estilo de rua da região. */
type Flavor = (ctx: StreetCtx) => void

const sideAt = (i: number) => (i % 2 ? 1 : -1)
const walkX = (ctx: StreetCtx, side: number, f = 0.55) => side * (ctx.curbX + ctx.sidewalk * f)

function cafe(ctx: StreetCtx): void {
  const red = std('#b5262a', '#2a0808')
  const cream = std('#efe6d2', '#2a2418')
  const dark = std('#1c1f22')
  const bulb = basic('#ffe2a0')
  for (let i = 0; i < 14; i += 1) {
    const side = sideAt(i)
    const g = new THREE.Group()
    const awning = mesh(new THREE.BoxGeometry(2.8, 0.14, 5.2), i % 2 ? red : cream, -side * 1.6, 2.7)
    awning.rotation.z = side * 0.18
    g.add(awning)
    for (let t = 0; t < 3; t += 1) {
      const z = (t - 1) * 1.7
      g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 10), dark, 0, 0.78, z))
      g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.78, 5), dark, 0, 0.39, z))
      for (const cz of [-0.6, 0.6]) g.add(mesh(new THREE.BoxGeometry(0.4, 0.07, 0.4), dark, 0, 0.5, z + cz))
    }
    for (let k = 0; k < 6; k += 1) g.add(mesh(new THREE.SphereGeometry(0.09, 6, 4), bulb, -side * 0.4, 2.45, -2.3 + k * 0.92))
    const halo = glowPlane(ctx, '#ffd9a0', 6, 6, 0.4)
    halo.position.set(-side * 0.6, 1.8, 0)
    halo.rotation.y = Math.PI / 2
    g.add(halo)
    g.position.x = walkX(ctx, side, 0.7)
    ctx.prop(g, 40 - i * 44, 616)
  }
}

function morrisColumns(ctx: StreetCtx): void {
  const green = std('#1f4a36', '#08180f')
  const band = basic('#ffe2a0')
  for (let i = 0; i < 10; i += 1) {
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(0.55, 0.6, 3.2, 10), green, 0, 1.6))
    g.add(mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.5, 10), band, 0, 2.3))
    g.add(mesh(new THREE.ConeGeometry(0.7, 0.8, 10), green, 0, 3.6))
    g.position.x = walkX(ctx, sideAt(i), 0.35)
    ctx.prop(g, 20 - i * 62, 620)
  }
}

function guimard(ctx: StreetCtx): void {
  const green = std('#2a6a46', '#0a2014')
  const lamp = basic('#ff9a3a')
  for (let i = 0; i < 4; i += 1) {
    const g = new THREE.Group()
    for (const z of [-1.6, 1.6]) {
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.2, 6), green, 0, 1.6, z))
      g.add(mesh(new THREE.SphereGeometry(0.34, 8, 6), lamp, 0, 3.4, z))
    }
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.5, 3.2), green, 0, 2.7))
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.7, 2.6), lamp, 0, 2.0))
    const halo = glowPlane(ctx, '#ff9a3a', 5, 5, 0.5)
    halo.position.set(0, 3.2, 0)
    halo.rotation.y = Math.PI / 2
    g.add(halo)
    g.position.x = walkX(ctx, sideAt(i), 0.8)
    ctx.prop(g, -10 - i * 150, 600)
  }
}

function londonStreet(ctx: StreetCtx): void {
  const red = std('#c4161c', '#3a0507')
  const lit = basic('#fff0c0')
  const black = std('#16181b')
  for (let i = 0; i < 12; i += 1) {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(1.0, 2.4, 1.0), red, 0, 1.2))
    g.add(mesh(new THREE.BoxGeometry(1.1, 0.25, 1.1), red, 0, 2.5))
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.BoxGeometry(0.7, 1.6, 0.05), lit, 0, 1.3, s * 0.51))
      g.add(mesh(new THREE.BoxGeometry(0.05, 1.6, 0.7), lit, s * 0.51, 1.3, 0))
    }
    g.position.x = walkX(ctx, sideAt(i), 0.8)
    ctx.prop(g, 30 - i * 50, 600)
  }
  for (let i = 0; i < 6; i += 1) {
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(0.38, 0.4, 1.3, 10), red, 0, 0.65))
    g.add(mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.18, 10), red, 0, 1.4))
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.16, 0.06), black, 0, 0.9, 0.4))
    g.position.x = walkX(ctx, sideAt(i + 1), 0.4)
    ctx.prop(g, -4 - i * 100, 600)
  }
  for (let i = 0; i < 24; i += 1) {
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.14, 4.4, 6), black, 0, 2.2))
    for (const z of [-0.5, 0.5]) g.add(mesh(new THREE.SphereGeometry(0.28, 8, 6), lit, 0, 4.6, z))
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), black, 0, 4.3))
    g.position.x = walkX(ctx, sideAt(i), 0.15)
    ctx.prop(g, 55 - i * 25, 600)
  }
}

function newYork(ctx: StreetCtx): void {
  const stripeA = std('#e8641c', '#3a1604')
  const stripeB = std('#f0f0ea', '#2a2a28')
  for (let i = 0; i < 9; i += 1) {
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.8, 8), stripeA, 0, 0.4))
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.6, 8), stripeB, 0, 1.1))
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.6, 8), stripeA, 0, 1.7))
    const steam = glowPlane(ctx, '#ffffff', 3.2, 7, 0.35)
    steam.position.y = 4.6
    g.add(steam)
    const steam2 = steam.clone()
    steam2.rotation.y = Math.PI / 2
    g.add(steam2)
    g.position.x = (i % 2 ? 1 : -1) * (ctx.roadHalf - 1.6)
    ctx.prop(g, 10 - i * 66, 594)
  }
  const colors = ['#ff2d6f', '#2de0ff', '#ffd22d', '#6dff4a', '#b04dff', '#ff8a2d']
  for (let i = 0; i < 8; i += 1) {
    const side = sideAt(i)
    const g = new THREE.Group()
    const col = colors[i % colors.length]
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.14, 6, 5), std('#1a1c1f'), 0, 3))
    g.add(mesh(new THREE.BoxGeometry(0.3, 4.4, 7), basic(col), -side * 0.6, 7.6))
    const halo = glowPlane(ctx, col, 12, 9, 0.55)
    halo.rotation.y = Math.PI / 2
    halo.position.set(-side * 1.4, 7.6, 0)
    g.add(halo)
    g.position.x = side * (ctx.edgeX + 0.2)
    ctx.prop(g, 20 - i * 74, 592)
  }
  const green = std('#2a8a4a', '#0a2814')
  const globe = basic('#7dff9a')
  for (let i = 0; i < 4; i += 1) {
    const g = new THREE.Group()
    for (const z of [-1.2, 1.2]) { g.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 6), green, 0, 1.3, z)); g.add(mesh(new THREE.SphereGeometry(0.3, 8, 6), globe, 0, 2.8, z)) }
    g.position.x = walkX(ctx, sideAt(i), 0.5)
    ctx.prop(g, -30 - i * 150, 600)
  }
}

function tokyoStreet(ctx: StreetCtx): void {
  const body = std('#d8dde2', '#1a1c1f')
  const fronts = ['#2de0ff', '#ff3b3b', '#fff4d0', '#6dff9a'].map(c => basic(c))
  const cols = ['#2de0ff', '#ff3b3b', '#fff4d0', '#6dff9a']
  for (let i = 0; i < 20; i += 1) {
    const g = new THREE.Group()
    for (let k = 0; k < 3; k += 1) {
      g.add(mesh(new THREE.BoxGeometry(0.85, 1.9, 0.8), body, 0, 0.95, k * 0.95 - 0.95))
      g.add(mesh(new THREE.BoxGeometry(0.06, 1.2, 0.6), fronts[(i + k) % 4], -sideAt(i) * 0.44, 1.1, k * 0.95 - 0.95))
    }
    const halo = glowPlane(ctx, cols[i % 4], 4, 3, 0.5)
    halo.rotation.y = Math.PI / 2
    halo.position.set(-sideAt(i) * 0.9, 1.1, 0)
    g.add(halo)
    g.position.x = walkX(ctx, sideAt(i), 0.9)
    ctx.prop(g, 45 - i * 30, 600)
  }
  const white = basic('#f2f2f2')
  for (let i = 0; i < 4; i += 1) {
    const g = new THREE.Group()
    for (let k = 0; k < 11; k += 1) g.add(mesh(new THREE.BoxGeometry(0.7, 0.02, 3.2), white, 0, 0.0, 0).translateX(-ctx.roadHalf + 0.5 + k * ((ctx.roadHalf * 2 - 1) / 10)))
    ctx.prop(g, -40 - i * 150, 600)
  }
}

function copacabana(ctx: StreetCtx): void {
  const tex = waveTexture()
  const side = waterSide(ctx.cityId)
  tex.repeat.set(ctx.sidewalk / ctx.sidewalk, 1500 / ctx.sidewalk)
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, emissive: '#2a2a2a', emissiveMap: tex, emissiveIntensity: 0.25, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
  ctx.strip(side * ctx.curbX, side * ctx.edgeX, 0.14, mat)
  ctx.tick(scroll => { tex.offset.y = scroll / ctx.sidewalk })
}

function gondolas(ctx: StreetCtx): void {
  const hull = std('#101214', '#050607', { metalness: 0.3, roughness: 0.4 })
  const iron = std('#c8a05a', '#3a2a0c', { metalness: 0.5 })
  const lamp = basic('#ffd88a')
  for (let i = 0; i < 12; i += 1) {
    const side = sideAt(i)
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(1.0, 0.45, 6.4), hull, 0, 0.35))
    for (const z of [-1, 1]) {
      const prow = mesh(new THREE.BoxGeometry(0.16, 1.2, 0.3), hull, 0, 0.9, z * 3.3)
      prow.rotation.x = -z * 0.35
      g.add(prow)
    }
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.7, 0.4), iron, 0, 1.3, -3.6))
    g.add(mesh(new THREE.SphereGeometry(0.14, 6, 5), lamp, 0, 1.0, 0.2))
    g.position.x = side * (ctx.curbX + 2.2)
    ctx.prop(g, 30 - i * 49, 588)
  }
}

function havanaCars(ctx: StreetCtx): void {
  const colors = [['#2aa6c9', '#0a2a36'], ['#e84a5f', '#38101a'], ['#f4c542', '#3a2f0c'], ['#8fd45a', '#1c3010'], ['#f0f0e8', '#2a2a28']]
  const chrome = std('#cfd6dc', '#2a2e32', { metalness: 0.7, roughness: 0.3 })
  const glass = std('#1b2a35', '#0a1218')
  const lamp = basic('#fff0c0')
  for (let i = 0; i < 12; i += 1) {
    const [c, e] = colors[i % colors.length]
    const paint = std(c, e, { metalness: 0.3, roughness: 0.5 })
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(1.9, 0.75, 4.8), paint, 0, 0.7))
    g.add(mesh(new THREE.BoxGeometry(1.6, 0.6, 2.4), glass, 0, 1.35, -0.2))
    g.add(mesh(new THREE.BoxGeometry(1.5, 0.12, 2.2), paint, 0, 1.7, -0.2))
    for (const z of [-2.5, 2.5]) g.add(mesh(new THREE.BoxGeometry(2.0, 0.18, 0.16), chrome, 0, 0.5, z))
    for (const x of [-0.7, 0.7]) g.add(mesh(new THREE.SphereGeometry(0.17, 6, 5), lamp, x, 0.85, -2.45))
    for (const x of [-0.95, 0.95]) for (const z of [-1.5, 1.5]) g.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 10), std('#0c0d0e'), x, 0.34, z).rotateZ(Math.PI / 2))
    g.position.x = walkX(ctx, sideAt(i), 0.3)
    g.rotation.y = sideAt(i) > 0 ? 0 : Math.PI
    ctx.prop(g, 30 - i * 50, 600)
  }
}

function vegas(ctx: StreetCtx): void {
  const colors = ['#ff2d6f', '#ffd22d', '#2de0ff', '#ff8a2d', '#b04dff', '#6dff4a']
  for (let i = 0; i < 9; i += 1) {
    const side = sideAt(i)
    const col = colors[i % colors.length]
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.25, 14, 6), std('#1a1c1f'), 0, 7))
    g.add(mesh(new THREE.BoxGeometry(0.35, 6, 3.2), basic(col), -side * 0.5, 13))
    g.add(mesh(new THREE.BoxGeometry(0.3, 2, 5), basic(colors[(i + 2) % colors.length]), -side * 0.5, 17.5))
    const halo = glowPlane(ctx, col, 14, 14, 0.6)
    halo.rotation.y = Math.PI / 2
    halo.position.set(-side * 1.4, 14, 0)
    g.add(halo)
    g.position.x = side * (ctx.edgeX + 0.6)
    ctx.prop(g, 10 - i * 66, 594)
  }
}


function umbrellaPines(ctx: StreetCtx): void {
  const trunk = std('#5a4632', '#120c06')
  const leaf = std('#2c5a2e', '#0b2010')
  for (let i = 0; i < 18; i += 1) {
    const g = new THREE.Group()
    const t = mesh(new THREE.CylinderGeometry(0.22, 0.34, 8.4, 6), trunk, 0, 4.2)
    t.rotation.z = (i % 2 ? 1 : -1) * 0.06
    g.add(t)
    const crown = mesh(new THREE.SphereGeometry(3.6, 9, 5), leaf, 0, 9.2)
    crown.scale.y = 0.42
    g.add(crown)
    g.position.x = walkX(ctx, sideAt(i), 0.8)
    ctx.prop(g, 50 - i * 33, 594)
  }
}

function romanFountain(ctx: StreetCtx): void {
  const stone = std('#d8d0bd', '#2a2518')
  const water = basic('#8fd8ff')
  for (let i = 0; i < 4; i += 1) {
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.9, 14), stone, 0, 0.45))
    g.add(mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.12, 14), water, 0, 0.9))
    g.add(mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.6, 8), stone, 0, 1.6))
    g.add(mesh(new THREE.CylinderGeometry(1.2, 0.5, 0.3, 10), stone, 0, 2.7))
    g.add(mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 10), water, 0, 2.9))
    g.add(mesh(new THREE.SphereGeometry(0.28, 6, 5), stone, 0, 3.4))
    const halo = glowPlane(ctx, '#9fe0ff', 7, 5, 0.5)
    halo.position.y = 1.6
    g.add(halo)
    const halo2 = halo.clone()
    halo2.rotation.y = Math.PI / 2
    g.add(halo2)
    g.position.x = walkX(ctx, sideAt(i), 0.7)
    ctx.prop(g, -10 - i * 150, 600)
  }
}

function amsterdamBikes(ctx: StreetCtx): void {
  const black = std('#16181b')
  const rail = std('#1c2024')
  const bike = (color: string) => {
    const g = new THREE.Group()
    const frame = std(color, '#101010')
    for (const z of [-0.5, 0.5]) { const w = mesh(new THREE.TorusGeometry(0.34, 0.035, 5, 12), black, 0, 0.36, z); w.rotation.y = Math.PI / 2; g.add(w) }
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.06, 1.0), frame, 0, 0.62, 0))
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), black, 0, 0.98, -0.5))
    g.add(mesh(new THREE.BoxGeometry(0.2, 0.06, 0.3), black, 0, 0.82, 0.25))
    return g
  }
  const colors = ['#c93a3a', '#2a6ac9', '#d9b030', '#3a9a5a', '#e8e8e8']
  for (const side of [-1, 1]) ctx.group.add(mesh(new THREE.BoxGeometry(0.08, 0.9, 1500), rail, side * (ctx.curbX + 0.35), 0.62, -620))
  for (let i = 0; i < 20; i += 1) {
    const side = sideAt(i)
    const row = new THREE.Group()
    for (let k = 0; k < 5; k += 1) { const b = bike(colors[(i + k) % colors.length]); b.position.z = k * 0.9; b.position.x = -side * 0.1; row.add(b) }
    row.position.x = side * (ctx.curbX + 0.55)
    ctx.prop(row, 40 - i * 30, 600)
  }
  const pot = std('#6a4a2a')
  const tulips = ['#e8344a', '#ffd22d', '#ff8ad0', '#ff7a2d'].map(c => std(c, c, { emissiveIntensity: 0.25 }))
  for (let i = 0; i < 14; i += 1) {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), pot, 0, 0.25))
    for (let k = 0; k < 6; k += 1) g.add(mesh(new THREE.SphereGeometry(0.13, 6, 5), tulips[(i + k) % 4], (k % 3 - 1) * 0.25, 0.7, (Math.floor(k / 3) - 0.5) * 0.4))
    g.position.x = sideAt(i + 1) * (ctx.curbX + 1.0)
    ctx.prop(g, 20 - i * 42, 588)
  }
}

function dubaiLuxury(ctx: StreetCtx): void {
  const gold = basic('#ffcf6a')
  const cyan = basic('#6ae0ff')
  const trunk = std('#6a5236')
  const frond = std('#3a7a3c', '#0e2a12', { side: THREE.DoubleSide })
  for (let i = 0; i < 6; i += 1) {
    const g = new THREE.Group()
    const ring = mesh(new THREE.TorusGeometry(ctx.roadHalf + 2.4, 0.18, 6, 28, Math.PI), i % 2 ? gold : cyan, 0, 0.1)
    g.add(ring)
    const halo = glowPlane(ctx, i % 2 ? '#ffcf6a' : '#6ae0ff', ctx.roadHalf * 2 + 8, 5, 0.4)
    halo.position.y = ctx.roadHalf + 2.4
    g.add(halo)
    ctx.prop(g, 20 - i * 100, 600)
  }
  for (let i = 0; i < 20; i += 1) {
    const p = palm({ trunk, frond }, 1.15)
    p.position.x = walkX(ctx, sideAt(i), 0.8)
    p.rotation.y = i
    const up = glowPlane(ctx, '#ffd890', 4, 6, 0.35)
    up.position.set(0, 2.5, 0)
    p.add(up)
    ctx.prop(p, 40 - i * 30, 600)
  }
  const colors = ['#f0c030', '#e8e8f0', '#d03030', '#2a2a30']
  const lamp = basic('#fff0c0')
  for (let i = 0; i < 6; i += 1) {
    const g = new THREE.Group()
    const paint = std(colors[i % 4], '#101010', { metalness: 0.5, roughness: 0.3 })
    g.add(mesh(new THREE.BoxGeometry(1.95, 0.5, 4.6), paint, 0, 0.55))
    g.add(mesh(new THREE.BoxGeometry(1.6, 0.4, 2.0), std('#10161c'), 0, 0.95, 0.3))
    for (const x of [-0.7, 0.7]) g.add(mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), lamp, x, 0.62, -2.3))
    g.position.x = walkX(ctx, sideAt(i), 0.3)
    g.rotation.y = sideAt(i) > 0 ? 0 : Math.PI
    ctx.prop(g, -20 - i * 96, 600)
  }
}

function istanbulTram(ctx: StreetCtx): void {
  const side = waterSide(ctx.cityId)
  const cream = std('#efe6d2', '#2a2418')
  const red = std('#b5262a', '#2a0808')
  const lit = basic('#fff0c0')
  const tram = new THREE.Group()
  for (let c = 0; c < 3; c += 1) {
    const car = new THREE.Group()
    car.add(mesh(new THREE.BoxGeometry(2.4, 2.9, 9), cream, 0, 0))
    car.add(mesh(new THREE.BoxGeometry(2.44, 0.5, 9.04), red, 0, -1.0))
    for (const s of [-1, 1]) car.add(mesh(new THREE.BoxGeometry(0.06, 0.9, 7.8), lit, s * 1.22, 0.5))
    car.position.z = c * 9.3
    tram.add(car)
  }
  tram.position.set(side * (ctx.curbX + 1.7), 2.0, -200)
  ctx.group.add(tram)
  ctx.tick(scroll => { tram.position.z = ((((-420 + scroll * 0.55) % 600) + 600) % 600) - 520 })
  const rails = std('#3a3f45')
  ctx.group.add(mesh(new THREE.BoxGeometry(0.1, 0.06, 1500), rails, side * (ctx.curbX + 0.9), 0.4, -620))
  ctx.group.add(mesh(new THREE.BoxGeometry(0.1, 0.06, 1500), rails, side * (ctx.curbX + 2.5), 0.4, -620))
  const colors = ['#ff3b3b', '#ffb02a', '#2ad0c9', '#4a7bff', '#b04dff', '#7bd44a']
  const cable = std('#15181c')
  const half = ctx.roadHalf + 2.6
  for (let i = 0; i < 18; i += 1) {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(half * 2, 0.05, 0.05), cable, 0, 7.2))
    for (let k = 0; k < 8; k += 1) {
      const x = -half + 1 + (k * (half * 2 - 2)) / 7
      const l = mesh(new THREE.SphereGeometry(0.3, 8, 6), basic(colors[(k + i) % colors.length]), x, 6.7)
      g.add(l)
      const halo = glowPlane(ctx, colors[(k + i) % colors.length], 2.2, 2.2, 0.55)
      halo.position.set(x, 6.7, 0.1)
      g.add(halo)
    }
    ctx.prop(g, 40 - i * 34, 612)
  }
}

function berlinWall(ctx: StreetCtx): void {
  const concrete = std('#9a9a96', '#1c1c1a')
  const paints = ['#ff3b8b', '#3be0ff', '#ffd23a', '#7bff6a', '#ff6a3a', '#b06bff'].map(c => basic(c))
  const rnd = (n: number) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1
  for (let i = 0; i < 30; i += 1) {
    const side = sideAt(i)
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(0.5, 3.6, 3.5), concrete, 0, 1.8))
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.5, 8), concrete, 0, 3.7).rotateX(Math.PI / 2))
    for (let k = 0; k < 3; k += 1) {
      const w = 0.6 + rnd(i * 5 + k) * 1.4
      const h = 0.5 + rnd(i * 7 + k) * 1.2
      g.add(mesh(new THREE.BoxGeometry(0.04, h, w), paints[Math.floor(rnd(i * 3 + k) * 6)], -side * 0.27, 0.8 + k * 0.9, (rnd(i + k) - 0.5) * 1.6))
    }
    g.position.x = side * (ctx.edgeX - 0.3)
    ctx.prop(g, 55 - i * 20, 600)
  }
  const dark = std('#1b1e22')
  const green = basic('#3dff7a')
  for (let i = 0; i < 6; i += 1) {
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), dark, 0, 2.1))
    g.add(mesh(new THREE.BoxGeometry(0.9, 1.5, 0.3), dark, 0, 4.6))
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.9, 0.34), green, 0, 4.4))
    g.add(mesh(new THREE.SphereGeometry(0.2, 6, 5), green, 0, 5.1))
    g.position.x = walkX(ctx, sideAt(i), 0.2)
    ctx.prop(g, 10 - i * 100, 600)
  }
}

function sydneyHarbour(ctx: StreetCtx): void {
  const side = waterSide(ctx.cityId)
  const white = std('#f0f0ee', '#2a2a2a')
  const green = std('#1f6a52', '#08201a')
  const lit = basic('#fff0c0')
  for (let i = 0; i < 5; i += 1) {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(5, 1.4, 16), green, 0, 0.7))
    g.add(mesh(new THREE.BoxGeometry(4.6, 1.4, 12), white, 0, 2.1))
    for (const x of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.06, 0.7, 10), lit, x * 2.32, 2.2))
    g.add(mesh(new THREE.BoxGeometry(3.4, 0.9, 5), white, 0, 3.2, 1))
    g.position.x = side * (ctx.edgeX + 34 + (i % 3) * 18)
    ctx.prop(g, -30 - i * 120, 600)
  }
  for (let i = 0; i < 10; i += 1) {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(1.8, 0.6, 5), white, 0, 0.3))
    const sail = mesh(new THREE.ConeGeometry(1.4, 7, 3), white, 0, 4.2)
    sail.scale.z = 0.12
    g.add(sail)
    g.position.x = side * (ctx.edgeX + 24 + (i % 4) * 14)
    ctx.prop(g, 10 - i * 60, 600)
  }
}

export const CITY_FLAVORS: Record<string, Flavor[]> = {
  paris: [cafe, morrisColumns, guimard],
  londres: [londonStreet],
  'nova-york': [newYork],
  toquio: [tokyoStreet],
  'rio-de-janeiro': [copacabana],
  veneza: [gondolas],
  havana: [havanaCars],
  'las-vegas': [vegas],
  roma: [umbrellaPines, romanFountain],
  amsterda: [amsterdamBikes],
  dubai: [dubaiLuxury],
  istambul: [istanbulTram],
  berlim: [berlinWall],
  sydney: [sydneyHarbour],
}
