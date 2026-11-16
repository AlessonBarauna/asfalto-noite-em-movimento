import * as THREE from 'three'
import { BRAZILIAN_TRAFFIC_MODELS, roofRearZ } from './traffic-vehicles'
export function applyGarageVisuals(car: THREE.Group, wheelStyle: string, tintStyle: string, spoilerStyle: string, suspensionStyle: string, exhaustStyle = 'stock', headlightStyle = 'halogen'): void {
 const wheelColors:Record<string,string>={alloy:'#aeb7bb',black:'#171c20',sport:'#b9874b'}, tintColors:Record<string,string>={light:'#607985',smoke:'#172a36',dark:'#080d12'}
 car.traverse(node=>{if(!(node instanceof THREE.Mesh))return
  if(node.name.includes('alloy-rim')||node.name.includes('alloy-wheel')){const mat=(Array.isArray(node.material)?node.material[0]:node.material).clone();if('color' in mat)(mat as THREE.MeshStandardMaterial).color.set(wheelColors[wheelStyle]??wheelColors.alloy);node.material=mat}
  if(/(glass|window|windshield)/i.test(node.name)){const mat=(Array.isArray(node.material)?node.material[0]:node.material).clone();if('color' in mat)(mat as THREE.MeshPhysicalMaterial).color.set(tintColors[tintStyle]??tintColors.smoke);node.material=mat}
 })
 const drop=suspensionStyle==='slammed'?0.15:suspensionStyle==='lowered'?0.08:0
 if(drop>0){const names=car.name==='gol-g5-player-car'?['gol-g5-body-group','gol-g5-glass-group','gol-g5-trim-group','gol-g5-lights-group']:['traffic-body','traffic-cabin','traffic-details'];for(const name of names){const group=car.getObjectByName(name);if(group instanceof THREE.Group)group.position.y-=drop}}
 const headlightColors:Record<string,{color:string;emissive:string;intensity:number}>={halogen:{color:'#fff0cc',emissive:'#ffcc77',intensity:0.75},xenon:{color:'#dceeff',emissive:'#9bcfff',intensity:2.8},led:{color:'#f4fbff',emissive:'#d8f1ff',intensity:3.8}}
 car.traverse(node=>{if(!(node instanceof THREE.Mesh)||!/(headlamp|headlight)/i.test(node.name))return
  const source=Array.isArray(node.material)?node.material[0]:node.material;const mat=source.clone() as THREE.MeshStandardMaterial
  if('color' in mat)mat.color.set(headlightColors[headlightStyle]?.color??headlightColors.halogen.color)
  if('emissive' in mat){mat.emissive.set(headlightColors[headlightStyle]?.emissive??headlightColors.halogen.emissive);mat.emissiveIntensity=headlightColors[headlightStyle]?.intensity??headlightColors.halogen.intensity}
  node.material=mat
  if(headlightStyle==='led'&&node.parent){const bounds=node.geometry.boundingBox??(node.geometry.computeBoundingBox(),node.geometry.boundingBox);if(bounds){const size=new THREE.Vector3();bounds.getSize(size);const strip=new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.06,size.x*0.78),Math.max(0.018,size.y*0.12),0.012),new THREE.MeshBasicMaterial({color:'#e8f8ff'}));strip.name=`garage-led-signature-${node.name}`;strip.position.set(node.position.x,node.position.y-size.y*0.27,node.position.z+size.z/2+0.012);node.parent.add(strip)}}
 })
 if(exhaustStyle!=='stock'){
  const spec=car.name==='gol-g5-player-car'?undefined:BRAZILIAN_TRAFFIC_MODELS.find(item=>item.id===car.name.replace(/^traffic-/,''))
  const exhaust=new THREE.Group();exhaust.name='garage-exhaust'
  const rearZ=spec?-spec.length*0.49:-1.94
  const centerX=spec?spec.width*0.34:0.63
  const positions=exhaustStyle==='dual'?[-centerX,centerX]:[centerX]
  for(const x of positions){const tip=new THREE.Mesh(new THREE.CylinderGeometry(0.072,0.082,0.2,16),new THREE.MeshStandardMaterial({color:'#aeb8bd',metalness:0.94,roughness:0.18}));tip.name='garage-exhaust-tip';tip.rotation.x=Math.PI/2;tip.position.set(x,0.31,rearZ-0.025);tip.castShadow=true;exhaust.add(tip);const inner=new THREE.Mesh(new THREE.CylinderGeometry(0.047,0.052,0.008,16),new THREE.MeshStandardMaterial({color:'#11161a',metalness:0.2,roughness:0.8}));inner.name='garage-exhaust-inner';inner.rotation.x=Math.PI/2;inner.position.set(x,0.31,rearZ-0.13);exhaust.add(inner)}
  car.add(exhaust)
 }
 if(spoilerStyle==='street'){
  const spoiler=new THREE.Group();spoiler.name='garage-street-spoiler'
  const bladeMat=new THREE.MeshStandardMaterial({color:'#151a1f',metalness:0.45,roughness:0.32}), supportMat=new THREE.MeshStandardMaterial({color:'#242a30',metalness:0.35,roughness:0.4})
  let width=1.28, roofY=1.66, rearZ=-1.42
  if(car.name!=='gol-g5-player-car'){const spec=BRAZILIAN_TRAFFIC_MODELS.find(item=>item.id===car.name.replace(/^traffic-/,''))
   if(spec){width=spec.width*(spec.utility==='van'?0.72:0.84);roofY=spec.roofHeight+0.045;rearZ=roofRearZ(spec)}}
  for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(0.045,0.16,0.075),supportMat);post.name=`spoiler-support-${side}`;post.position.set(side*width*0.31,roofY-0.08,rearZ);spoiler.add(post)}
  const blade=new THREE.Mesh(new THREE.BoxGeometry(width,0.075,0.25),bladeMat);blade.name='spoiler-wing';blade.position.set(0,roofY+0.015,rearZ-0.015);blade.castShadow=true;spoiler.add(blade);spoiler.position.y-=drop;car.add(spoiler)
 }
}
