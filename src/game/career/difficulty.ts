/**
 * Dificuldade por cidade: quanto mais longe no mapa (fase do país) e mais caótica a cidade, mais denso o trânsito.
 * O pagamento (créditos e XP) sobe junto com a densidade. O clima também varia por cidade.
 */
import { countryOfCity } from './world'

/** Megacidades de trânsito pesado: +8% de densidade. */
const CHAOTIC = new Set(['sao-paulo', 'cairo', 'mumbai', 'jacarta', 'manila', 'lagos', 'daca', 'istambul', 'nova-delhi', 'hong-kong', 'cidade-do-mexico', 'bangkok', 'ho-chi-minh'])
/** Cidades de chuva frequente (mesmo se o tema-base for seco). */
const RAINY = new Set(['londres', 'edimburgo', 'dublin', 'amsterda', 'roterda', 'bruxelas', 'vancouver', 'porto', 'paris', 'cidade-de-belize', 'kingston', 'montego-bay', 'dar-es-salaam', 'ho-chi-minh', 'bangkok', 'phuket', 'bali', 'manila', 'jacarta', 'kuala-lumpur', 'singapura', 'medellin', 'guayaquil', 'salvador', 'rio-de-janeiro', 'curitiba', 'cartagena', 'san-juan', 'nassau'])
/** Cidades de céu limpo. */
const DRY = new Set(['los-angeles', 'madri', 'sevilha', 'barcelona', 'atenas', 'tessalonica', 'marrakech', 'casablanca', 'tunis', 'lima', 'santiago', 'valparaiso', 'cordoba', 'dubrovnik', 'cusco', 'perth', 'sydney', 'cancun', 'punta-cana', 'miami'])

export const WEATHER_CITIES = { chaotic: CHAOTIC, rainy: RAINY, dry: DRY }

/** Multiplicador da densidade do trânsito e do pagamento (1 em São Paulo no começo, até ~1,36). */
export function cityDifficulty(cityId: string): number {
  const stage = countryOfCity(cityId)?.stage ?? 1
  const factor = 1 + (stage - 1) * 0.04 + (CHAOTIC.has(cityId) ? 0.08 : 0)
  return Math.round(Math.min(1.4, factor) * 100) / 100
}

/** Chuva da cidade: usa o clima definido aqui; senão, o do tema-base. */
export function cityRain(cityId: string, themeRain: boolean): boolean {
  if (RAINY.has(cityId)) return true
  if (DRY.has(cityId)) return false
  return themeRain
}

export function difficultyLabel(cityId: string): string {
  const pct = Math.round((cityDifficulty(cityId) - 1) * 100)
  return pct > 0 ? `TRÂNSITO +${pct}%` : ''
}
