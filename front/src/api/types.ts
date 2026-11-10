export type TipoVino = 'tinto' | 'blanco' | 'rosado' | 'espumante'

export type EstadoDocumento = 'en_confeccion' | 'terminado' | 'procesado'

export type TipoCliente = 'socio' | 'distribuidor' | 'exportador'

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

/* ------------------------------------------------------------------ */
/* Salas                                                               */
/* ------------------------------------------------------------------ */

export interface Sala {
  id_sala: number
  calle: string
  numero: string
  dia_cierre: string
  codigo_postal: string
  localidad: string
}

export interface StockSalaVino {
  cod_vino: number
  nombre: string
  tipo: TipoVino
  anada: number
  volumen_ml: number
  precio: number | string
  stock_sala: number
}

export interface StockDepositoVino {
  cod_vino: number
  nombre: string
  tipo: TipoVino
  anada: number
  volumen_ml: number
  precio: number | string
  stock_deposito: number
}

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */

export interface ClienteListado {
  items: ClienteResumen[]
  page: number
  limit: number
  total: number
}

export interface ClienteResumen {
  id_cliente: number
  nombre_razon_social: string
  tipo_doc: string
  nro_doc: string
  direccion: string
  localidad: string
  fecha_alta: string
  tipo_cliente: TipoCliente
}

/* ------------------------------------------------------------------ */
/* Comprobantes (ventas)                                               */
/* ------------------------------------------------------------------ */

export interface RenglonVenta {
  cod_vino: number
  cantidad: number
}

export interface ComprobanteInput {
  id_cliente: number
  id_sala: number
  renglones: RenglonVenta[]
}

export interface RenglonComprobante {
  cod_vino: number
  cantidad: number
  precio_unitario: number | string
  descuento: number | string
  subtotal: number | string
}

export interface Comprobante {
  numero_comprobante: number
  fecha: string
  id_cliente: number
  id_sala: number
  subtotal: number | string
  descuento: number | string
  total: number | string
  renglones: RenglonComprobante[]
}

/* ------------------------------------------------------------------ */
/* Transferencias                                                      */
/* ------------------------------------------------------------------ */

export interface Transferencia {
  numero_solicitud: number
  id_sala: number
  fecha_confeccion: string
  estado: EstadoDocumento
  calle_sala?: string
  numero_sala?: string
  localidad_sala?: string
  cantidad_renglones?: number
  total_botellas?: number
  renglones?: { cod_vino: number; nombre: string; cantidad: number }[]
}

export interface TransferenciaInput {
  id_sala: number
  renglones: RenglonVenta[]
}

/* ------------------------------------------------------------------ */
/* Reportes (tablero)                                                  */
/* ------------------------------------------------------------------ */

export interface TopVino {
  cod_vino: number
  nombre: string
  tipo: TipoVino
  anada: number
  volumen_ml: number
  botellas_vendidas: number
}

export interface VentaPorSala {
  id_sala: number
  calle: string
  numero: string
  localidad: string
  cantidad_comprobantes: number
  ventas_totales: number | string
}

export interface VinoSinStock {
  cod_vino: number
  nombre: string
  tipo: TipoVino
  anada: number
  volumen_ml: number
  stock_sala: number
  stock_deposito: number
}
