import { apiRequest } from './client'
import type { ClienteListado } from './types'

export function listarClientes(
  page: number,
  limit: number,
  tipoCliente?: string,
): Promise<ClienteListado> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })

  if (tipoCliente) {
    params.set('tipo_cliente', tipoCliente)
  }

  return apiRequest<ClienteListado>(`/clientes?${params.toString()}`)
}
