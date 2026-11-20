import * as THREE from 'three'

function make(size: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  draw(g)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Paralelepípedo: pedras irregulares em fileiras desencontradas, com juntas escuras. */
export function cobbleTexture(): THREE.CanvasTexture {
  return make(512, g => {
    g.fillStyle = '#1b1814'
    g.fillRect(0, 0, 512, 512)
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const rows = 8
    const h = 512 / rows
    for (let r = 0; r < rows; r += 1) {
      const cols = 6
      const w = 512 / cols
      const shift = (r % 2) * (w / 2)
      for (let c = -1; c <= cols; c += 1) {
        const tone = 78 + rnd() * 46
        g.fillStyle = `rgb(${tone + 10},${tone + 2},${tone - 12})`
        const x = c * w + shift + 3
        const y = r * h + 3
        g.beginPath()
        g.roundRect(x, y, w - 6, h - 6, 10 + rnd() * 6)
        g.fill()
        g.fillStyle = 'rgba(255,235,200,0.10)'
        g.fillRect(x + 6, y + 4, w * 0.4, 3)
      }
    }
  })
}

/** Pontinhos de luz alongados sobre fundo transparente, para a água correr. */
export function rippleTexture(): THREE.CanvasTexture {
  return make(256, g => {
    g.clearRect(0, 0, 256, 256)
    let seed = 11
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let i = 0; i < 70; i += 1) {
      const x = rnd() * 256
      const y = rnd() * 256
      const len = 8 + rnd() * 26
      const grad = g.createLinearGradient(x, 0, x + len, 0)
      grad.addColorStop(0, 'rgba(190,230,255,0)')
      grad.addColorStop(0.5, `rgba(190,230,255,${0.35 + rnd() * 0.4})`)
      grad.addColorStop(1, 'rgba(190,230,255,0)')
      g.fillStyle = grad
      g.fillRect(x, y, len, 1.6)
    }
  })
}

/** Calçadão de ondas pretas e brancas (Copacabana). */
export function waveTexture(): THREE.CanvasTexture {
  return make(256, g => {
    g.fillStyle = '#e9e6df'
    g.fillRect(0, 0, 256, 256)
    g.fillStyle = '#1d1d1f'
    for (let row = 0; row < 4; row += 1) {
      g.beginPath()
      const y0 = row * 64
      g.moveTo(0, y0 + 32)
      for (let x = 0; x <= 256; x += 8) g.lineTo(x, y0 + 32 + Math.sin((x / 256) * Math.PI * 4 + row * 0.8) * 20)
      for (let x = 256; x >= 0; x -= 8) g.lineTo(x, y0 + 50 + Math.sin((x / 256) * Math.PI * 4 + row * 0.8) * 20)
      g.closePath()
      g.fill()
    }
  })
}
