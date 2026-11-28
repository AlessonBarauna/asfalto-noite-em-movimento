import * as THREE from 'three'

/** Deterministic PRNG so every session draws the same city. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!]
}

function finish(c: HTMLCanvasElement, srgb: boolean, repeat = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}

/** Soft radial glow used by light sprites and light pools on the road. */
export function glowTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128)
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.18, 'rgba(255,255,255,0.55)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return finish(c, true, false)
}

/** Vertical gradient (bright at the top) for reflection streaks and beam cones. */
export function streakTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(32, 256)
  const h = g.createLinearGradient(0, 0, 32, 0)
  h.addColorStop(0, 'rgba(255,255,255,0)')
  h.addColorStop(0.5, 'rgba(255,255,255,1)')
  h.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = h
  g.fillRect(0, 0, 32, 256)
  g.globalCompositeOperation = 'destination-in'
  const v = g.createLinearGradient(0, 0, 0, 256)
  v.addColorStop(0, 'rgba(0,0,0,1)')
  v.addColorStop(0.45, 'rgba(0,0,0,0.55)')
  v.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = v
  g.fillRect(0, 0, 32, 256)
  return finish(c, true, false)
}

/** Wet asphalt: grainy colour plus a roughness map with glossy puddles that catch the lights. */
export function asphaltTextures(): { map: THREE.CanvasTexture; roughness: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const size = 512
  const rnd = seeded(77)
  const [cc, cg] = canvas(size, size)
  const [rc, rg] = canvas(size, size)
  const [nc, ng] = canvas(size, size)
  cg.fillStyle = '#2a3036'
  cg.fillRect(0, 0, size, size)
  rg.fillStyle = '#9a9a9a'
  rg.fillRect(0, 0, size, size)
  ng.fillStyle = '#8080ff'
  ng.fillRect(0, 0, size, size)
  // aggregate grain
  for (let i = 0; i < 26000; i += 1) {
    const x = rnd() * size
    const y = rnd() * size
    const v = 30 + Math.floor(rnd() * 46)
    cg.fillStyle = `rgba(${v},${v + 3},${v + 7},${0.35 + rnd() * 0.5})`
    cg.fillRect(x, y, 1 + rnd() * 1.6, 1 + rnd() * 1.6)
    const n = 118 + Math.floor(rnd() * 20)
    ng.fillStyle = `rgb(${n},${n},255)`
    ng.fillRect(x, y, 1.4, 1.4)
  }
  // patched / repaired strips
  for (let i = 0; i < 7; i += 1) {
    cg.fillStyle = `rgba(14,18,22,${0.1 + rnd() * 0.16})`
    cg.fillRect(rnd() * size, rnd() * size, 60 + rnd() * 160, 14 + rnd() * 70)
  }
  // hairline cracks
  cg.strokeStyle = 'rgba(8,10,12,0.5)'
  cg.lineWidth = 1
  for (let i = 0; i < 9; i += 1) {
    cg.beginPath()
    let x = rnd() * size
    let y = rnd() * size
    cg.moveTo(x, y)
    for (let k = 0; k < 7; k += 1) {
      x += (rnd() - 0.5) * 60
      y += (rnd() - 0.2) * 40
      cg.lineTo(x, y)
    }
    cg.stroke()
  }
  // glossy puddles (low roughness) with a slightly darker body
  for (let i = 0; i < 7; i += 1) {
    const px = rnd() * size
    const py = rnd() * size
    const rx = 70 + rnd() * 110
    const ry = 34 + rnd() * 60
    for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
      const grad = rg.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, rx)
      grad.addColorStop(0, 'rgba(26,26,26,0.9)')
      grad.addColorStop(0.4, 'rgba(48,48,48,0.55)')
      grad.addColorStop(0.75, 'rgba(90,90,90,0.18)')
      grad.addColorStop(1, 'rgba(154,154,154,0)')
      rg.save()
      rg.translate(px + ox, py + oy)
      rg.scale(1, ry / rx)
      rg.translate(-(px + ox), -(py + oy))
      rg.fillStyle = grad
      rg.beginPath()
      rg.arc(px + ox, py + oy, rx, 0, Math.PI * 2)
      rg.fill()
      rg.restore()
    }
  }
  // tyre-polished lanes: smoother, shinier bands
  for (const bx of [0.18, 0.31, 0.69, 0.82]) {
    const grad = rg.createLinearGradient((bx - 0.05) * size, 0, (bx + 0.05) * size, 0)
    grad.addColorStop(0, 'rgba(70,70,70,0)')
    grad.addColorStop(0.5, 'rgba(70,70,70,0.55)')
    grad.addColorStop(1, 'rgba(70,70,70,0)')
    rg.fillStyle = grad
    rg.fillRect((bx - 0.05) * size, 0, size * 0.1, size)
  }
  return { map: finish(cc, true), roughness: finish(rc, false), normal: finish(nc, false) }
}

/** Concrete / pavement for sidewalks. */
export function pavementTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256)
  const rnd = seeded(5)
  g.fillStyle = '#3b4146'
  g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 6000; i += 1) {
    const v = 48 + Math.floor(rnd() * 36)
    g.fillStyle = `rgba(${v},${v + 2},${v + 5},0.5)`
    g.fillRect(rnd() * 256, rnd() * 256, 1.6, 1.6)
  }
  g.strokeStyle = 'rgba(12,14,16,0.7)'
  g.lineWidth = 2
  for (let i = 0; i <= 256; i += 128) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke()
    g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke()
  }
  return finish(c, true)
}

export type FacadeStyle = { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture }

/**
 * One facade tile: a wall with a grid of windows. The emissive map lights a random subset in
 * warm / cool tones, the colour map carries mullions, floor slabs and grime streaks.
 * A tile is 8 columns x 12 floors; callers repeat it by scaling UVs.
 */
export function facadeStyle(seed: number, wall: string, tones: readonly string[], litChance: number): FacadeStyle {
  const cols = 8
  const rows = 12
  const cw = 48
  const ch = 54
  const w = cols * cw
  const h = rows * ch
  const rnd = seeded(seed)
  const [mc, mg] = canvas(w, h)
  const [ec, eg] = canvas(w, h)
  mg.fillStyle = wall
  mg.fillRect(0, 0, w, h)
  eg.fillStyle = '#000'
  eg.fillRect(0, 0, w, h)
  // concrete mottling
  for (let i = 0; i < 2600; i += 1) {
    mg.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`
    mg.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 10, 2 + rnd() * 10)
    mg.fillStyle = `rgba(255,255,255,${rnd() * 0.03})`
    mg.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 8, 2 + rnd() * 8)
  }
  for (let r = 0; r < rows; r += 1) {
    // floor slab line
    mg.fillStyle = 'rgba(0,0,0,0.35)'
    mg.fillRect(0, r * ch, w, 3)
    for (let col = 0; col < cols; col += 1) {
      const x = col * cw + 7
      const y = r * ch + 11
      const ww = cw - 14
      const wh = ch - 22
      mg.fillStyle = '#0a1016'
      mg.fillRect(x - 2, y - 2, ww + 4, wh + 4)
      // glass with a faint sky tint
      const gl = mg.createLinearGradient(x, y, x + ww, y + wh)
      gl.addColorStop(0, '#1d2b36')
      gl.addColorStop(1, '#0c141b')
      mg.fillStyle = gl
      mg.fillRect(x, y, ww, wh)
      // mullion
      mg.fillStyle = 'rgba(8,12,16,0.9)'
      mg.fillRect(x + ww / 2 - 1, y, 2, wh)
      if (rnd() < litChance) {
        const tone = tones[Math.floor(rnd() * tones.length)]
        const a = 0.55 + rnd() * 0.45
        eg.globalAlpha = a
        eg.fillStyle = tone
        eg.fillRect(x, y, ww, wh)
        // curtain / blind variation so lit windows aren't flat rectangles
        if (rnd() < 0.5) {
          eg.globalAlpha = 0.5
          eg.fillStyle = '#000'
          eg.fillRect(x, y, ww, wh * (0.15 + rnd() * 0.4))
        }
        eg.globalAlpha = 1
        eg.fillStyle = '#000'
        eg.fillRect(x + ww / 2 - 1, y, 2, wh)
      }
    }
  }
  // vertical grime streaks
  for (let i = 0; i < 40; i += 1) {
    mg.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.08})`
    mg.fillRect(rnd() * w, rnd() * h * 0.5, 2 + rnd() * 5, h * (0.25 + rnd() * 0.5))
  }
  return { map: finish(mc, true), emissive: finish(ec, true) }
}

/** Neon sign face: rounded bar with outlined glyph-like blocks (no text, so no i18n/IP concerns). */
export function neonTexture(color: string, seed: number): THREE.CanvasTexture {
  const [c, g] = canvas(256, 512)
  const rnd = seeded(seed)
  g.fillStyle = '#05080b'
  g.fillRect(0, 0, 256, 512)
  g.strokeStyle = color
  g.fillStyle = color
  g.lineWidth = 7
  g.shadowColor = color
  g.shadowBlur = 18
  g.strokeRect(14, 14, 228, 484)
  let y = 50
  while (y < 440) {
    const hgt = 36 + rnd() * 40
    const wid = 60 + rnd() * 120
    g.globalAlpha = 0.9
    g.fillRect(128 - wid / 2, y, wid, hgt * 0.5)
    g.globalAlpha = 0.5
    g.fillRect(128 - wid / 3, y + hgt * 0.62, wid * 0.66, 6)
    y += hgt + 18
  }
  return finish(c, true, false)
}

/** Highway gantry sign: reflective green panel with white lane arrows (no text). */
export function gantrySignTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 160)
  g.fillStyle = '#0d5a3c'
  g.fillRect(0, 0, 512, 160)
  g.strokeStyle = '#e8f1ea'
  g.lineWidth = 6
  g.strokeRect(8, 8, 496, 144)
  g.fillStyle = '#e8f1ea'
  for (const cx of [100, 256, 412]) {
    g.beginPath()
    g.moveTo(cx, 28)
    g.lineTo(cx + 34, 74)
    g.lineTo(cx + 12, 74)
    g.lineTo(cx + 12, 132)
    g.lineTo(cx - 12, 132)
    g.lineTo(cx - 12, 74)
    g.lineTo(cx - 34, 74)
    g.closePath()
    g.fill()
  }
  return finish(c, true, false)
}

/** Street-level shopfront: lit glass bays separated by dark frames, with a sign band on top. */
export function shopfrontTexture(seed: number, tones: readonly string[]): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 128)
  const rnd = seeded(seed)
  g.fillStyle = '#05080b'
  g.fillRect(0, 0, 1024, 128)
  const bays = 8
  const bw = 1024 / bays
  for (let i = 0; i < bays; i += 1) {
    const tone = tones[Math.floor(rnd() * tones.length)]
    const lit = rnd() > 0.18
    const x = i * bw + 8
    const grad = g.createLinearGradient(0, 30, 0, 124)
    grad.addColorStop(0, lit ? tone : '#0d141a')
    grad.addColorStop(1, lit ? '#000' : '#05080b')
    g.globalAlpha = lit ? 0.95 : 1
    g.fillStyle = grad
    g.fillRect(x, 32, bw - 16, 90)
    g.globalAlpha = 1
    g.fillStyle = '#05080b'
    g.fillRect(x + (bw - 16) / 2 - 2, 32, 4, 90)
    // sign band
    g.fillStyle = tone
    g.globalAlpha = 0.55
    g.fillRect(x + 6, 8, bw - 28, 12)
    g.globalAlpha = 1
  }
  return finish(c, true, false)
}

/**
 * Fachada de torre moderna (cortina de vidro): painéis contínuos com reflexo do céu, esquadrias finas,
 * faixas de laje e andares inteiros acesos em trechos (escritórios), em vez de janelas soltas.
 */
export function glassTowerStyle(seed: number, tint: string, tones: readonly string[], litChance: number): FacadeStyle {
  const cols = 8
  const rows = 12
  const cw = 48
  const ch = 54
  const w = cols * cw
  const h = rows * ch
  const rnd = seeded(seed)
  const [mc, mg] = canvas(w, h)
  const [ec, eg] = canvas(w, h)
  const base = mg.createLinearGradient(0, 0, w, h)
  base.addColorStop(0, tint)
  base.addColorStop(0.5, '#0b141c')
  base.addColorStop(1, tint)
  mg.fillStyle = base
  mg.fillRect(0, 0, w, h)
  eg.fillStyle = '#000'
  eg.fillRect(0, 0, w, h)
  // reflexos diagonais do céu e das luzes da cidade
  for (let i = 0; i < 26; i += 1) {
    const x = rnd() * w
    const gr = mg.createLinearGradient(x, 0, x + 60, h)
    gr.addColorStop(0, 'rgba(160,210,255,0)')
    gr.addColorStop(0.5, `rgba(160,210,255,${0.03 + rnd() * 0.07})`)
    gr.addColorStop(1, 'rgba(160,210,255,0)')
    mg.fillStyle = gr
    mg.fillRect(x, 0, 18 + rnd() * 40, h)
  }
  for (let r = 0; r < rows; r += 1) {
    mg.fillStyle = 'rgba(2,6,10,0.85)'
    mg.fillRect(0, r * ch, w, 5)
    mg.fillStyle = 'rgba(120,150,170,0.18)'
    mg.fillRect(0, r * ch + 5, w, 1.5)
    // andar aceso em trechos contínuos
    let col = 0
    while (col < cols) {
      const run = 1 + Math.floor(rnd() * 4)
      if (rnd() < litChance) {
        const tone = tones[Math.floor(rnd() * tones.length)]
        eg.globalAlpha = 0.55 + rnd() * 0.4
        eg.fillStyle = tone
        eg.fillRect(col * cw + 1, r * ch + 9, Math.min(run, cols - col) * cw - 2, ch - 15)
        // divisórias internas e luminárias lineares
        eg.globalAlpha = 0.45
        eg.fillStyle = '#000'
        for (let k = 1; k < run; k += 1) eg.fillRect(col * cw + k * cw - 1, r * ch + 9, 2, ch - 15)
        eg.globalAlpha = 1
        eg.fillStyle = 'rgba(255,255,255,0.35)'
        eg.fillRect(col * cw + 6, r * ch + 14, Math.min(run, cols - col) * cw - 12, 2)
      }
      col += run
    }
  }
  // esquadrias verticais
  mg.fillStyle = 'rgba(2,6,10,0.8)'
  for (let c = 0; c <= cols; c += 1) mg.fillRect(c * cw - 1, 0, 2, h)
  eg.fillStyle = '#000'
  for (let c = 0; c <= cols; c += 1) eg.fillRect(c * cw - 1, 0, 2, h)
  return { map: finish(mc, true), emissive: finish(ec, true) }
}

/** Tela de LED de painel publicitário: faixas de cor, círculos e grade de pixels (sem textos nem marcas). */
export function ledScreenTexture(seed: number): THREE.CanvasTexture {
  const w = 512
  const h = 256
  const rnd = seeded(seed)
  const [c, g] = canvas(w, h)
  const palettes = [['#ff3d81', '#ffb347', '#2b0a3d'], ['#2cd6ff', '#7a5cff', '#06122b'], ['#46ffb0', '#ffe14a', '#04241a'], ['#ff5a3c', '#ffd1a1', '#2a0a06']]
  const [a, b, bg] = palettes[Math.floor(rnd() * palettes.length)]
  const gr = g.createLinearGradient(0, 0, w, h)
  gr.addColorStop(0, bg)
  gr.addColorStop(1, '#000')
  g.fillStyle = gr
  g.fillRect(0, 0, w, h)
  for (let i = 0; i < 7; i += 1) {
    const y = rnd() * h
    const grad = g.createLinearGradient(0, y, w, y + 40)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(0.5, rnd() < 0.5 ? a : b)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.globalAlpha = 0.55 + rnd() * 0.4
    g.fillStyle = grad
    g.fillRect(0, y, w, 8 + rnd() * 34)
  }
  g.globalAlpha = 1
  g.fillStyle = a
  g.beginPath()
  g.arc(w * (0.2 + rnd() * 0.6), h * 0.5, 54 + rnd() * 30, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = b
  for (let i = 0; i < 4; i += 1) {
    g.beginPath()
    g.moveTo(20 + i * 40, h - 20)
    g.lineTo(60 + i * 40, h * 0.55)
    g.lineTo(90 + i * 40, h - 20)
    g.fill()
  }
  g.fillStyle = 'rgba(0,0,0,0.38)'
  for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h)
  for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1)
  const tex = finish(c, true)
  tex.wrapS = THREE.RepeatWrapping
  return tex
}
