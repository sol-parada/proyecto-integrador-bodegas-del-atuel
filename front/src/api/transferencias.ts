import { apiRequest } from './client'
import type { Transferencia, TransferenciaInput } from './types'

export function listarTransferencias(estado?: string): Promise<Transferencia[]> {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : ''

  return apiRequest<Transferencia[]>(`/transferencias${query}`)
}

export function obtenerTransferencia(numero: number): Promise<Transferencia> {
  return apiRequest<Transferencia>(`/transferencias/${numero}`)
}

export function crearTransferencia(datos: TransferenciaInput): Promise<Transferencia> {
  return apiRequest<Transferencia>('/transferencias', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export function agregarRenglonTransferencia(
  numero: number,
  codVino: number,
  cantidad: number,
): Promise<{ numero_solicitud: number; cod_vino: number; cantidad: number }> {
  return apiRequest(`/transferencias/${numero}/renglones`, {
    method: 'POST',
    body: JSON.stringify({ cod_vino: codVino, cantidad }),
  })
}

export function terminarTransferencia(
  numero: number,
): Promise<{ numero_solicitud: number; estado: string }> {
  return apiRequest(`/transferencias/${numero}/terminar`, { method: 'POST' })
}

export function procesarTransferencia(
  numero: number,
): Promise<{ numero_solicitud: number; estado: string }> {
  return apiRequest(`/transferencias/${numero}/procesar`, { method: 'POST' })
}
