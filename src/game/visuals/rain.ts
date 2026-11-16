import * as THREE from 'three'
import { seeded } from './textures'

const VERT = /* glsl */ `
attribute float aSeed;
attribute float aEnd;
uniform float uTime;
uniform float uSpeed;
uniform vec3 uCenter;
varying float vAlpha;
void main() {
  vec3 p = position;
  float fall = 34.0;
  float y = mod(p.y - uTime * fall * (0.85 + aSeed * 0.3), 24.0);
  // the world rushes toward the camera, so streaks lean along +z with speed
  float zl = mod(p.z + uTime * uSpeed * 0.9, 90.0) - 70.0;
  float z = zl + uCenter.z;
  vec3 world = vec3(p.x, y, z);
  float len = 0.35 + uSpeed * 0.02;
  world.y += aEnd * len;
  world.z -= aEnd * len * (uSpeed * 0.06 + 0.15);
  vAlpha = (1.0 - aEnd * 0.85) * (0.1 + aSeed * 0.16) * smoothstep(0.0, 1.5, y) * smoothstep(-70.0, -48.0, zl) * (1.0 - smoothstep(8.0, 20.0, zl));
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`

const FRAG = /* glsl */ `
varying float vAlpha;
void main() { gl_FragColor = vec4(0.72, 0.82, 0.95, vAlpha); }`

/** GPU-animated rain streaks (one draw call, zero per-frame CPU work). */
export class Rain {
  readonly mesh: THREE.LineSegments
  private readonly material: THREE.ShaderMaterial
  constructor(count = 1700) {
    const rnd = seeded(99)
    const pos = new Float32Array(count * 6)
    const seed = new Float32Array(count * 2)
    const end = new Float32Array(count * 2)
    for (let i = 0; i < count; i += 1) {
      const x = (rnd() - 0.5) * 44
      const y = rnd() * 24
      const z = rnd() * 90
      const s = rnd()
      for (let k = 0; k < 2; k += 1) {
        pos.set([x, y, z], (i * 2 + k) * 3)
        seed[i * 2 + k] = s
        end[i * 2 + k] = k
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1))
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 }, uSpeed: { value: 0 }, uCenter: { value: new THREE.Vector3() } },
      transparent: true,
      depthWrite: false,
      fog: false,
    })
    this.mesh = new THREE.LineSegments(geo, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 5
  }
  set enabled(on: boolean) { this.mesh.visible = on }
  get enabled(): boolean { return this.mesh.visible }
  update(time: number, speed: number, followZ: number): void {
    this.material.uniforms.uTime.value = time
    this.material.uniforms.uSpeed.value = speed
    this.material.uniforms.uCenter.value.z = followZ
  }
}
