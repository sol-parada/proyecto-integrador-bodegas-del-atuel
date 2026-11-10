import type { BodegaOpcion, VinoResumen } from './types'
import { listarVinos, obtenerVino } from './vinos'

export interface CatalogosDerivados {
  bodegas: BodegaOpcion[]
  anadas: number[]
}

let cache: Promise<CatalogosDerivados> | undefined

async function cargarCatalogos(): Promise<CatalogosDerivados> {
  const pageSize = 100
  const vinos: VinoResumen[] = []
  let page = 1
  let total = 0

  do {
    const response = await listarVinos({ page, limit: pageSize })
    vinos.push(...response.items)
    total = response.total
    page += 1
  } while (vinos.length < total && page <= 50)

  const anadas = [...new Set(vinos.map((vino) => vino.anada))].sort((a, b) => b - a)
  const porCuit = new Map<string, number>()

  vinos.forEach((vino) => {
    if (!porCuit.has(vino.cuit_bodega)) {
      porCuit.set(vino.cuit_bodega, vino.cod_vino)
    }
  })

  const entries = [...porCuit.entries()]
  const detalles = await Promise.allSettled(
    entries.map(([, codVino]) => obtenerVino(codVino)),
  )

  const bodegas: BodegaOpcion[] = entries.map(([cuit], index) => {
    const detalle = detalles[index]
    const nombre = detalle.status === 'fulfilled' ? detalle.value.bodega : ''
    return { cuit, nombre: nombre || `CUIT ${cuit}` }
  })

  bodegas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return { bodegas, anadas }
}

export function obtenerCatalogosDerivados(): Promise<CatalogosDerivados> {
  if (!cache) {
    cache = cargarCatalogos().catch((error: unknown) => {
      cache = undefined
      throw error
    })
  }
  return cache
}
