import { apiRequest } from './client'
import type { Salud } from './types'

export function obtenerSalud(): Promise<Salud> {
  return apiRequest<Salud>('/salud')
}
