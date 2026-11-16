import * as THREE from 'three'

/**
 * Bakes a tiny night-city "studio" (dark sky, warm sodium strips, cool neon panels) into a
 * PMREM cube so paint, glass and wet asphalt have something real to reflect.
 */
export function buildNightEnvironment(gl: THREE.WebGLRenderer): THREE.Texture {
  const env = new THREE.Scene()
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: 'varying vec3 v; void main(){ v = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec3 v; void main(){
        float h = normalize(v).y;
        vec3 c = mix(vec3(0.16,0.09,0.07), vec3(0.04,0.07,0.14), smoothstep(-0.05,0.45,h));
        c = mix(c, vec3(0.012,0.02,0.05), smoothstep(0.4,1.0,h));
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
  // street-lamp strips down both sides
  for (let i = 0; i < 6; i += 1) {
    panel('#ffb36b', 14, 3, 0.7, [-14, 12, -6 - i * 9])
    panel('#ffb36b', 14, 3, 0.7, [14, 12, -6 - i * 9])
  }
  // neon accents and a cool moon-ish key from behind the skyline
  panel('#4fb8ff', 10, 6, 14, [-22, 8, -20])
  panel('#ff3f8e', 9, 5, 12, [22, 7, -30])
  panel('#8fb4ff', 7, 18, 6, [-10, 26, -34])
  panel('#ffd7a0', 16, 22, 6, [0, 8, 30])
  panel('#9cc4ff', 10, 16, 8, [-16, 5, 24])
  panel('#ff7a5a', 9, 12, 5, [16, 4, 26])
  const pmrem = new THREE.PMREMGenerator(gl)
  const rt = pmrem.fromScene(env, 0.035)
  pmrem.dispose()
  env.traverse(o => {
    if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() }
  })
  return rt.texture
}
