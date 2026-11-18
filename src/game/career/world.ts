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
  { id: 7, name: 'América do Norte', rank: 7 },
  { id: 8, name: 'Europa famosa', rank: 8 },
]

const c = (id: string, name: string, theme: ScenarioTheme = 'cidade'): WorldCity => ({ id, name, theme })

/** Ordem do array = ordem de abertura dentro da fase (do menos famoso para o mais famoso). */
export const COUNTRIES: readonly WorldCountry[] = [
  { id: 'brasil', name: 'Brasil', flag: '🇧🇷', stage: 1, cities: [c('sao-paulo', 'São Paulo'), c('brasilia', 'Brasília'), c('curitiba', 'Curitiba', 'serra'), c('florianopolis', 'Florianópolis'), c('salvador', 'Salvador'), c('rio-de-janeiro', 'Rio de Janeiro', 'serra')] },
  { id: 'argentina', name: 'Argentina', flag: '🇦🇷', stage: 2, cities: [c('cordoba', 'Córdoba', 'serra'), c('buenos-aires', 'Buenos Aires')] },
  { id: 'uruguai', name: 'Uruguai', flag: '🇺🇾', stage: 2, cities: [c('montevideu', 'Montevidéu')] },
  { id: 'chile', name: 'Chile', flag: '🇨🇱', stage: 2, cities: [c('santiago', 'Santiago', 'serra')] },
  { id: 'peru', name: 'Peru', flag: '🇵🇪', stage: 2, cities: [c('lima', 'Lima', 'deserto')] },
  { id: 'colombia', name: 'Colômbia', flag: '🇨🇴', stage: 2, cities: [c('medellin', 'Medellín', 'serra'), c('bogota', 'Bogotá', 'serra')] },
  { id: 'mexico', name: 'México', flag: '🇲🇽', stage: 2, cities: [c('cancun', 'Cancún'), c('cidade-do-mexico', 'Cidade do México')] },
  { id: 'costa-rica', name: 'Costa Rica', flag: '🇨🇷', stage: 3, cities: [c('san-jose', 'San José', 'serra')] },
  { id: 'panama', name: 'Panamá', flag: '🇵🇦', stage: 3, cities: [c('cidade-do-panama', 'Cidade do Panamá')] },
  { id: 'cuba', name: 'Cuba', flag: '🇨🇺', stage: 3, cities: [c('havana', 'Havana')] },
  { id: 'quenia', name: 'Quênia', flag: '🇰🇪', stage: 4, cities: [c('nairobi', 'Nairóbi')] },
  { id: 'marrocos', name: 'Marrocos', flag: '🇲🇦', stage: 4, cities: [c('marrakech', 'Marrakech', 'deserto')] },
  { id: 'egito', name: 'Egito', flag: '🇪🇬', stage: 4, cities: [c('cairo', 'Cairo', 'deserto')] },
  { id: 'africa-do-sul', name: 'África do Sul', flag: '🇿🇦', stage: 4, cities: [c('cidade-do-cabo', 'Cidade do Cabo', 'serra')] },
  { id: 'india', name: 'Índia', flag: '🇮🇳', stage: 5, cities: [c('mumbai', 'Mumbai')] },
  { id: 'tailandia', name: 'Tailândia', flag: '🇹🇭', stage: 5, cities: [c('bangkok', 'Bangkok')] },
  { id: 'coreia-do-sul', name: 'Coreia do Sul', flag: '🇰🇷', stage: 5, cities: [c('seul', 'Seul')] },
  { id: 'china', name: 'China', flag: '🇨🇳', stage: 5, cities: [c('xangai', 'Xangai'), c('hong-kong', 'Hong Kong')] },
  { id: 'emirados', name: 'Emirados Árabes', flag: '🇦🇪', stage: 5, cities: [c('dubai', 'Dubai', 'deserto')] },
  { id: 'japao', name: 'Japão', flag: '🇯🇵', stage: 5, cities: [c('osaka', 'Osaka'), c('toquio', 'Tóquio')] },
  { id: 'polonia', name: 'Polônia', flag: '🇵🇱', stage: 6, cities: [c('varsovia', 'Varsóvia')] },
  { id: 'republica-tcheca', name: 'República Tcheca', flag: '🇨🇿', stage: 6, cities: [c('praga', 'Praga')] },
  { id: 'grecia', name: 'Grécia', flag: '🇬🇷', stage: 6, cities: [c('atenas', 'Atenas')] },
  { id: 'turquia', name: 'Turquia', flag: '🇹🇷', stage: 6, cities: [c('istambul', 'Istambul')] },
  { id: 'canada', name: 'Canadá', flag: '🇨🇦', stage: 7, cities: [c('toronto', 'Toronto')] },
  { id: 'eua', name: 'Estados Unidos', flag: '🇺🇸', stage: 7, cities: [c('miami', 'Miami'), c('las-vegas', 'Las Vegas', 'deserto'), c('los-angeles', 'Los Angeles'), c('nova-york', 'Nova York')] },
  { id: 'portugal', name: 'Portugal', flag: '🇵🇹', stage: 8, cities: [c('porto', 'Porto'), c('lisboa', 'Lisboa')] },
  { id: 'espanha', name: 'Espanha', flag: '🇪🇸', stage: 8, cities: [c('barcelona', 'Barcelona'), c('madri', 'Madri')] },
  { id: 'alemanha', name: 'Alemanha', flag: '🇩🇪', stage: 8, cities: [c('berlim', 'Berlim'), c('munique', 'Munique', 'serra')] },
  { id: 'reino-unido', name: 'Reino Unido', flag: '🇬🇧', stage: 8, cities: [c('londres', 'Londres')] },
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

const round50 = (value: number): number => Math.round(value / 50) * 50

/** Passagem do país: grátis no Brasil, cresce com a ordem de abertura (inclui a primeira cidade). */
export function countryTicket(id: string): number {
  const order = countryOrder(id)
  return order === 0 ? 0 : round50(600 * Math.pow(order, 1.3))
}

/** Passagem de uma cidade além da primeira do país (a primeira vem com o país). */
export function cityTicket(cityId: string): number {
  const country = countryOfCity(cityId)
  if (!country) return 0
  const position = country.cities.findIndex(city => city.id === cityId)
  if (position <= 0) return 0
  const base = Math.max(400, countryTicket(country.id) * 0.35)
  return round50(base * position)
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
