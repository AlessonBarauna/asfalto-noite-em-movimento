import * as THREE from 'three'
import type { Scenario } from '../scenarios'

/**
 * Bakes a tiny night-city "studio" (dark sky, warm sodium strips, cool neon panels) into a
 * PMREM cube so paint, glass and wet asphalt have something real to reflect.
 */
export function buildEnvironment(gl: THREE.WebGLRenderer, scenario: Scenario): THREE.Texture {
  const env = new THREE.Scene()
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: 'varying vec3 v; void main(){ v = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      uniforms: { uH: { value: new THREE.Vector3(...scenario.sky.horizon) }, uM: { value: new THREE.Vector3(...scenario.sky.mid) }, uZ: { value: new THREE.Vector3(...scenario.sky.zenith) } },
      fragmentShader: `varying vec3 v; uniform vec3 uH, uM, uZ; void main(){
        float h = normalize(v).y;
        vec3 c = mix(uH * 0.5, uM, smoothstep(-0.05,0.45,h));
        c = mix(c, uZ, smoothstep(0.4,1.0,h));
        gl_FragColor = vec4(c,1.);}`,
    }),
  )
  env.add(sky)
  const panel = (color: string, intensity: number, w: number, h: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }))
    m.position.set(...pos)
    m.lookAt(0, 0, 0)
    env.add(m)
  }
  if (scenario.id === 'cidade') {
    // street-lamp strips down both sides, neon accents, and warm/cool fills behind the car
    for (let i = 0; i < 6; i += 1) {
      panel('#ffb36b', 14, 3, 0.7, [-14, 12, -6 - i * 9])
      panel('#ffb36b', 14, 3, 0.7, [14, 12, -6 - i * 9])
    }
    panel('#4fb8ff', 10, 6, 14, [-22, 8, -20])
    panel('#ff3f8e', 9, 5, 12, [22, 7, -30])
    panel('#8fb4ff', 7, 18, 6, [-10, 26, -34])
    panel('#ffd7a0', 16, 22, 6, [0, 8, 30])
    panel('#9cc4ff', 10, 16, 8, [-16, 5, 24])
    panel('#ff7a5a', 9, 12, 5, [16, 4, 26])
  } else if (scenario.id === 'serra') {
    // cold moon key plus a faint warm tail-light bounce behind the car
    panel('#9cc4ff', 12, 22, 10, [-20, 30, -40])
    panel('#7fa6e8', 6, 30, 6, [0, 10, -45])
    panel('#c9dcff', 9, 20, 6, [0, 8, 30])
    panel('#ff9a6a', 3, 10, 3, [14, 3, 26])
  } else {
    // low orange sun ahead, warm sand bounce, cool sky fill overhead
    panel('#ffb066', 40, 34, 14, [0, 7, -48])
    panel('#e89a5a', 10, 40, 8, [0, 3, 30])
    panel('#6f88d8', 5, 40, 40, [0, 40, 0])
    panel('#ffc890', 12, 20, 6, [-22, 6, 18])
  }
  const pmrem = new THREE.PMREMGenerator(gl)
  const rt = pmrem.fromScene(env, 0.035)
  pmrem.dispose()
  env.traverse(o => {
    if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() }
  })
  return rt.texture
}
