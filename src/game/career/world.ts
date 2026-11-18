/**
 * Mapa-múndi da carreira. O jogador começa no Brasil e vai abrindo o mundo do "menos badalado" para o
 * "mais famoso": América Latina → América Central → África → Ásia → Europa menos badalada → América do Norte
 * → Europa famosa. A pista é sempre reta; o que muda por cidade é o clima do cenário (tema visual).
 *
 * Regra de abertura:
 *  - a PATENTE libera a fase (região) inteira;
 *  - dentro da fase, cada país custa uma "passagem" em créditos (a primeira cidade já vem junto);
 *  - cada cidade seguinte do país custa uma passagem menor.
 */
export type ScenarioTheme = 'cidade' | 'serra' | 'deserto'

export type WorldCity = { id: string; name: string; theme: ScenarioTheme }
export type WorldCountry = { id: string; name: string; flag: string; stage: number; cities: readonly WorldCity[] }
export type WorldStage = { id: number; name: string; rank: number }

/** Fases do mundo e a patente que cada uma exige (a patente 10 é a última nomeada). */
export const STAGES: readonly WorldStage[] = [
  { id: 1, name: 'Brasil', rank: 1 },
  { id: 2, name: 'América Latina', rank: 2 },
  { id: 3, name: 'América Central e Caribe', rank: 3 },
  { id: 4, name: 'África', rank: 4 },
  { id: 5, name: 'Ásia', rank: 5 },
  { id: 6, name: 'Europa menos badalada', rank: 6 },
  { id: 7, name: 'América do Norte e Oceania', rank: 7 },
  { id: 8, name: 'Europa famosa', rank: 8 },
]

const c = (id: string, name: string, theme: ScenarioTheme = 'cidade'): WorldCity => ({ id, name, theme })

/** Ordem do array = ordem de abertura dentro da fase (do menos famoso para o mais famoso). */
export const COUNTRIES: readonly WorldCountry[] = [
  { id: 'brasil', name: 'Brasil', flag: '🇧🇷', stage: 1, cities: [c('sao-paulo', 'São Paulo'), c('brasilia', 'Brasília'), c('curitiba', 'Curitiba', 'serra'), c('florianopolis', 'Florianópolis'), c('salvador', 'Salvador'), c('rio-de-janeiro', 'Rio de Janeiro', 'serra')] },
  { id: 'paraguai', name: 'Paraguai', flag: '🇵🇾', stage: 2, cities: [c('assuncao', 'Assunção')] },
  { id: 'bolivia', name: 'Bolívia', flag: '🇧🇴', stage: 2, cities: [c('santa-cruz-de-la-sierra', 'Santa Cruz de la Sierra'), c('la-paz', 'La Paz', 'serra')] },
  { id: 'venezuela', name: 'Venezuela', flag: '🇻🇪', stage: 2, cities: [c('caracas', 'Caracas')] },
  { id: 'equador', name: 'Equador', flag: '🇪🇨', stage: 2, cities: [c('guayaquil', 'Guayaquil'), c('quito', 'Quito', 'serra')] },
  { id: 'uruguai', name: 'Uruguai', flag: '🇺🇾', stage: 2, cities: [c('montevideu', 'Montevidéu')] },
  { id: 'peru', name: 'Peru', flag: '🇵🇪', stage: 2, cities: [c('lima', 'Lima', 'deserto'), c('cusco', 'Cusco', 'serra')] },
  { id: 'chile', name: 'Chile', flag: '🇨🇱', stage: 2, cities: [c('santiago', 'Santiago', 'serra'), c('valparaiso', 'Valparaíso')] },
  { id: 'colombia', name: 'Colômbia', flag: '🇨🇴', stage: 2, cities: [c('medellin', 'Medellín', 'serra'), c('bogota', 'Bogotá', 'serra'), c('cartagena', 'Cartagena')] },
  { id: 'argentina', name: 'Argentina', flag: '🇦🇷', stage: 2, cities: [c('cordoba', 'Córdoba', 'serra'), c('buenos-aires', 'Buenos Aires')] },
  { id: 'mexico', name: 'México', flag: '🇲🇽', stage: 2, cities: [c('cancun', 'Cancún'), c('guadalajara', 'Guadalajara'), c('cidade-do-mexico', 'Cidade do México')] },
  { id: 'honduras', name: 'Honduras', flag: '🇭🇳', stage: 3, cities: [c('tegucigalpa', 'Tegucigalpa')] },
  { id: 'nicaragua', name: 'Nicarágua', flag: '🇳🇮', stage: 3, cities: [c('managua', 'Manágua')] },
  { id: 'el-salvador', name: 'El Salvador', flag: '🇸🇻', stage: 3, cities: [c('san-salvador', 'San Salvador')] },
  { id: 'belize', name: 'Belize', flag: '🇧🇿', stage: 3, cities: [c('cidade-de-belize', 'Cidade de Belize')] },
  { id: 'guatemala', name: 'Guatemala', flag: '🇬🇹', stage: 3, cities: [c('cidade-da-guatemala', 'Cidade da Guatemala'), c('antigua-guatemala', 'Antigua Guatemala', 'serra')] },
  { id: 'jamaica', name: 'Jamaica', flag: '🇯🇲', stage: 3, cities: [c('kingston', 'Kingston'), c('montego-bay', 'Montego Bay')] },
  { id: 'costa-rica', name: 'Costa Rica', flag: '🇨🇷', stage: 3, cities: [c('san-jose', 'San José', 'serra')] },
  { id: 'cuba', name: 'Cuba', flag: '🇨🇺', stage: 3, cities: [c('havana', 'Havana')] },
  { id: 'panama', name: 'Panamá', flag: '🇵🇦', stage: 3, cities: [c('cidade-do-panama', 'Cidade do Panamá')] },
  { id: 'republica-dominicana', name: 'República Dominicana', flag: '🇩🇴', stage: 3, cities: [c('santo-domingo', 'Santo Domingo'), c('punta-cana', 'Punta Cana')] },
  { id: 'porto-rico', name: 'Porto Rico', flag: '🇵🇷', stage: 3, cities: [c('san-juan', 'San Juan')] },
  { id: 'bahamas', name: 'Bahamas', flag: '🇧🇸', stage: 3, cities: [c('nassau', 'Nassau')] },
  { id: 'angola', name: 'Angola', flag: '🇦🇴', stage: 4, cities: [c('luanda', 'Luanda')] },
  { id: 'nigeria', name: 'Nigéria', flag: '🇳🇬', stage: 4, cities: [c('lagos', 'Lagos')] },
  { id: 'gana', name: 'Gana', flag: '🇬🇭', stage: 4, cities: [c('acra', 'Acra')] },
  { id: 'etiopia', name: 'Etiópia', flag: '🇪🇹', stage: 4, cities: [c('adis-abeba', 'Adis Abeba', 'serra')] },
  { id: 'tanzania', name: 'Tanzânia', flag: '🇹🇿', stage: 4, cities: [c('dar-es-salaam', 'Dar es Salaam')] },
  { id: 'quenia', name: 'Quênia', flag: '🇰🇪', stage: 4, cities: [c('nairobi', 'Nairóbi')] },
  { id: 'tunisia', name: 'Tunísia', flag: '🇹🇳', stage: 4, cities: [c('tunis', 'Túnis')] },
  { id: 'africa-do-sul', name: 'África do Sul', flag: '🇿🇦', stage: 4, cities: [c('joanesburgo', 'Joanesburgo'), c('cidade-do-cabo', 'Cidade do Cabo', 'serra')] },
  { id: 'marrocos', name: 'Marrocos', flag: '🇲🇦', stage: 4, cities: [c('casablanca', 'Casablanca'), c('marrakech', 'Marrakech', 'deserto')] },
  { id: 'egito', name: 'Egito', flag: '🇪🇬', stage: 4, cities: [c('alexandria', 'Alexandria'), c('cairo', 'Cairo', 'deserto')] },
  { id: 'paquistao', name: 'Paquistão', flag: '🇵🇰', stage: 5, cities: [c('carachi', 'Carachi')] },
  { id: 'bangladesh', name: 'Bangladesh', flag: '🇧🇩', stage: 5, cities: [c('daca', 'Daca')] },
  { id: 'sri-lanka', name: 'Sri Lanka', flag: '🇱🇰', stage: 5, cities: [c('colombo', 'Colombo')] },
  { id: 'filipinas', name: 'Filipinas', flag: '🇵🇭', stage: 5, cities: [c('manila', 'Manila')] },
  { id: 'indonesia', name: 'Indonésia', flag: '🇮🇩', stage: 5, cities: [c('jacarta', 'Jacarta'), c('bali', 'Bali')] },
  { id: 'vietna', name: 'Vietnã', flag: '🇻🇳', stage: 5, cities: [c('ho-chi-minh', 'Ho Chi Minh'), c('hanoi', 'Hanói')] },
  { id: 'malasia', name: 'Malásia', flag: '🇲🇾', stage: 5, cities: [c('kuala-lumpur', 'Kuala Lumpur')] },
  { id: 'india', name: 'Índia', flag: '🇮🇳', stage: 5, cities: [c('mumbai', 'Mumbai'), c('nova-delhi', 'Nova Délhi')] },
  { id: 'tailandia', name: 'Tailândia', flag: '🇹🇭', stage: 5, cities: [c('phuket', 'Phuket'), c('bangkok', 'Bangkok')] },
  { id: 'taiwan', name: 'Taiwan', flag: '🇹🇼', stage: 5, cities: [c('taipe', 'Taipé')] },
  { id: 'arabia-saudita', name: 'Arábia Saudita', flag: '🇸🇦', stage: 5, cities: [c('riad', 'Riad', 'deserto')] },
  { id: 'catar', name: 'Catar', flag: '🇶🇦', stage: 5, cities: [c('doha', 'Doha', 'deserto')] },
  { id: 'singapura', name: 'Singapura', flag: '🇸🇬', stage: 5, cities: [c('singapura', 'Singapura')] },
  { id: 'coreia-do-sul', name: 'Coreia do Sul', flag: '🇰🇷', stage: 5, cities: [c('busan', 'Busan'), c('seul', 'Seul')] },
  { id: 'china', name: 'China', flag: '🇨🇳', stage: 5, cities: [c('pequim', 'Pequim'), c('xangai', 'Xangai'), c('hong-kong', 'Hong Kong')] },
  { id: 'emirados', name: 'Emirados Árabes', flag: '🇦🇪', stage: 5, cities: [c('abu-dhabi', 'Abu Dhabi', 'deserto'), c('dubai', 'Dubai', 'deserto')] },
  { id: 'japao', name: 'Japão', flag: '🇯🇵', stage: 5, cities: [c('quioto', 'Quioto'), c('osaka', 'Osaka'), c('toquio', 'Tóquio')] },
  { id: 'servia', name: 'Sérvia', flag: '🇷🇸', stage: 6, cities: [c('belgrado', 'Belgrado')] },
  { id: 'bulgaria', name: 'Bulgária', flag: '🇧🇬', stage: 6, cities: [c('sofia', 'Sófia')] },
  { id: 'romenia', name: 'Romênia', flag: '🇷🇴', stage: 6, cities: [c('bucareste', 'Bucareste')] },
  { id: 'hungria', name: 'Hungria', flag: '🇭🇺', stage: 6, cities: [c('budapeste', 'Budapeste')] },
  { id: 'croacia', name: 'Croácia', flag: '🇭🇷', stage: 6, cities: [c('zagreb', 'Zagreb'), c('dubrovnik', 'Dubrovnik')] },
  { id: 'polonia', name: 'Polônia', flag: '🇵🇱', stage: 6, cities: [c('cracovia', 'Cracóvia'), c('varsovia', 'Varsóvia')] },
  { id: 'republica-tcheca', name: 'República Tcheca', flag: '🇨🇿', stage: 6, cities: [c('praga', 'Praga')] },
  { id: 'finlandia', name: 'Finlândia', flag: '🇫🇮', stage: 6, cities: [c('helsinque', 'Helsinque')] },
  { id: 'noruega', name: 'Noruega', flag: '🇳🇴', stage: 6, cities: [c('oslo', 'Oslo', 'serra')] },
  { id: 'dinamarca', name: 'Dinamarca', flag: '🇩🇰', stage: 6, cities: [c('copenhague', 'Copenhague')] },
  { id: 'suecia', name: 'Suécia', flag: '🇸🇪', stage: 6, cities: [c('estocolmo', 'Estocolmo')] },
  { id: 'grecia', name: 'Grécia', flag: '🇬🇷', stage: 6, cities: [c('tessalonica', 'Tessalônica'), c('atenas', 'Atenas')] },
  { id: 'turquia', name: 'Turquia', flag: '🇹🇷', stage: 6, cities: [c('ancara', 'Ancara'), c('istambul', 'Istambul')] },
  { id: 'nova-zelandia', name: 'Nova Zelândia', flag: '🇳🇿', stage: 7, cities: [c('auckland', 'Auckland')] },
  { id: 'australia', name: 'Austrália', flag: '🇦🇺', stage: 7, cities: [c('perth', 'Perth', 'deserto'), c('melbourne', 'Melbourne'), c('sydney', 'Sydney')] },
  { id: 'canada', name: 'Canadá', flag: '🇨🇦', stage: 7, cities: [c('toronto', 'Toronto'), c('montreal', 'Montreal'), c('vancouver', 'Vancouver', 'serra')] },
  { id: 'eua', name: 'Estados Unidos', flag: '🇺🇸', stage: 7, cities: [c('miami', 'Miami'), c('las-vegas', 'Las Vegas', 'deserto'), c('chicago', 'Chicago'), c('los-angeles', 'Los Angeles'), c('nova-york', 'Nova York')] },
  { id: 'irlanda', name: 'Irlanda', flag: '🇮🇪', stage: 8, cities: [c('dublin', 'Dublin')] },
  { id: 'belgica', name: 'Bélgica', flag: '🇧🇪', stage: 8, cities: [c('bruxelas', 'Bruxelas')] },
  { id: 'austria', name: 'Áustria', flag: '🇦🇹', stage: 8, cities: [c('salzburgo', 'Salzburgo', 'serra'), c('viena', 'Viena')] },
  { id: 'holanda', name: 'Holanda', flag: '🇳🇱', stage: 8, cities: [c('roterda', 'Roterdã'), c('amsterda', 'Amsterdã')] },
  { id: 'suica', name: 'Suíça', flag: '🇨🇭', stage: 8, cities: [c('genebra', 'Genebra'), c('zurique', 'Zurique', 'serra')] },
  { id: 'portugal', name: 'Portugal', flag: '🇵🇹', stage: 8, cities: [c('porto', 'Porto'), c('lisboa', 'Lisboa')] },
  { id: 'espanha', name: 'Espanha', flag: '🇪🇸', stage: 8, cities: [c('sevilha', 'Sevilha'), c('barcelona', 'Barcelona'), c('madri', 'Madri')] },
  { id: 'alemanha', name: 'Alemanha', flag: '🇩🇪', stage: 8, cities: [c('hamburgo', 'Hamburgo'), c('berlim', 'Berlim'), c('munique', 'Munique', 'serra')] },
  { id: 'reino-unido', name: 'Reino Unido', flag: '🇬🇧', stage: 8, cities: [c('edimburgo', 'Edimburgo'), c('londres', 'Londres')] },
  { id: 'italia', name: 'Itália', flag: '🇮🇹', stage: 8, cities: [c('veneza', 'Veneza'), c('milao', 'Milão'), c('roma', 'Roma')] },
  { id: 'franca', name: 'França', flag: '🇫🇷', stage: 8, cities: [c('nice', 'Nice'), c('paris', 'Paris')] },
  { id: 'monaco', name: 'Mônaco', flag: '🇲🇨', stage: 8, cities: [c('monte-carlo', 'Monte Carlo')] },
]

export const FIRST_COUNTRY = 'brasil'
export const FIRST_CITY = 'sao-paulo'

export type WorldState = { countries: string[]; cities: string[] }

export const defaultWorld = (): WorldState => ({ countries: [FIRST_COUNTRY], cities: [FIRST_CITY] })

export const countryById = (id: string): WorldCountry | undefined => COUNTRIES.find(country => country.id === id)
export const countryOfCity = (cityId: string): WorldCountry | undefined => COUNTRIES.find(country => country.cities.some(city => city.id === cityId))
export const cityById = (id: string): WorldCity | undefined => countryOfCity(id)?.cities.find(city => city.id === id)
export const stageRank = (stage: number): number => STAGES.find(entry => entry.id === stage)?.rank ?? 1

/** Posição global do país na ordem de abertura (0 = Brasil). */
const countryOrder = (id: string): number => Math.max(0, COUNTRIES.findIndex(country => country.id === id))

const round100 = (value: number): number => Math.round(value / 100) * 100

/** Passagem do país: grátis no Brasil, cresce com a ordem de abertura (inclui a primeira cidade). */
export function countryTicket(id: string): number {
  const order = countryOrder(id)
  return order === 0 ? 0 : round100(2000 * Math.pow(order, 1.3))
}

/** Passagem de uma cidade além da primeira do país (a primeira vem com o país). */
export function cityTicket(cityId: string): number {
  const country = countryOfCity(cityId)
  if (!country) return 0
  const position = country.cities.findIndex(city => city.id === cityId)
  if (position <= 0) return 0
  const base = Math.max(1500, countryTicket(country.id) * 0.35)
  return round100(base * position)
}

/** Fase liberada pela patente? */
export const isCountryAvailable = (rank: number, countryId: string): boolean => {
  const country = countryById(countryId)
  return !!country && rank >= stageRank(country.stage)
}

export const isCityOwned = (world: WorldState, cityId: string): boolean => world.cities.includes(cityId)

/** Saneia o estado vindo do save: ids inválidos saem, e o ponto de partida sempre existe. */
export function parseWorld(raw: unknown): WorldState {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const list = (value: unknown, valid: (id: string) => boolean): string[] =>
    Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && valid(id)))] : []
  const countries = list(data.countries, id => !!countryById(id))
  const cities = list(data.cities, id => !!cityById(id))
  if (!countries.includes(FIRST_COUNTRY)) countries.unshift(FIRST_COUNTRY)
  if (!cities.includes(FIRST_CITY)) cities.unshift(FIRST_CITY)
  return { countries, cities }
}

export type TravelPurchase =
  | { success: true; balance: number; world: WorldState }
  | { success: false; reason: 'unknown' | 'already-owned' | 'rank-locked' | 'country-locked' | 'insufficient-credits'; balance: number; world: WorldState }

/** Compra a passagem de um país; a primeira cidade dele já vem junto. */
export function buyCountry(balance: number, world: WorldState, countryId: string, rank: number): TravelPurchase {
  const country = countryById(countryId)
  if (!country) return { success: false, reason: 'unknown', balance, world }
  if (world.countries.includes(countryId)) return { success: false, reason: 'already-owned', balance, world }
  if (!isCountryAvailable(rank, countryId)) return { success: false, reason: 'rank-locked', balance, world }
  const price = countryTicket(countryId)
  if (balance < price) return { success: false, reason: 'insufficient-credits', balance, world }
  return {
    success: true,
    balance: balance - price,
    world: { countries: [...world.countries, countryId], cities: [...new Set([...world.cities, country.cities[0].id])] },
  }
}

/** Compra a passagem de uma cidade de um país já aberto. */
export function buyCity(balance: number, world: WorldState, cityId: string, rank: number): TravelPurchase {
  const country = countryOfCity(cityId)
  if (!country) return { success: false, reason: 'unknown', balance, world }
  if (world.cities.includes(cityId)) return { success: false, reason: 'already-owned', balance, world }
  if (!world.countries.includes(country.id)) return { success: false, reason: 'country-locked', balance, world }
  if (!isCountryAvailable(rank, country.id)) return { success: false, reason: 'rank-locked', balance, world }
  const price = cityTicket(cityId)
  if (balance < price) return { success: false, reason: 'insufficient-credits', balance, world }
  return { success: true, balance: balance - price, world: { ...world, cities: [...world.cities, cityId] } }
}
