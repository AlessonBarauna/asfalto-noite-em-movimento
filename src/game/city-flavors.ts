import * as THREE from 'three'
import { waterSide } from './city-streets'
import { basic, glowPlane, mesh, std, type StreetCtx } from './street-scenes'
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

export const CITY_FLAVORS: Record<string, Flavor[]> = {
  paris: [cafe, morrisColumns, guimard],
  londres: [londonStreet],
  'nova-york': [newYork],
  toquio: [tokyoStreet],
  'rio-de-janeiro': [copacabana],
  veneza: [gondolas],
  havana: [havanaCars],
  'las-vegas': [vegas],
}
