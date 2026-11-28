/** Catálogo dos carros realistas em glTF (sem dependência do three, para o save e a economia poderem importar). */
export type GlbCarDef = {
  id: string
  label: string
  type: string
  /** Comprimento em metros após normalizar. */
  length: number
  /** Material(is) de pintura que a garagem pode recolorir; sem isso o carro mantém a cor de fábrica. */
  paint?: RegExp
  /** Giro em Y (rad) para a frente apontar para +Z; sem isso é detectado pelo eixo mais comprido. */
  yaw?: number
  rank: number
  price: number
}

export const GLB_CAR_LIST = [
  { id: 'versa', label: 'Nissan Versa', type: 'SEDÃ', length: 4.4, paint: /carpaint1$/, rank: 4, price: 1400 },
  { id: 'hb20-2025', label: 'HB20 2025', type: 'HATCH', length: 4.1, rank: 5, price: 1700 },
  { id: 'hb20s', label: 'HB20S 2025', type: 'SEDÃ', length: 4.5, paint: /^material$/, rank: 5, price: 1800 },
  { id: 'fusion', label: 'Ford Fusion 2010', type: 'SEDÃ', length: 4.8, paint: /^FUSION$/, rank: 5, price: 1900 },
  { id: 'kicks', label: 'Nissan Kicks', type: 'SUV', length: 4.3, paint: /^material$/, rank: 5, price: 2000 },
  { id: 'dolphin', label: 'BYD Dolphin', type: 'ELÉTRICO', length: 4.1, paint: /^(PCrPaint_2|CarPaint_1)$/, rank: 6, price: 2400 },
  { id: 'focus-rs', label: 'Ford Focus RS', type: 'HATCH ESPORTIVO', length: 4.4, paint: /(CarPaint2|Base_004)/, rank: 6, price: 2800 },
  { id: 'cybertruck', label: 'Tesla Cybertruck', type: 'PICAPE ELÉTRICA', length: 5.0, rank: 6, price: 3000 },
  { id: 'sedan', label: 'Sedan Executivo', type: 'SEDÃ', length: 4.5, paint: /^Car_Paint/, rank: 7, price: 3200 },
  { id: 'seal', label: 'BYD Seal', type: 'ELÉTRICO', length: 4.8, paint: /^(Car_Paint|carp_2)$/, rank: 7, price: 3400 },
  { id: 'cutlass', label: 'Cutlass Supreme ’71', type: 'CLÁSSICO', length: 4.6, paint: /^M_Paint/, rank: 8, price: 4200 },
  { id: 'mustang-65', label: 'Mustang 1965', type: 'CLÁSSICO', length: 4.6, paint: /^Color_04/, rank: 8, price: 4300 },
  { id: 'skyline', label: 'Nissan Skyline', type: 'ESPORTIVO', length: 4.5, rank: 8, price: 5000 },
  { id: 'gt-r', label: 'Nissan GT-R', type: 'ESPORTIVO', length: 4.7, paint: /^paint$/, rank: 9, price: 5600 },
  { id: 'gtr-type2', label: 'GT-R R35 Type 2', type: 'ESPORTIVO', length: 4.7, paint: /PaintTNR/, rank: 9, price: 6200 },
  { id: 'roadster', label: 'Tesla Roadster', type: 'ESPORTIVO', length: 4.4, paint: /^car_main_paint$/, rank: 9, price: 6500 },
  { id: 'ford-gt', label: 'Ford GT 2017', type: 'SUPERESPORTIVO', length: 4.6, paint: /Paint_Material$/, rank: 10, price: 7500 },
  { id: 'mustang-gtd', label: 'Mustang GTD', type: 'SUPERESPORTIVO', length: 4.8, paint: /Paint_Material1$/, rank: 10, price: 8500 },
  { id: 'g-wagon', label: 'Mercedes Classe G', type: 'SUV', length: 4.9, rank: 7, price: 3800 },
  { id: 'm4-competition', label: 'BMW M4 Competition', type: 'ESPORTIVO', length: 4.8, rank: 8, price: 4600 },
  { id: 'm2-adro', label: 'BMW M2 ADRO', type: 'ESPORTIVO', length: 4.5, paint: /PaintTNR_Material/, rank: 8, price: 4700 },
  { id: 'm2-vorsteiner', label: 'BMW M2 Vorsteiner', type: 'ESPORTIVO', length: 4.5, paint: /PaintTNR_Material/, rank: 8, price: 4800 },
  { id: 'bmw-xm', label: 'BMW XM', type: 'SUV', length: 5.1, paint: /Cape_York_Green_Metallic/, rank: 8, price: 5200 },
  { id: 'm4-csl', label: 'BMW M4 CSL', type: 'ESPORTIVO', length: 4.8, yaw: -Math.PI / 2, paint: /^Car_Paint$/, rank: 9, price: 5800 },
  { id: 'gallardo', label: 'Lamborghini Gallardo', type: 'SUPERESPORTIVO', length: 4.4, paint: /^paint$/, rank: 9, price: 6000 },
  { id: 'amg-gt', label: 'Mercedes-AMG GT Black', type: 'SUPERESPORTIVO', length: 4.6, paint: /Paint_Material1$/, rank: 9, price: 6400 },
  { id: 'purosangue', label: 'Ferrari Purosangue', type: 'SUV ESPORTIVO', length: 4.97, paint: /Paint_Material$/, rank: 9, price: 6800 },
  { id: 'aventador', label: 'Lamborghini Aventador', type: 'SUPERESPORTIVO', length: 4.8, paint: /^Body$/, rank: 10, price: 9000 },
  { id: 'venevo', label: 'Lamborghini Veneno', type: 'SUPERESPORTIVO', length: 4.8, rank: 10, price: 9500 },
  { id: 'sp38', label: 'Ferrari SP38 Deborah', type: 'SUPERESPORTIVO', length: 4.7, paint: /^PAINT$/, rank: 10, price: 10000 },
  { id: 'laferrari', label: 'Ferrari LaFerrari', type: 'SUPERESPORTIVO', length: 4.7, paint: /^Body$/, rank: 10, price: 11000 },
] as const satisfies readonly GlbCarDef[]

export type GlbCarId = (typeof GLB_CAR_LIST)[number]['id']
