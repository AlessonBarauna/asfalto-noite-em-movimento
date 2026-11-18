import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import type { Quality } from './save'

type Preset = { pixelRatio: number; shadows: boolean; shadowMap: number; bloom: boolean; antialias: boolean; msaa: number; fx: boolean; rain: boolean }
export const QUALITY_PRESETS: Record<Quality, Preset> = {
  low: { pixelRatio: 1, shadows: false, shadowMap: 512, bloom: false, antialias: false, msaa: 0, fx: false, rain: false },
  medium: { pixelRatio: 1.5, shadows: true, shadowMap: 1024, bloom: true, antialias: true, msaa: 2, fx: true, rain: true },
  high: { pixelRatio: 2, shadows: true, shadowMap: 2048, bloom: true, antialias: true, msaa: 4, fx: true, rain: true },
}

/** Pick a starting quality from device hints; the player can override it in Settings. */
export function suggestQuality(): Quality {
  const coarse = matchMedia('(pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency ?? 4
  if (coarse || cores <= 4) return 'medium'
  return 'high'
}

/** Cinematic grade: speed-driven radial blur + chromatic aberration, vignette, grain, warm/cool split toning. */
const CinematicShader = {
  name: 'CinematicShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uSpeed: { value: 0 },
    uHit: { value: 0 },
    uAspect: { value: 1 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uSpeed, uHit, uAspect;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      float r = length(c * vec2(uAspect, 1.0));
      vec2 dir = normalize(c + 1e-5);
      float blur = (uSpeed * 0.018 + uHit * 0.012) * smoothstep(0.12, 0.75, r);
      float ca = (0.0008 + uSpeed * 0.0022 + uHit * 0.004) * r;
      vec3 col = vec3(0.0);
      float wsum = 0.0;
      for (int i = 0; i < 6; i++) {
        float t = float(i) / 5.0;
        float w = 1.0 - t * 0.55;
        vec2 uv = vUv - dir * blur * t;
        col += vec3(texture2D(tDiffuse, uv + dir * ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - dir * ca).b) * w;
        wsum += w;
      }
      col /= wsum;
      // split toning: cool shadows, warm highlights
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, col * vec3(0.9, 1.0, 1.12), (1.0 - smoothstep(0.0, 0.35, l)) * 0.5);
      col = mix(col, col * vec3(1.08, 1.0, 0.9), smoothstep(0.35, 1.2, l) * 0.35);
      // vignette (+ red flash on impact)
      float vig = smoothstep(0.95, 0.28, r);
      col *= mix(0.45, 1.0, vig);
      col = mix(col, col * vec3(1.5, 0.55, 0.5), uHit * (1.0 - vig) * 0.9);
      // film grain
      col += (hash(vUv * 1500.0) - 0.5) * 0.013;
      gl_FragColor = vec4(col, 1.0);
    }`,
}

/**
 * Owns the WebGL renderer, the optional post-processing chain and resize handling.
 * Scenes call `render(scene, camera)`; they never touch the composer directly.
 */
export class Renderer {
  readonly gl: THREE.WebGLRenderer
  private composer?: EffectComposer
  private bloom?: UnrealBloomPass
  private fxPass?: ShaderPass
  private preset: Preset
  private scene?: THREE.Scene
  private camera?: THREE.PerspectiveCamera
  private time = 0
  private fx = { speed: 0, hit: 0 }

  constructor(readonly canvas: HTMLCanvasElement, quality: Quality) {
    this.preset = QUALITY_PRESETS[quality]
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: this.preset.antialias, powerPreference: 'high-performance' })
    this.gl.outputColorSpace = THREE.SRGBColorSpace
    this.gl.toneMapping = THREE.ACESFilmicToneMapping
    this.gl.toneMappingExposure = 1.08
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap
    this.applyQuality(quality)
    window.addEventListener('resize', () => this.resize())
  }

  get shadowMapSize(): number {
    return this.preset.shadowMap
  }

  get rainAllowed(): boolean {
    return this.preset.rain
  }

  get fxAllowed(): boolean {
    return this.preset.fx
  }

  /** speed 0..1 drives blur/aberration, hit 0..1 flashes the vignette on impact. */
  setFx(speed: number, hit: number): void {
    this.fx.speed = speed
    this.fx.hit = hit
  }

  applyQuality(quality: Quality): void {
    this.preset = QUALITY_PRESETS[quality]
    this.gl.shadowMap.enabled = this.preset.shadows
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.preset.pixelRatio))
    this.bloom?.dispose()
    this.composer?.dispose()
    this.composer = undefined
    this.bloom = undefined
    this.fxPass = undefined
    this.resize()
  }

  private ensureComposer(scene: THREE.Scene, camera: THREE.PerspectiveCamera): EffectComposer | undefined {
    if (!this.preset.bloom && !this.preset.fx) return undefined
    if (this.composer && this.scene === scene && this.camera === camera) return this.composer
    this.scene = scene
    this.camera = camera
    const size = this.gl.getSize(new THREE.Vector2())
    const pr = this.gl.getPixelRatio()
    const target = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples: this.preset.msaa })
    this.composer = new EffectComposer(this.gl, target)
    this.composer.setPixelRatio(pr)
    this.composer.addPass(new RenderPass(scene, camera))
    if (this.preset.bloom) {
      this.bloom = new UnrealBloomPass(size, 0.28, 0.45, 0.92)
      this.composer.addPass(this.bloom)
    }
    if (this.preset.fx) {
      this.fxPass = new ShaderPass(CinematicShader)
      this.composer.addPass(this.fxPass)
    }
    this.composer.addPass(new OutputPass())
    this.composer.setSize(size.x, size.y)
    return this.composer
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.gl.setSize(w, h, false)
    this.composer?.setSize(w, h)
    if (this.camera) {
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    }
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    if (Math.abs(camera.aspect - w / h) > 1e-3) {
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const composer = this.ensureComposer(scene, camera)
    if (composer) {
      this.time = (this.time + 1 / 60) % 1000
      if (this.fxPass) {
        const u = this.fxPass.uniforms
        u.uTime.value = this.time
        u.uSpeed.value = this.fx.speed
        u.uHit.value = this.fx.hit
        u.uAspect.value = w / h
      }
      composer.render()
    } else this.gl.render(scene, camera)
  }
}
