const rawBaseUrl = import.meta.env.VITE_API_BASE_URL

export const API_BASE_URL = (
  typeof rawBaseUrl === 'string' && rawBaseUrl.trim() ? rawBaseUrl.trim() : '/api'
).replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  sqlstate?: string
  detail: string

  constructor(status: number, detail: string, sqlstate?: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.sqlstate = sqlstate
  }
}

function normalizeDetail(body: unknown): { detail: string; sqlstate?: string } {
  if (typeof body === 'string') {
    return { detail: body }
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    const sqlstate = typeof record.sqlstate === 'string' ? record.sqlstate : undefined

    if (typeof record.detail === 'string') {
      return { detail: record.detail, sqlstate }
    }

    if (Array.isArray(record.detail)) {
      const messages = record.detail.map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg)
        }
        return JSON.stringify(item)
      })
      return { detail: messages.join('; '), sqlstate }
    }

    return { detail: JSON.stringify(body), sqlstate }
  }

  return { detail: 'Error desconocido' }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 15000)
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    const text = await response.text()
    let body: unknown = null

    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    }

    if (!response.ok) {
      const { detail, sqlstate } = normalizeDetail(body)
      throw new ApiError(response.status, detail, sqlstate)
    }

    return body as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'La solicitud tardó demasiado. Verificá que la API esté disponible.')
    }
    throw new ApiError(0, 'No se pudo conectar con la API. Verificá que el servidor esté levantado.')
  } finally {
    window.clearTimeout(timeoutId)
  }
}
