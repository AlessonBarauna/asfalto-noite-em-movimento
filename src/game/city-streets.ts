/** Identidade da rua de cada cidade: o que existe ao redor da pista além dos prédios (canais, praia, neve, pedra). */
export type StreetId = 'canal' | 'beach' | 'snow' | 'cobble'

const GROUPS: Record<StreetId, string[]> = {
  // água dos dois lados, cais de pedra, postes de atracação e barcos
  canal: ['veneza', 'amsterda', 'bangkok', 'roterda', 'hamburgo', 'copenhague', 'bruxelas', 'porto'],
  // avenida à beira-mar: calçadão, areia, palmeiras e mar aberto de um lado
  beach: [
    'rio-de-janeiro', 'florianopolis', 'salvador', 'cancun', 'punta-cana', 'miami', 'los-angeles', 'sydney', 'nice', 'monte-carlo',
    'bali', 'phuket', 'havana', 'cartagena', 'montego-bay', 'nassau', 'san-juan', 'kingston', 'dar-es-salaam', 'valparaiso',
    'colombo', 'tessalonica', 'barcelona', 'guayaquil', 'montevideu', 'lagos', 'luanda', 'alexandria', 'busan', 'dubrovnik', 'doha', 'abu-dhabi',
  ],
  // inverno: neve acumulada nas calçadas e bancos de neve na beira da pista
  snow: ['oslo', 'helsinque', 'estocolmo', 'montreal', 'toronto', 'salzburgo', 'genebra', 'zurique', 'edimburgo', 'la-paz', 'cracovia', 'varsovia', 'munique', 'vancouver', 'chicago', 'nova-york'],
  // cidade histórica: a pista inteira é de paralelepípedo
  cobble: [
    'praga', 'budapeste', 'roma', 'lisboa', 'sevilha', 'cusco', 'antigua-guatemala', 'viena', 'istambul', 'atenas', 'quioto', 'marrakech',
    'tunis', 'madri', 'paris', 'londres', 'milao', 'quito', 'cordoba', 'zagreb', 'sofia', 'dublin', 'berlim', 'santo-domingo',
  ],
}

export const CITY_STREETS: Record<string, StreetId> = {}
for (const [style, ids] of Object.entries(GROUPS) as Array<[StreetId, string[]]>) for (const id of ids) CITY_STREETS[id] = style

export function streetOf(cityId: string): StreetId | null {
  return CITY_STREETS[cityId] ?? null
}

/** Lado do mar/da água de cada cidade, estável (1 = direita, -1 = esquerda). */
export function waterSide(cityId: string): 1 | -1 {
  let hash = 0
  for (const ch of cityId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash % 2 === 0 ? 1 : -1
}
