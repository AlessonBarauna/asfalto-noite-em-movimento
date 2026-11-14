import * as THREE from 'three'
import { BRAZILIAN_TRAFFIC_MODELS } from './traffic-vehicles'
export function applyGarageVisuals(car: THREE.Group, wheelStyle: string, tintStyle: string, spoilerStyle: string, suspensionStyle: string): void {
 const wheelColors:Record<string,string>={alloy:'#aeb7bb',black:'#171c20',sport:'#b9874b'}, tintColors:Record<string,string>={light:'#607985',smoke:'#172a36',dark:'#080d12'}
 car.traverse(node=>{if(!(node instanceof THREE.Mesh))return
  if(node.name.includes('alloy-rim')||node.name.includes('alloy-wheel')){const mat=(Array.isArray(node.material)?node.material[0]:node.material).clone();if('color' in mat)(mat as THREE.MeshStandardMaterial).color.set(wheelColors[wheelStyle]??wheelColors.alloy);node.material=mat}
  if(/(glass|window|windshield)/i.test(node.name)){const mat=(Array.isArray(node.material)?node.material[0]:node.material).clone();if('color' in mat)(mat as THREE.MeshPhysicalMaterial).color.set(tintColors[tintStyle]??tintColors.smoke);node.material=mat}
 })
 const drop=suspensionStyle==='slammed'?0.15:suspensionStyle==='lowered'?0.08:0
 if(drop>0){const names=car.name==='gol-g5-player-car'?['gol-g5-body-group','gol-g5-glass-group','gol-g5-trim-group','gol-g5-lights-group']:['traffic-body','traffic-cabin','traffic-details'];for(const name of names){const group=car.getObjectByName(name);if(group instanceof THREE.Group)group.position.y-=drop}}
 if(spoilerStyle==='street'){
  const spoiler=new THREE.Group();spoiler.name='garage-street-spoiler'
  const bladeMat=new THREE.MeshStandardMaterial({color:'#151a1f',metalness:0.45,roughness:0.32}), supportMat=new THREE.MeshStandardMaterial({color:'#242a30',metalness:0.35,roughness:0.4})
  let width=1.28, roofY=1.66, rearZ=-1.42
  if(car.name!=='gol-g5-player-car'){const spec=BRAZILIAN_TRAFFIC_MODELS.find(item=>item.id===car.name.replace(/^traffic-/,''))
   if(spec){width=spec.width*(spec.utility==='van'?0.72:0.84);roofY=spec.roofHeight+0.045;rearZ=spec.utility==='pickup'?0.45-spec.cabinLength*0.34:spec.utility==='van'?-spec.length*0.42:-0.06-spec.cabinLength*0.34}}
  for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(0.045,0.16,0.075),supportMat);post.name=`spoiler-support-${side}`;post.position.set(side*width*0.31,roofY-0.08,rearZ);spoiler.add(post)}
  const blade=new THREE.Mesh(new THREE.BoxGeometry(width,0.075,0.25),bladeMat);blade.name='spoiler-wing';blade.position.set(0,roofY+0.015,rearZ-0.015);blade.castShadow=true;spoiler.add(blade);spoiler.position.y-=drop;car.add(spoiler)
 }
}
