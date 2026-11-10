import type { TipoVino } from '../api/types'

export interface CepaCatalogo {
  id_cepa: number
  nombre: string
  tipo: 'tinta' | 'blanca'
}

export interface MaridajeCatalogo {
  id_maridaje: number
  nombre: string
  temp_servicio_sugerida_c: number
}

export const TIPOS_VINO: { value: TipoVino; label: string }[] = [
  { value: 'tinto', label: 'Tinto' },
  { value: 'blanco', label: 'Blanco' },
  { value: 'rosado', label: 'Rosado' },
  { value: 'espumante', label: 'Espumante' },
]

export const CEPAS: CepaCatalogo[] = [
  { id_cepa: 1, nombre: 'Malbec', tipo: 'tinta' },
  { id_cepa: 2, nombre: 'Cabernet Sauvignon', tipo: 'tinta' },
  { id_cepa: 3, nombre: 'Bonarda', tipo: 'tinta' },
  { id_cepa: 4, nombre: 'Syrah', tipo: 'tinta' },
  { id_cepa: 5, nombre: 'Cabernet Franc', tipo: 'tinta' },
  { id_cepa: 6, nombre: 'Chardonnay', tipo: 'blanca' },
  { id_cepa: 7, nombre: 'Torrontes', tipo: 'blanca' },
  { id_cepa: 8, nombre: 'Sauvignon Blanc', tipo: 'blanca' },
]

export const MARIDAJES: MaridajeCatalogo[] = [
  { id_maridaje: 1, nombre: 'Asado de tira y vacio', temp_servicio_sugerida_c: 18 },
  { id_maridaje: 2, nombre: 'Cordero al horno', temp_servicio_sugerida_c: 17 },
  { id_maridaje: 3, nombre: 'Empanadas mendocinas', temp_servicio_sugerida_c: 16 },
  { id_maridaje: 4, nombre: 'Pastas con salsa bolognesa', temp_servicio_sugerida_c: 16 },
  { id_maridaje: 5, nombre: 'Salmon a la plancha', temp_servicio_sugerida_c: 12 },
  { id_maridaje: 6, nombre: 'Tabla de quesos duros', temp_servicio_sugerida_c: 17 },
  { id_maridaje: 7, nombre: 'Trucha a las hierbas', temp_servicio_sugerida_c: 10 },
]

export const VOLUMENES: number[] = [375, 750, 1500]
