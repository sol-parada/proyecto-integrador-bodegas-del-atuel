import { apiRequest } from './client'
import type { Sala, StockSalaVino } from './types'

export function listarSalas(): Promise<Sala[]> {
  return apiRequest<Sala[]>('/salas')
}

export function obtenerStockSala(idSala: number): Promise<StockSalaVino[]> {
  return apiRequest<StockSalaVino[]>(`/salas/${idSala}/stock`)
}
