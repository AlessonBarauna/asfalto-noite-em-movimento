import * as THREE from 'three'
import type { Scenario } from '../scenarios'

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // always at the far plane
}`

const FRAG = /* glsl */ `
varying vec3 vDir;
uniform float uTime;
uniform vec3 uZenith, uMid, uHorizon, uGlow, uBand, uBodyDir, uBodyColor, uHaloColor, uCloud;
uniform float uStars, uHaloPower, uHaloAmount;
uniform vec2 uBodyEdge;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
  col = mix(col, uZenith, smoothstep(0.18, 0.85, h));
  float ahead = pow(max(0.0, -d.z), 3.0);
  col += uGlow * exp(-h * 9.0) * (0.35 + 0.65 * ahead);
  col += uBand * exp(-abs(h - 0.12) * 18.0) * 0.5;
  vec2 sp = d.xz / (abs(d.y) + 0.35) * 70.0;
  float s = step(0.9965, hash(floor(sp))) * (0.5 + 0.5 * sin(uTime * 2.0 + hash(floor(sp)) * 40.0));
  col += vec3(0.9, 0.95, 1.0) * s * smoothstep(0.12, 0.5, h) * uStars;
  float md = dot(d, normalize(uBodyDir));
  col += uBodyColor * smoothstep(uBodyEdge.x, uBodyEdge.y, md);
  col += uHaloColor * pow(max(md, 0.0), uHaloPower) * uHaloAmount;
  vec2 cuv = d.xz / (d.y + 0.25) * 1.6 + vec2(uTime * 0.004, 0.0);
  float cl = smoothstep(0.5, 0.85, fbm(cuv * 1.4));
  col = mix(col, col * 0.55 + uCloud * 0.8, cl * smoothstep(0.02, 0.3, h) * (1.0 - smoothstep(0.4, 0.8, h)) * 0.8);
  gl_FragColor = vec4(col, 1.0);
}`

const v3 = (v: readonly [number, number, number]) => new THREE.Vector3(...v)

export class Sky {
  readonly mesh: THREE.Mesh
  private readonly material: THREE.ShaderMaterial
  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uZenith: { value: new THREE.Vector3() }, uMid: { value: new THREE.Vector3() }, uHorizon: { value: new THREE.Vector3() },
        uGlow: { value: new THREE.Vector3() }, uBand: { value: new THREE.Vector3() }, uBodyDir: { value: new THREE.Vector3() },
        uBodyColor: { value: new THREE.Vector3() }, uHaloColor: { value: new THREE.Vector3() }, uCloud: { value: new THREE.Vector3() },
        uStars: { value: 1 }, uHaloPower: { value: 90 }, uHaloAmount: { value: 0.5 }, uBodyEdge: { value: new THREE.Vector2(0.9984, 0.9992) },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -10
  }
  setPalette(p: Scenario['sky']): void {
    const u = this.material.uniforms
    u.uZenith.value.copy(v3(p.zenith)); u.uMid.value.copy(v3(p.mid)); u.uHorizon.value.copy(v3(p.horizon))
    u.uGlow.value.copy(v3(p.glow)); u.uBand.value.copy(v3(p.band)); u.uBodyDir.value.copy(v3(p.bodyDir))
    u.uBodyColor.value.copy(v3(p.bodyColor)); u.uHaloColor.value.copy(v3(p.haloColor)); u.uCloud.value.copy(v3(p.cloud))
    u.uStars.value = p.stars; u.uHaloPower.value = p.haloPower; u.uHaloAmount.value = p.haloAmount
    u.uBodyEdge.value.set(p.bodyEdge[0], p.bodyEdge[1])
  }
  update(time: number, followZ: number): void {
    this.material.uniforms.uTime.value = time
    this.mesh.position.z = followZ
  }
}
