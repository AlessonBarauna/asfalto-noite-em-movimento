import type { LandmarkId } from './landmarks'
import { COUNTRIES } from './career/world'

/** Clima de cada cidade: ajusta cor do céu, da névoa e do chão por cima do cenário-base (cidade/serra/deserto). */
export type MoodId = 'neon' | 'tropical' | 'golden' | 'cold' | 'violet' | 'dusty'

export type CityLook = { mood: MoodId; marks: readonly LandmarkId[] }

export type Mood = {
  fog?: string
  ground?: string
  zenith?: readonly [number, number, number]
  mid?: readonly [number, number, number]
  horizon?: readonly [number, number, number]
  glow?: readonly [number, number, number]
}

export const MOODS: Record<MoodId, Mood> = {
  neon: {},
  tropical: { fog: '#251c2c', ground: '#0d1114', mid: [0.06, 0.09, 0.2], horizon: [0.55, 0.24, 0.3], glow: [0.45, 0.17, 0.14] },
  golden: { fog: '#33241f', ground: '#14100c', mid: [0.1, 0.1, 0.2], horizon: [0.8, 0.42, 0.22], glow: [0.6, 0.25, 0.08] },
  cold: { fog: '#14202b', ground: '#0b1116', zenith: [0.01, 0.025, 0.07], mid: [0.03, 0.07, 0.16], horizon: [0.22, 0.32, 0.45], glow: [0.1, 0.2, 0.3] },
  violet: { fog: '#1c1730', ground: '#0c0d16', mid: [0.07, 0.06, 0.2], horizon: [0.4, 0.18, 0.5], glow: [0.3, 0.1, 0.35] },
  dusty: { fog: '#2e2418', ground: '#17120d', mid: [0.09, 0.08, 0.14], horizon: [0.65, 0.4, 0.25], glow: [0.5, 0.25, 0.1] },
}

type Entry = [string, MoodId, LandmarkId[]]

const TABLE: Entry[] = [
  // Brasil
  ['sao-paulo', 'neon', ['ponte-estaiada', 'catedral', 'torre-tv']],
  ['brasilia', 'golden', ['catedral-brasilia', 'cupula', 'torre-tv']],
  ['curitiba', 'cold', ['torre-tv', 'serrania', 'farol']],
  ['florianopolis', 'tropical', ['ponte-pensil', 'farol', 'resort']],
  ['salvador', 'tropical', ['colonial-colorido', 'farol', 'campanile']],
  ['rio-de-janeiro', 'tropical', ['cristo', 'pao-acucar', 'arco']],
  // América Latina
  ['assuncao', 'tropical', ['cupula', 'colonial', 'farol']],
  ['santa-cruz-de-la-sierra', 'tropical', ['colonial', 'catedral', 'campanile']],
  ['la-paz', 'cold', ['vulcao', 'torre-tv', 'colonial']],
  ['caracas', 'tropical', ['serrania', 'torre-tv', 'cupula']],
  ['guayaquil', 'tropical', ['farol', 'colonial', 'resort']],
  ['quito', 'cold', ['estatua-colina', 'vulcao', 'colonial']],
  ['montevideu', 'golden', ['campanile', 'farol', 'cupula']],
  ['lima', 'dusty', ['colonial', 'piramide-degraus', 'farol']],
  ['cusco', 'cold', ['piramide-degraus', 'colonial', 'serrania']],
  ['santiago', 'cold', ['torre-cn', 'alpes', 'estatua-colina']],
  ['valparaiso', 'tropical', ['colonial-colorido', 'farol', 'campanile']],
  ['medellin', 'tropical', ['torre-tv', 'colonial', 'serrania']],
  ['bogota', 'cold', ['estatua-colina', 'torre-tv', 'catedral']],
  ['cartagena', 'tropical', ['colonial-colorido', 'castelo', 'farol']],
  ['cordoba', 'golden', ['catedral', 'cupula', 'serrania']],
  ['buenos-aires', 'golden', ['agulha', 'cupula', 'catedral']],
  ['cancun', 'tropical', ['resort', 'piramide-degraus', 'farol']],
  ['guadalajara', 'golden', ['catedral', 'cupula', 'colonial']],
  ['cidade-do-mexico', 'golden', ['piramide-degraus', 'cupula-dourada', 'torre-tv']],
  // América Central e Caribe
  ['tegucigalpa', 'tropical', ['catedral', 'colonial', 'serrania']],
  ['managua', 'tropical', ['vulcao', 'catedral', 'farol']],
  ['san-salvador', 'tropical', ['vulcao', 'colonial', 'cupula']],
  ['cidade-de-belize', 'tropical', ['farol', 'colonial-colorido', 'resort']],
  ['cidade-da-guatemala', 'tropical', ['piramide-degraus', 'catedral', 'vulcao']],
  ['antigua-guatemala', 'tropical', ['vulcao', 'colonial-colorido', 'arco']],
  ['kingston', 'tropical', ['serrania', 'colonial-colorido', 'farol']],
  ['montego-bay', 'tropical', ['resort', 'farol', 'colonial-colorido']],
  ['san-jose', 'tropical', ['vulcao', 'colonial', 'catedral']],
  ['havana', 'tropical', ['colonial', 'cupula', 'castelo']],
  ['cidade-do-panama', 'tropical', ['ponte-pensil', 'taipei', 'farol']],
  ['santo-domingo', 'tropical', ['colonial', 'catedral', 'farol']],
  ['punta-cana', 'tropical', ['resort', 'farol', 'colonial-colorido']],
  ['san-juan', 'tropical', ['castelo', 'colonial-colorido', 'farol']],
  ['nassau', 'tropical', ['resort', 'farol', 'colonial-colorido']],
  // África
  ['luanda', 'dusty', ['farol', 'castelo', 'taipei']],
  ['lagos', 'dusty', ['ponte-pensil', 'taipei', 'mesquita']],
  ['acra', 'dusty', ['arco', 'colonial', 'farol']],
  ['adis-abeba', 'dusty', ['cupula', 'serrania', 'estatua-colina']],
  ['dar-es-salaam', 'tropical', ['mesquita', 'farol', 'resort']],
  ['nairobi', 'dusty', ['torre-tv', 'taipei', 'serrania']],
  ['tunis', 'dusty', ['mesquita', 'arco', 'colonial']],
  ['joanesburgo', 'dusty', ['torre-tv', 'taipei', 'serrania']],
  ['cidade-do-cabo', 'cold', ['mesa-montanha', 'farol', 'colonial']],
  ['casablanca', 'dusty', ['mesquita-alta', 'farol', 'colonial']],
  ['marrakech', 'dusty', ['mesquita-alta', 'castelo', 'colonial-colorido']],
  ['alexandria', 'dusty', ['farol', 'castelo', 'mesquita']],
  ['cairo', 'dusty', ['piramide', 'esfinge', 'mesquita']],
  // Ásia
  ['carachi', 'dusty', ['mesquita', 'cupula', 'farol']],
  ['daca', 'tropical', ['cupula', 'mesquita', 'taipei']],
  ['colombo', 'tropical', ['estupa', 'farol', 'torre-tv']],
  ['manila', 'tropical', ['colonial', 'catedral', 'taipei']],
  ['jacarta', 'tropical', ['agulha', 'mesquita', 'taipei']],
  ['bali', 'tropical', ['pagode-azul', 'resort', 'estupa']],
  ['ho-chi-minh', 'tropical', ['catedral', 'taipei', 'torre-tv']],
  ['hanoi', 'tropical', ['pagode', 'pagode-azul', 'colonial']],
  ['kuala-lumpur', 'violet', ['petronas', 'torre-tv', 'mesquita']],
  ['mumbai', 'tropical', ['portao-mar', 'ponte-estaiada', 'taipei']],
  ['nova-delhi', 'dusty', ['portao-india', 'cupula', 'mesquita']],
  ['phuket', 'tropical', ['estatua-colina', 'resort', 'estupa']],
  ['bangkok', 'violet', ['prang', 'estupa', 'taipei']],
  ['taipe', 'violet', ['taipei', 'pagode', 'torre-oriental']],
  ['riad', 'neon', ['taipei', 'torre-cn', 'mesquita']],
  ['doha', 'neon', ['burj', 'mesquita', 'farol']],
  ['singapura', 'violet', ['marina-bay', 'roda-gigante', 'torre-cn']],
  ['busan', 'violet', ['ponte-estaiada', 'torre-tv', 'pagode']],
  ['seul', 'violet', ['torre-tv', 'castelo', 'pagode']],
  ['pequim', 'violet', ['castelo', 'pagode', 'arco']],
  ['xangai', 'violet', ['torre-oriental', 'taipei', 'ponte-estaiada']],
  ['hong-kong', 'violet', ['taipei', 'estatua-colina', 'ponte-estaiada']],
  ['abu-dhabi', 'neon', ['mesquita', 'taipei', 'farol']],
  ['dubai', 'neon', ['burj', 'resort', 'taipei']],
  ['quioto', 'violet', ['pagode', 'torii', 'castelo']],
  ['osaka', 'violet', ['castelo', 'roda-gigante', 'torii']],
  ['toquio', 'violet', ['skytree', 'torre-toquio', 'torii']],
  // Europa menos badalada
  ['belgrado', 'cold', ['cupula', 'castelo', 'ponte-pensil']],
  ['sofia', 'cold', ['cupula-dourada', 'catedral', 'serrania']],
  ['bucareste', 'cold', ['cupula', 'arco', 'catedral']],
  ['budapeste', 'golden', ['gotica', 'castelo', 'ponte-pensil']],
  ['zagreb', 'cold', ['catedral', 'campanile-vermelho', 'cupula']],
  ['dubrovnik', 'golden', ['castelo', 'campanile-vermelho', 'farol']],
  ['cracovia', 'cold', ['castelo', 'catedral', 'gotica']],
  ['varsovia', 'cold', ['empire', 'castelo', 'colonial']],
  ['praga', 'golden', ['castelo', 'gotica', 'ponte-pensil']],
  ['helsinque', 'cold', ['cupula', 'catedral', 'farol']],
  ['oslo', 'cold', ['castelo', 'serrania', 'farol']],
  ['copenhague', 'cold', ['campanile-vermelho', 'castelo', 'farol']],
  ['estocolmo', 'cold', ['campanile', 'castelo', 'farol']],
  ['tessalonica', 'golden', ['campanile', 'castelo', 'farol']],
  ['atenas', 'golden', ['parthenon', 'colonial', 'cupula']],
  ['ancara', 'dusty', ['cupula', 'torre-tv', 'mesquita']],
  ['istambul', 'golden', ['mesquita', 'mesquita-alta', 'ponte-pensil']],
  // América do Norte e Oceania
  ['auckland', 'cold', ['torre-cn', 'vulcao', 'farol']],
  ['perth', 'dusty', ['farol', 'taipei', 'ponte-arco']],
  ['melbourne', 'neon', ['gotica', 'torre-cn', 'roda-gigante']],
  ['sydney', 'tropical', ['opera-sydney', 'ponte-arco', 'torre-cn']],
  ['toronto', 'cold', ['torre-cn', 'castelo', 'taipei']],
  ['montreal', 'cold', ['cupula', 'gotica', 'roda-gigante']],
  ['vancouver', 'cold', ['serrania', 'ponte-pensil', 'torre-cn']],
  ['miami', 'tropical', ['resort', 'farol', 'taipei']],
  ['las-vegas', 'violet', ['space-needle', 'roda-gigante', 'piramide']],
  ['chicago', 'neon', ['chicago', 'roda-gigante', 'ponte-pensil']],
  ['los-angeles', 'tropical', ['hollywood', 'resort', 'cupula']],
  ['nova-york', 'neon', ['empire', 'liberdade', 'ponte-pensil']],
  // Europa famosa
  ['dublin', 'cold', ['agulha', 'castelo', 'gotica']],
  ['bruxelas', 'golden', ['atomium', 'gotica', 'castelo']],
  ['viena', 'golden', ['roda-gigante', 'catedral', 'cupula-dourada']],
  ['salzburgo', 'cold', ['castelo', 'alpes', 'campanile']],
  ['roterda', 'cold', ['ponte-estaiada', 'moinho', 'taipei']],
  ['amsterda', 'golden', ['moinho', 'campanile-vermelho', 'colonial']],
  ['genebra', 'cold', ['jet', 'alpes', 'farol']],
  ['zurique', 'cold', ['alpes', 'gotica', 'campanile']],
  ['lisboa', 'golden', ['ponte-golden', 'castelo', 'estatua-colina']],
  ['porto', 'golden', ['ponte-arco', 'campanile', 'colonial']],
  ['sevilha', 'golden', ['campanile', 'castelo', 'cupula']],
  ['barcelona', 'golden', ['sagrada', 'torre-cn', 'farol']],
  ['madri', 'golden', ['arco', 'cupula', 'catedral']],
  ['hamburgo', 'cold', ['campanile', 'gotica', 'farol']],
  ['berlim', 'cold', ['brandemburgo', 'torre-oriental', 'cupula']],
  ['munique', 'cold', ['alpes', 'cupula', 'campanile']],
  ['edimburgo', 'cold', ['castelo-ardosia', 'gotica', 'serrania']],
  ['londres', 'cold', ['bigben', 'tower-bridge', 'roda-gigante']],
  ['veneza', 'golden', ['campanile', 'cupula-dourada', 'farol']],
  ['milao', 'golden', ['catedral', 'castelo', 'torre-cn']],
  ['roma', 'golden', ['coliseu', 'cupula', 'arco']],
  ['nice', 'golden', ['farol', 'resort', 'castelo']],
  ['paris', 'golden', ['eiffel', 'arco', 'notre']],
  ['monte-carlo', 'golden', ['resort', 'castelo', 'farol']],
]

export const CITY_LOOKS: Record<string, CityLook> = Object.fromEntries(TABLE.map(([id, mood, marks]) => [id, { mood, marks }]))

const FALLBACK: CityLook = { mood: 'neon', marks: [] }

export function cityLook(cityId: string): CityLook {
  return CITY_LOOKS[cityId] ?? FALLBACK
}

export const ALL_CITY_IDS: string[] = COUNTRIES.flatMap(country => country.cities.map(city => city.id))
