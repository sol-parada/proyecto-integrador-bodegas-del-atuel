import { apiRequest } from './client'
import type { Comprobante, ComprobanteInput } from './types'

export function crearComprobante(datos: ComprobanteInput): Promise<Comprobante> {
  return apiRequest<Comprobante>('/comprobantes', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export function obtenerComprobante(numero: number): Promise<Comprobante> {
  return apiRequest<Comprobante>(`/comprobantes/${numero}`)
}
