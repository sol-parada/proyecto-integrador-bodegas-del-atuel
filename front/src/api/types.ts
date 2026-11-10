export type TipoVino = 'tinto' | 'blanco' | 'rosado' | 'espumante'

export interface VinoResumen {
  cod_vino: number
  nombre: string
  tipo: TipoVino
  anada: number
  volumen_ml: number
  graduacion: number | string
  precio: number | string
  cuit_bodega: string
}

export interface ComposicionVino {
  id_cepa: number
  nombre: string
  porcentaje: number | string
}

export interface Maridaje {
  id_maridaje: number
  nombre: string
  temp_servicio_sugerida_c: number | string
}

export interface VinoDetalle extends VinoResumen {
  bodega: string
  composicion: ComposicionVino[]
  maridajes: Maridaje[]
  stock_deposito: number
  stock_salas: number
  stock_total: number
}

export interface VinoListado {
  items: VinoResumen[]
  page: number
  limit: number
  total: number
}

export interface VinoFiltros {
  tipo?: string
  cepa?: string
  bodega?: string
  anada?: number
  page: number
  limit: number
}

export interface VinoInput {
  nombre: string
  tipo: TipoVino
  anada: number
  volumen_ml: number
  graduacion: number
  precio: number
  cuit_bodega: string
  composicion: [number, number][]
  maridajes: number[]
}

export interface BodegaOpcion {
  cuit: string
  nombre: string
}

export interface Salud {
  estado: string
  base_de_datos: string
}
