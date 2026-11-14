import {describe,expect,it} from 'vitest'
import * as THREE from 'three'
import {createGolG5Model} from './gol-g5'
import {createBrazilianTrafficVehicle} from './traffic-vehicles'
import {applyGarageVisuals} from './garage-visuals'
describe('garage exterior visual upgrades',()=>{
 it('adds a street spoiler to the Gol G5',()=>{const car=createGolG5Model();applyGarageVisuals(car,'alloy','smoke','street','stock');expect(car.getObjectByName('garage-street-spoiler')).toBeInstanceOf(THREE.Group);expect(car.getObjectByName('spoiler-wing')).toBeInstanceOf(THREE.Mesh)})
 it('lowers the body while keeping wheels at road height',()=>{const car=createGolG5Model(),body=car.getObjectByName('gol-g5-body-group')!,wheels=car.getObjectByName('gol-g5-wheels-group')!,y=wheels.position.y;applyGarageVisuals(car,'alloy','smoke','none','lowered');expect(body.position.y).toBeCloseTo(-0.08);expect(wheels.position.y).toBe(y)})
 it('supports other Brazilian cars',()=>{const car=createBrazilianTrafficVehicle('saveiro','#4a5052');applyGarageVisuals(car,'black','dark','street','slammed');expect(car.getObjectByName('garage-street-spoiler')).toBeInstanceOf(THREE.Group);expect(car.getObjectByName('traffic-body')?.position.y).toBeCloseTo(-0.15)})
})


describe('exhaust and headlight visual upgrades',()=>{
 it('adds sport and dual exhaust tips',()=>{const car=createGolG5Model();applyGarageVisuals(car,'alloy','smoke','none','stock','sport','halogen');expect(car.getObjectByName('garage-exhaust')).toBeInstanceOf(THREE.Group);expect(car.getObjectByName('garage-exhaust')?.children).toHaveLength(2);const dual=createBrazilianTrafficVehicle('saveiro','#4a5052');applyGarageVisuals(dual,'alloy','smoke','none','stock','dual','halogen');expect(dual.getObjectByName('garage-exhaust')?.children).toHaveLength(4)})
 it('adds LED signatures to Gol G5 headlights',()=>{const car=createGolG5Model();applyGarageVisuals(car,'alloy','smoke','none','stock','stock','led');expect(car.getObjectByName('garage-led-signature-gol-g5-headlamp--1')).toBeInstanceOf(THREE.Mesh);expect(car.getObjectByName('garage-led-signature-gol-g5-headlamp-1')).toBeInstanceOf(THREE.Mesh)})
})
