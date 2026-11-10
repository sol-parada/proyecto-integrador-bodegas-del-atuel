import { apiRequest } from './client'
import type { TopVino, VentaPorSala, VinoSinStock } from './types'

export function topVinos(): Promise<TopVino[]> {
  return apiRequest<TopVino[]>('/reportes/top-vinos')
}

export function ventasPorSala(): Promise<VentaPorSala[]> {
  return apiRequest<VentaPorSala[]>('/reportes/ventas-por-sala')
}

export function vinosSinStock(idSala: number): Promise<VinoSinStock[]> {
  return apiRequest<VinoSinStock[]>(`/reportes/vinos-sin-stock?id_sala=${idSala}`)
}

export function transportistaActivo(): Promise<
  { codigo_transportista: number; razon_social: string; ingresos_trasladados: number }[]
> {
  return apiRequest('/reportes/transportista-activo')
}
