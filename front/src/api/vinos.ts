import { apiRequest } from './client'
import type { VinoDetalle, VinoFiltros, VinoInput, VinoListado } from './types'

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  })

  const query = search.toString()
  return query ? `?${query}` : ''
}

export function listarVinos(filtros: VinoFiltros): Promise<VinoListado> {
  return apiRequest<VinoListado>(`/vinos${buildQuery({ ...filtros })}`)
}

export function obtenerVino(codVino: number): Promise<VinoDetalle> {
  return apiRequest<VinoDetalle>(`/vinos/${codVino}`)
}

export function crearVino(data: VinoInput): Promise<VinoDetalle> {
  return apiRequest<VinoDetalle>('/vinos', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function actualizarVino(codVino: number, data: VinoInput): Promise<VinoDetalle> {
  return apiRequest<VinoDetalle>(`/vinos/${codVino}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}
