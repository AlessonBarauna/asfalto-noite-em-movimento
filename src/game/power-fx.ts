import * as THREE from 'three'
import { POWERS, type PowerId } from './powers'

type Spark = { sprite: THREE.Sprite; life: number; max: number; vel: THREE.Vector3; size: number; alive: boolean }
type Ring = { mesh: THREE.Mesh; t: number; max: number; alive: boolean }

const SPARKS = 110
const RINGS = 6
const STREAKS = 16

/**
 * Efeitos visuais dos poderes: anéis de choque na ativação, faíscas de cada cor, linhas de velocidade (nitro),
 * carro translúcido (fantasma) e um brilho de borda de tela feito por CSS (`body[data-power]`).
 */
export class PowerFx {
  readonly group = new THREE.Group()
  private readonly sparks: Spark[] = []
  private readonly rings: Ring[] = []
  private readonly streaks: THREE.Mesh[] = []
  private emit = 0
  private ringTimer = 0
  private ghostOn = false
  private readonly saved = new Map<THREE.Material, { transparent: boolean; opacity: number; depthWrite: boolean }>()
  private shownPower: PowerId | null = null

  constructor(glow: THREE.Texture, streak: THREE.Texture) {
    for (let i = 0; i < SPARKS; i += 1) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }))
      sprite.visible = false
      this.group.add(sprite)
      this.sparks.push({ sprite, life: 0, max: 1, vel: new THREE.Vector3(), size: 0.3, alive: false })
    }
    for (let i = 0; i < RINGS; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.88, 1, 56),
        new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide }),
      )
      mesh.rotation.x = -Math.PI / 2
      mesh.visible = false
      this.group.add(mesh)
      this.rings.push({ mesh, t: 0, max: 0.8, alive: false })
    }
    for (let i = 0; i < STREAKS; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.1 + Math.random() * 0.08, 7 + Math.random() * 6),
        new THREE.MeshBasicMaterial({ color: '#ffa860', map: streak, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
      )
      mesh.rotation.x = -Math.PI / 2
      mesh.visible = false
      mesh.userData.seed = Math.random()
      this.group.add(mesh)
      this.streaks.push(mesh)
    }
  }

  /** Explosão de entrada: dois anéis de choque na cor do poder e flash de tela. */
  trigger(id: PowerId, x: number, y: number, z: number): void {
    this.ring(POWERS[id].color, x, y + 0.05, z, 0.9)
    this.ring('#ffffff', x, y + 0.08, z, 0.55)
    if (typeof document !== 'undefined') {
      const b = document.body
      b.style.setProperty('--pw', POWERS[id].color)
      b.classList.remove('power-flash')
      void b.offsetWidth
      b.classList.add('power-flash')
    }
  }

  private ring(color: string, x: number, y: number, z: number, max: number): void {
    const r = this.rings.find(item => !item.alive) ?? this.rings[0]
    r.alive = true
    r.t = 0
    r.max = max
    r.mesh.visible = true
    r.mesh.position.set(x, y, z)
    ;(r.mesh.material as THREE.MeshBasicMaterial).color.set(color)
  }

  private spark(color: string, pos: THREE.Vector3, vel: THREE.Vector3, size: number, max: number): void {
    const s = this.sparks.find(item => !item.alive)
    if (!s) return
    s.alive = true
    s.life = 0
    s.max = max
    s.size = size
    s.vel.copy(vel)
    s.sprite.visible = true
    s.sprite.position.copy(pos)
    ;(s.sprite.material as THREE.SpriteMaterial).color.set(color)
  }

  update(dt: number, elapsed: number, power: PowerId | null, x: number, y: number, z: number, speed: number, carRoot: THREE.Object3D): void {
    this.syncOverlay(power)
    this.setGhost(carRoot, power === 'ghost')
    const world = Math.max(8, speed)
    const color = power ? POWERS[power].color : '#fff'
    if (power) this.emitPower(power, color, dt, elapsed, x, y, z, world)

    for (const s of this.sparks) {
      if (!s.alive) continue
      s.life += dt
      const t = s.life / s.max
      if (t >= 1) { s.alive = false; s.sprite.visible = false; continue }
      s.sprite.position.addScaledVector(s.vel, dt)
      s.sprite.scale.setScalar(s.size * (1 - t * 0.55))
      ;(s.sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, (1 - t) * 1.6)
    }
    for (const r of this.rings) {
      if (!r.alive) continue
      r.t += dt
      const t = r.t / r.max
      if (t >= 1) { r.alive = false; r.mesh.visible = false; continue }
      r.mesh.scale.setScalar(1 + t * 13)
      ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.85
    }
    const turbo = power === 'turbo'
    for (const m of this.streaks) {
      m.visible = turbo
      if (!turbo) continue
      const seed = m.userData.seed as number
      const lane = ((seed * 7.31) % 1) * 11 - 5.5
      const h = 0.25 + ((seed * 13.7) % 1) * 3.4
      const phase = (elapsed * (1.6 + seed * 0.8) * 0.6 + seed * 3) % 1
      m.position.set(x + lane, y + h, z - 62 + phase * 80)
    }
  }

  private emitPower(power: PowerId, color: string, dt: number, elapsed: number, x: number, y: number, z: number, world: number): void {
    const rates: Record<PowerId, number> = { clear: 28, wings: 55, ghost: 36, turbo: 60, cash: 42 }
    this.emit += dt * rates[power]
    while (this.emit >= 1) {
      this.emit -= 1
      const p = new THREE.Vector3()
      const v = new THREE.Vector3()
      if (power === 'clear') {
        p.set(x + (Math.random() - 0.5) * 9, 0.2, z - 2 - Math.random() * 28)
        v.set(0, 2 + Math.random() * 2.5, world * 0.8)
        this.spark(color, p, v, 0.45, 0.9)
      } else if (power === 'wings') {
        const side = Math.random() < 0.5 ? -1 : 1
        p.set(x + side * (1.2 + Math.random() * 0.8), y + 1 + Math.random() * 0.5, z + 0.2)
        v.set(side * 0.6, -0.2, world * 0.6)
        this.spark(Math.random() < 0.5 ? color : '#ffffff', p, v, 0.5, 0.7)
      } else if (power === 'ghost') {
        p.set(x + (Math.random() - 0.5) * 1.8, y + Math.random() * 1.6, z + (Math.random() - 0.5) * 3.4)
        v.set((Math.random() - 0.5) * 0.8, 1 + Math.random(), world * 0.35)
        this.spark(Math.random() < 0.3 ? '#ffffff' : color, p, v, 0.28 + Math.random() * 0.25, 0.55)
      } else if (power === 'turbo') {
        p.set(x + (Math.random() - 0.5) * 0.9, y + 0.35, z + 2.2)
        v.set((Math.random() - 0.5) * 1.6, 0.4 + Math.random() * 0.8, world * 0.55 + 6)
        this.spark(Math.random() < 0.5 ? '#ffd27a' : color, p, v, 0.55, 0.5)
      } else {
        const a = elapsed * 6 + Math.random() * Math.PI * 2
        p.set(x + Math.cos(a) * 1.15, y + 0.2 + Math.random() * 0.4, z + Math.sin(a) * 2)
        v.set(0, 2.4 + Math.random() * 1.6, world * 0.3)
        this.spark(Math.random() < 0.35 ? '#fff4c4' : color, p, v, 0.34 + Math.random() * 0.2, 0.75)
      }
    }
    if (power === 'clear' || power === 'ghost') {
      this.ringTimer -= dt
      if (this.ringTimer <= 0) {
        this.ringTimer = power === 'clear' ? 0.55 : 0.8
        this.ring(color, x, y + 0.05, z, 0.9)
      }
    }
  }

  private syncOverlay(power: PowerId | null): void {
    if (this.shownPower === power || typeof document === 'undefined') return
    this.shownPower = power
    const b = document.body
    if (power) {
      b.dataset.power = power
      b.style.setProperty('--pw', POWERS[power].color)
    } else delete b.dataset.power
  }

  /** Fantasma: o carro fica translúcido e brilhante; ao acabar, volta ao normal. */
  private setGhost(root: THREE.Object3D, on: boolean): void {
    if (on === this.ghostOn) return
    this.ghostOn = on
    if (on) {
      root.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return
        const mats = Array.isArray(node.material) ? node.material : [node.material]
        for (const m of mats) {
          if (!this.saved.has(m)) this.saved.set(m, { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite })
          m.transparent = true
          m.opacity = 0.42
          m.depthWrite = false
          m.needsUpdate = true
        }
      })
    } else {
      for (const [m, s] of this.saved) { m.transparent = s.transparent; m.opacity = s.opacity; m.depthWrite = s.depthWrite; m.needsUpdate = true }
      this.saved.clear()
    }
  }
}
