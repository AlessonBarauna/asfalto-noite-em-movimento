import * as THREE from 'three'

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
  vec3 zenith = vec3(0.012, 0.027, 0.07);
  vec3 mid = vec3(0.045, 0.085, 0.16);
  vec3 horizon = vec3(0.42, 0.22, 0.2);
  vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, h));
  col = mix(col, zenith, smoothstep(0.18, 0.85, h));
  // sodium / neon city glow low on the horizon, strongest straight ahead
  float ahead = pow(max(0.0, -d.z), 3.0);
  col += vec3(0.34, 0.15, 0.07) * exp(-h * 9.0) * (0.35 + 0.65 * ahead);
  col += vec3(0.05, 0.12, 0.2) * exp(-abs(h - 0.12) * 18.0) * 0.5;
  // stars (fade near the glowing horizon)
  vec2 sp = d.xz / (abs(d.y) + 0.35) * 70.0;
  float s = step(0.9965, hash(floor(sp))) * (0.5 + 0.5 * sin(uTime * 2.0 + hash(floor(sp)) * 40.0));
  col += vec3(0.9, 0.95, 1.0) * s * smoothstep(0.12, 0.5, h);
  // moon
  vec3 moonDir = normalize(vec3(-0.34, 0.5, -0.8));
  float md = dot(d, moonDir);
  col += vec3(1.0, 0.97, 0.9) * smoothstep(0.9984, 0.9992, md) * 1.6;
  col += vec3(0.35, 0.42, 0.6) * pow(max(md, 0.0), 90.0) * 0.55;
  // slow low clouds lit from below by the city
  vec2 cuv = d.xz / (d.y + 0.25) * 1.6 + vec2(uTime * 0.004, 0.0);
  float cl = smoothstep(0.5, 0.85, fbm(cuv * 1.4));
  col = mix(col, col * 0.55 + vec3(0.16, 0.085, 0.07) * 0.8, cl * smoothstep(0.02, 0.3, h) * (1.0 - smoothstep(0.4, 0.8, h)) * 0.8);
  gl_FragColor = vec4(col, 1.0);
}`

export class Sky {
  readonly mesh: THREE.Mesh
  private readonly material: THREE.ShaderMaterial
  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 } },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -10
  }
  update(time: number, followZ: number): void {
    this.material.uniforms.uTime.value = time
    this.mesh.position.z = followZ
  }
}
