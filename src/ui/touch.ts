import type { Input } from '../engine/input'
import { controlPrefs, type ControlPrefs, type PadId } from './controls-prefs'

/**
 * On-screen touch controls: a floating stick on the left half, drag-to-look on the right half,
 * and holdable action buttons. Enabled automatically on the first touch.
 */
export class TouchControls {
  private stickId: number | null = null
  private lookId: number | null = null
  private origin = { x: 0, y: 0 }
  private last = { x: 0, y: 0 }
  private readonly stick: HTMLElement
  private readonly knob: HTMLElement
  private scheme: ControlPrefs['scheme'] = 'touch'
  private invertTilt = false
  private leftDown = false
  private rightDown = false
  private baseline: number | null = null
  private wasActive = false

  constructor(root: HTMLElement, private readonly input: Input, private readonly active: () => boolean) {
    const layer = root.querySelector<HTMLElement>('.touch')!
    this.stick = layer.querySelector('.touch-stick')!
    this.knob = this.stick.querySelector('i')!
    const radius = 56

    const pads = Array.from(layer.querySelectorAll<HTMLElement>('[data-touch]'))
    controlPrefs.subscribe(prefs => {
      this.scheme = prefs.scheme
      this.invertTilt = prefs.invertTilt
      document.body.dataset.controlScheme = prefs.scheme
      for (const btn of pads) {
        const pos = prefs.pads[btn.dataset.touch as PadId]
        if (pos) { btn.style.left = `${pos.x * 100}%`; btn.style.top = `${pos.y * 100}%` }
      }
      this.baseline = null
      if (prefs.scheme !== 'tilt') this.input.setTouchMove(0, 0)
    })
    window.addEventListener('deviceorientation', e => {
      if (e.gamma === null && e.beta === null) return
      const angle = (screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0) % 360
      const raw = angle === 90 ? (e.beta ?? 0) : angle === 270 || angle === -90 ? -(e.beta ?? 0) : angle === 180 ? -(e.gamma ?? 0) : (e.gamma ?? 0)
      const act = this.active()
      if (act && !this.wasActive) this.baseline = raw // zera a posição neutra ao começar a corrida
      this.wasActive = act
      if (this.scheme !== 'tilt' || !act) return
      if (this.baseline === null) this.baseline = raw
      let x = (raw - this.baseline) / 22
      if (this.invertTilt) x = -x
      if (Math.abs(x) < 0.07) x = 0
      this.input.setTouchMove(Math.max(-1, Math.min(1, x)), 0)
    })

    const enable = () => document.body.classList.add('has-touch')
    if (matchMedia('(pointer: coarse)').matches) enable()
    window.addEventListener('touchstart', enable, { once: true, passive: true })
    // Any touch switches hints/prompts to touch, even taps on menu buttons.
    window.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') this.input.method = 'touch'
    }, { capture: true })

    const canvas = document.querySelector<HTMLCanvasElement>('#game')!
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch' || !this.active() || this.scheme !== 'touch') return
      if (e.clientX < window.innerWidth * 0.45 && this.stickId === null) {
        this.stickId = e.pointerId
        this.origin = { x: e.clientX, y: e.clientY }
        this.stick.style.left = `${e.clientX}px`
        this.stick.style.top = `${e.clientY}px`
        this.stick.classList.add('is-active')
      } else if (this.lookId === null) {
        this.lookId = e.pointerId
        this.last = { x: e.clientX, y: e.clientY }
      }
    })
    window.addEventListener('pointermove', e => {
      if (e.pointerId === this.stickId) {
        let dx = e.clientX - this.origin.x
        let dy = e.clientY - this.origin.y
        const len = Math.hypot(dx, dy)
        if (len > radius) {
          dx = (dx / len) * radius
          dy = (dy / len) * radius
        }
        this.knob.style.transform = `translate(${dx}px, ${dy}px)`
        this.input.setTouchMove(dx / radius, -dy / radius)
      } else if (e.pointerId === this.lookId) {
        this.input.addTouchLook(e.clientX - this.last.x, e.clientY - this.last.y)
        this.last = { x: e.clientX, y: e.clientY }
      }
    })
    const end = (e: PointerEvent) => {
      if (e.pointerId === this.stickId) {
        this.stickId = null
        this.knob.style.transform = ''
        this.stick.classList.remove('is-active')
        this.input.setTouchMove(0, 0)
      }
      if (e.pointerId === this.lookId) this.lookId = null
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)

    for (const btn of layer.querySelectorAll<HTMLElement>('[data-touch]')) {
      const action = btn.dataset.touch as PadId
      const steer = () => this.input.setTouchMove((this.rightDown ? 1 : 0) - (this.leftDown ? 1 : 0), 0)
      const press = (down: boolean) => {
        if (action === 'left') { this.leftDown = down; steer() }
        else if (action === 'right') { this.rightDown = down; steer() }
        else this.input.setTouchButton(action, down)
      }
      btn.addEventListener('pointerdown', e => {
        e.preventDefault()
        btn.setPointerCapture(e.pointerId)
        btn.classList.add('is-down')
        press(true)
      })
      const up = () => {
        btn.classList.remove('is-down')
        press(false)
      }
      btn.addEventListener('pointerup', up)
      btn.addEventListener('pointercancel', up)
    }
  }
}
