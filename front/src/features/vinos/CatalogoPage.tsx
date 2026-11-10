import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { obtenerCatalogosDerivados } from '../../api/catalogos'
import type { CatalogosDerivados } from '../../api/catalogos'
import { listarVinos } from '../../api/vinos'
import type { VinoListado } from '../../api/types'
import { CEPAS, TIPOS_VINO } from '../../data/catalogos'
import {
  formatoCodigoVino,
  formatoGraduacion,
  formatoPrecio,
  formatoVolumen,
} from '../../lib/format'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { Pagination } from '../../components/ui/Pagination'
import { SuccessBanner } from '../../components/ui/SuccessBanner'
import { TipoVinoBadge } from '../../components/ui/TipoVinoBadge'
import { VinoDetailModal } from './VinoDetailModal'

const LIMIT = 10

interface FiltrosState {
  tipo: string
  cepa: string
  bodega: string
  anada: string
}

const FILTROS_INICIALES: FiltrosState = {
  tipo: '',
  cepa: '',
  bodega: '',
  anada: '',
}

const SELECT_CLASS =
  'w-full h-[36px] px-space-sm bg-surface-container-lowest border border-field-border rounded font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'

export function CatalogoPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_INICIALES)
  const [page, setPage] = useState(1)
  const [listado, setListado] = useState<VinoListado | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [catalogos, setCatalogos] = useState<CatalogosDerivados | null>(null)
  const estadoInicial = location.state as {
    mensaje?: string
    abrirVino?: number
  } | null
  const [codSeleccionado, setCodSeleccionado] = useState<number | null>(() =>
    typeof estadoInicial?.abrirVino === 'number' ? estadoInicial.abrirVino : null,
  )
  const [aviso, setAviso] = useState<string | null>(() => estadoInicial?.mensaje ?? null)

  useEffect(() => {
    if (!aviso) {
      return
    }

    navigate(location.pathname, { replace: true, state: null })
    const timeoutId = window.setTimeout(() => setAviso(null), 5000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [aviso, navigate, location.pathname])

  useEffect(() => {
    let active = true

    obtenerCatalogosDerivados()
      .then((data) => {
        if (active) {
          setCatalogos(data)
        }
      })
      .catch(() => {
        if (active) {
          setCatalogos({ bodegas: [], anadas: [] })
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    listarVinos({
      tipo: filtros.tipo || undefined,
      cepa: filtros.cepa || undefined,
      bodega: filtros.bodega || undefined,
      anada: filtros.anada ? Number(filtros.anada) : undefined,
      page,
      limit: LIMIT,
    })
      .then((data) => {
        if (active) {
          setListado(data)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof ApiError
              ? err
              : new ApiError(0, 'No se pudo cargar el catálogo de vinos.'),
          )
        }
      })
      .finally(() => {
        if (active) {
          setCargando(false)
        }
      })

    return () => {
      active = false
    }
  }, [filtros, page])

  const actualizarFiltro = (campo: keyof FiltrosState, valor: string) => {
    setCargando(true)
    setError(null)
    setFiltros((prev) => ({ ...prev, [campo]: valor }))
    setPage(1)
  }

  const limpiarFiltros = () => {
    setCargando(true)
    setError(null)
    setFiltros({ ...FILTROS_INICIALES })
    setPage(1)
  }

  const cambiarPagina = (nuevaPagina: number) => {
    setCargando(true)
    setError(null)
    setPage(nuevaPagina)
  }

  const totalPages = listado ? Math.max(1, Math.ceil(listado.total / LIMIT)) : 1
  const totalReferencias = listado?.total ?? 0

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {aviso && <SuccessBanner message={aviso} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm pb-space-xs">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Catálogo de Vinos</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Registro maestro de referencias embotelladas y especificaciones comerciales
          </p>
        </div>
        <div className="flex items-center gap-space-sm self-start sm:self-auto">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider bg-surface-container px-space-sm py-1 rounded">
            {cargando ? '...' : totalReferencias} Referencias Activas
          </span>
          <Link
            className="inline-flex items-center gap-1.5 px-[10px] py-[5px] bg-primary-container hover:bg-primary text-white font-label-md text-label-md rounded transition-colors"
            to="/vinos/nuevo"
          >
            <MaterialIcon name="add" className="text-[16px]" />
            Nuevo vino
          </Link>
        </div>
      </div>

      <section
        aria-label="Filtros del catálogo"
        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-space-md py-space-sm shadow-sm"
      >
        <form
          className="flex flex-wrap items-center gap-space-md text-on-surface"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="flex items-center gap-space-xs min-w-[140px] flex-1">
            <label
              className="font-label-sm text-label-sm text-on-surface-variant shrink-0"
              htmlFor="filter-tipo"
            >
              Tipo:
            </label>
            <select
              className={SELECT_CLASS}
              id="filter-tipo"
              onChange={(event) => actualizarFiltro('tipo', event.target.value)}
              value={filtros.tipo}
            >
              <option value="">Todos</option>
              {TIPOS_VINO.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-space-xs min-w-[160px] flex-1">
            <label
              className="font-label-sm text-label-sm text-on-surface-variant shrink-0"
              htmlFor="filter-cepa"
            >
              Cepa:
            </label>
            <select
              className={SELECT_CLASS}
              id="filter-cepa"
              onChange={(event) => actualizarFiltro('cepa', event.target.value)}
              value={filtros.cepa}
            >
              <option value="">Todas</option>
              {CEPAS.map((cepa) => (
                <option key={cepa.id_cepa} value={cepa.nombre}>
                  {cepa.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-space-xs min-w-[200px] flex-1">
            <label
              className="font-label-sm text-label-sm text-on-surface-variant shrink-0"
              htmlFor="filter-bodega"
            >
              Bodega:
            </label>
            <select
              className={SELECT_CLASS}
              id="filter-bodega"
              onChange={(event) => actualizarFiltro('bodega', event.target.value)}
              value={filtros.bodega}
            >
              <option value="">Todas</option>
              {!catalogos && <option disabled>Cargando bodegas...</option>}
              {catalogos?.bodegas.map((bodega) => (
                <option key={bodega.cuit} value={bodega.cuit}>
                  {bodega.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-space-xs min-w-[130px] flex-1">
            <label
              className="font-label-sm text-label-sm text-on-surface-variant shrink-0"
              htmlFor="filter-anada"
            >
              Añada:
            </label>
            <select
              className={SELECT_CLASS}
              id="filter-anada"
              onChange={(event) => actualizarFiltro('anada', event.target.value)}
              value={filtros.anada}
            >
              <option value="">Todas</option>
              {catalogos?.anadas.map((anada) => (
                <option key={anada} value={anada}>
                  {anada}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center shrink-0 ml-auto">
            <button
              className="h-[36px] px-space-md font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors rounded cursor-pointer"
              onClick={limpiarFiltros}
              type="button"
            >
              Limpiar filtros
            </button>
          </div>
        </form>
      </section>

      {error && <ErrorBanner detail={error.detail} sqlstate={error.sqlstate} />}

      <section
        aria-label="Listado maestro de vinos"
        className="w-full bg-surface-container-lowest border border-outline-variant rounded overflow-hidden shadow-sm"
      >
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="py-[10px] px-[14px] font-label-sm text-label-sm text-on-surface-variant uppercase" scope="col">
                  Código
                </th>
                <th className="py-[10px] px-[14px] font-label-sm text-label-sm text-on-surface-variant uppercase" scope="col">
                  Nombre comercial
                </th>
                <th className="py-[10px] px-[14px] font-label-sm text-label-sm text-on-surface-variant uppercase" scope="col">
                  Tipo
                </th>
                <th className="py-[10px] px-[14px] font-label-sm text-label-sm text-on-surface-variant uppercase text-center" scope="col">
                  Añada
                </th>
                <th className="py-[10px] px-[14px] font-label-sm text-label-sm text-on-surface-variant uppercase" scope="col">
                  Presentación
                </th>
                <th className="py-[10px] px-[14px] font-label-sm text-label-sm text-on-surface-variant uppercase text-right" scope="col">
                  Graduación
                </th>
                <th className="py-[10px] px-[14px] font-label-sm text-label-sm text-on-surface-variant uppercase text-right" scope="col">
                  Precio unitario
                </th>
                <th className="py-[10px] px-[14px] font-label-sm text-label-sm text-on-surface-variant uppercase text-center w-[120px]" scope="col">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {cargando && (
                <tr>
                  <td className="py-[10px] px-[14px] font-body-md text-body-md text-on-surface-variant" colSpan={8}>
                    Cargando catálogo...
                  </td>
                </tr>
              )}

              {!cargando && listado?.items.length === 0 && (
                <tr>
                  <td className="py-[10px] px-[14px] font-body-md text-body-md text-on-surface-variant" colSpan={8}>
                    No se encontraron vinos con esos filtros.
                  </td>
                </tr>
              )}

              {!cargando &&
                listado?.items.map((vino) => (
                  <tr className="hover:bg-surface-container-low transition-colors h-[44px]" key={vino.cod_vino}>
                    <td className="py-[10px] px-[14px] font-tabular-data text-tabular-data font-semibold text-on-surface">
                      {formatoCodigoVino(vino.cod_vino)}
                    </td>
                    <td className="py-[10px] px-[14px] font-body-md text-body-md font-medium text-on-surface">
                      {vino.nombre}
                    </td>
                    <td className="py-[10px] px-[14px]">
                      <TipoVinoBadge tipo={vino.tipo} />
                    </td>
                    <td className="py-[10px] px-[14px] font-tabular-data text-tabular-data text-center text-on-surface">
                      {vino.anada}
                    </td>
                    <td className="py-[10px] px-[14px] font-body-sm text-body-sm text-on-surface-variant">
                      {formatoVolumen(vino.volumen_ml)}
                    </td>
                    <td className="py-[10px] px-[14px] font-tabular-data text-tabular-data text-right text-on-surface">
                      {formatoGraduacion(vino.graduacion)}
                    </td>
                    <td className="py-[10px] px-[14px] font-tabular-data text-tabular-data text-right font-medium text-on-surface">
                      {formatoPrecio(vino.precio)}
                    </td>
                    <td className="py-[10px] px-[14px] text-center">
                      <button
                        className="px-[10px] py-[5px] bg-primary-container hover:bg-primary text-on-primary-container font-label-md text-[11px] rounded transition-colors cursor-pointer"
                        onClick={() => setCodSeleccionado(vino.cod_vino)}
                        type="button"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination onPageChange={cambiarPagina} page={page} totalPages={totalPages} />
      </section>

      {codSeleccionado !== null && (
        <VinoDetailModal
          codVino={codSeleccionado}
          key={codSeleccionado}
          onClose={() => setCodSeleccionado(null)}
        />
      )}
    </div>
  )
}
