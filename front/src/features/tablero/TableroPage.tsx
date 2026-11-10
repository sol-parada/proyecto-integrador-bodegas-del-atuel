import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { listarSalas } from '../../api/salas'
import { topVinos, ventasPorSala, vinosSinStock } from '../../api/reportes'
import type { Sala, TopVino, VentaPorSala, VinoSinStock } from '../../api/types'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { TipoVinoBadge } from '../../components/ui/TipoVinoBadge'
import { formatoCodigoVino, formatoPrecio } from '../../lib/format'

const ETIQUETA_CLASS =
  'font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider'

export function TableroPage() {
  const [salas, setSalas] = useState<Sala[]>([])
  const [idSala, setIdSala] = useState<number | ''>('')
  const [top, setTop] = useState<TopVino[]>([])
  const [ventas, setVentas] = useState<VentaPorSala[]>([])
  const [sinStock, setSinStock] = useState<VinoSinStock[]>([])
  const [error, setError] = useState<ApiError | null>(null)
  const [cargando, setCargando] = useState(true)
  const [ultimaCarga, setUltimaCarga] = useState('')

  function cargarIndicadores() {
    setCargando(true)

    Promise.all([listarSalas(), topVinos(), ventasPorSala()])
      .then(([datosSalas, datosTop, datosVentas]) => {
        setSalas(datosSalas)
        setTop(datosTop)
        setVentas(datosVentas)
        setUltimaCarga(new Date().toLocaleString('es-AR'))

        if (datosSalas.length > 0) {
          setIdSala((actual) => actual || datosSalas[0].id_sala)
        }
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err : new ApiError(0, 'No se pudo cargar el tablero.'),
        )
      })
      .finally(() => {
        setCargando(false)
      })
  }

  useEffect(() => {
    cargarIndicadores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (idSala === '') {
      return
    }

    let active = true

    vinosSinStock(idSala)
      .then((datos) => {
        if (active) {
          setSinStock(datos)
        }
      })
      .catch(() => {
        if (active) {
          setSinStock([])
        }
      })

    return () => {
      active = false
    }
  }, [idSala])

  const totalTrimestre = useMemo(
    () => ventas.reduce((acumulado, venta) => acumulado + Number(venta.ventas_totales), 0),
    [ventas],
  )

  const ventaMayor = useMemo(
    () => Math.max(...ventas.map((venta) => Number(venta.ventas_totales)), 0),
    [ventas],
  )

  function porcentaje(venta: VentaPorSala): number {
    if (ventaMayor === 0) {
      return 0
    }

    return (Number(venta.ventas_totales) / ventaMayor) * 100
  }

  return (
    <div className="flex flex-col w-full">
      {/* Encabezado */}
      <header className="mb-space-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-md border-b border-outline-variant">
          <div>
            <nav
              aria-label="Migas de pan"
              className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-space-xs"
            >
              <span>Reportes</span>
              <span className="text-outline">/</span>
              <span>Control de Gestión</span>
              <span className="text-outline">/</span>
              <span className="text-primary font-semibold">Tablero de Control</span>
            </nav>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              Tablero de Control (Dashboard)
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Consultas operativas consolidadas y balance de existencias entre dependencias.
            </p>
          </div>

          <div className="flex items-center gap-space-lg bg-surface-container-lowest border border-outline-variant px-space-md py-space-sm rounded-lg self-start md:self-auto shadow-sm">
            <div className="flex items-center gap-space-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface font-semibold leading-tight">
                  Sincronización con la base activa
                </span>
                <span className="font-tabular-data text-tabular-data text-on-surface-variant text-[11px] leading-tight">
                  Última actualización: {ultimaCarga || '...'}
                </span>
              </div>
            </div>
            <button
              aria-label="Actualizar los indicadores"
              className="text-on-surface-variant hover:text-primary transition-colors"
              onClick={cargarIndicadores}
              title="Actualizar los indicadores"
              type="button"
            >
              <MaterialIcon name="sync" className="text-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {error && <ErrorBanner detail={error.detail} sqlstate={error.sqlstate} />}

      {/* Fila superior: ranking y ventas por sala */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-space-xl mb-space-xl">
        <article className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-space-md border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-space-sm">
                <MaterialIcon name="equalizer" className="text-primary text-[20px]" />
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Top 10 Vinos Más Vendidos
                </h2>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-container text-on-surface-variant px-2 py-0.5 rounded border border-field-border">
                Acumulado total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th
                      className={`py-2.5 px-space-md ${ETIQUETA_CLASS} w-12 text-center`}
                      scope="col"
                    >
                      Pos.
                    </th>
                    <th className={`py-2.5 px-space-md ${ETIQUETA_CLASS}`} scope="col">
                      Nombre comercial
                    </th>
                    <th className={`py-2.5 px-space-md ${ETIQUETA_CLASS} w-28`} scope="col">
                      Tipo
                    </th>
                    <th
                      className={`py-2.5 px-space-md ${ETIQUETA_CLASS} text-right`}
                      scope="col"
                    >
                      Total Vendido
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 font-body-md text-body-md text-on-surface">
                  {top.length === 0 && !cargando && (
                    <tr>
                      <td
                        className="py-space-md font-body-md text-body-md text-on-surface-variant"
                        colSpan={4}
                      >
                        Todavia no hay ventas registradas.
                      </td>
                    </tr>
                  )}
                  {top.map((vino, indice) => (
                    <tr className="hover:bg-surface-container-low transition-colors" key={vino.cod_vino}>
                      <td
                        className={`py-2 px-space-md font-tabular-data text-tabular-data text-center font-semibold ${
                          indice === 0 ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        #{indice + 1}
                      </td>
                      <td className="py-2 px-space-md font-medium text-on-surface">
                        {vino.nombre}
                        <span className="block font-body-sm text-body-sm text-on-surface-variant">
                          {formatoCodigoVino(vino.cod_vino)} - {vino.anada} - {vino.volumen_ml} ml
                        </span>
                      </td>
                      <td className="py-2 px-space-md">
                        <TipoVinoBadge tipo={vino.tipo} />
                      </td>
                      <td className="py-2 px-space-md font-tabular-data text-tabular-data text-right font-bold text-on-surface">
                        {vino.botellas_vendidas.toLocaleString('es-AR')} botellas
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>

        <article className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-space-md border-b border-outline-variant bg-surface-container-low">
              <div className="flex items-center gap-space-sm">
                <MaterialIcon name="storefront" className="text-primary text-[20px]" />
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Ventas por Sala (Último Trimestre)
                </h2>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                Monto acumulado en moneda nacional (ARS).
              </p>
            </div>

            <div className="p-space-md flex flex-col gap-3 pt-4 max-h-[420px] overflow-y-auto">
              {ventas.length === 0 && !cargando && (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Todavia no hay ventas en el último trimestre.
                </p>
              )}

              {ventas.map((venta) => (
                <div className="flex flex-col gap-1" key={venta.id_sala}>
                  <div className="flex justify-between items-baseline font-body-sm text-body-sm">
                    <span className="font-medium text-on-surface truncate">
                      {venta.calle} {venta.numero} - {venta.localidad}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {porcentaje(venta).toFixed(1)}%
                      </span>
                      <span className="font-tabular-data text-tabular-data font-bold text-on-surface">
                        {formatoPrecio(venta.ventas_totales)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-surface-container-high rounded-sm overflow-hidden flex">
                    <div
                      className="h-full bg-primary-container transition-all duration-500 ease-out"
                      style={{ width: `${porcentaje(venta)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-space-md bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Monto total liquidado trimestre:
            </span>
            <span className="font-headline-md text-headline-md font-bold text-on-surface font-tabular-data">
              {formatoPrecio(totalTrimestre)} ARS
            </span>
          </div>
        </article>
      </section>

      {/* Vinos agotados en la sala */}
      <section className="w-full">
        <article className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm">
          <div className="p-space-md border-b border-outline-variant bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-sm">
              <MaterialIcon name="inventory_2" className="text-primary text-[22px]" />
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Vinos Agotados en Sala (Disponibles en Depósito Central)
                </h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Detección de quiebre de stock por punto de despacho comercial.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-space-sm">
              <label
                className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap"
                htmlFor="filtro-sala"
              >
                Filtrar por Sala de Venta:
              </label>
              <select
                className="bg-field border border-field-border rounded h-9 px-space-sm font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary"
                id="filtro-sala"
                onChange={(e) => setIdSala(Number(e.target.value))}
                value={idSala}
              >
                {salas.map((sala) => (
                  <option key={sala.id_sala} value={sala.id_sala}>
                    {sala.calle} {sala.numero} - {sala.localidad}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className={`py-2.5 px-space-md ${ETIQUETA_CLASS} w-40`} scope="col">
                    Código de Vino
                  </th>
                  <th className={`py-2.5 px-space-md ${ETIQUETA_CLASS}`} scope="col">
                    Nombre del Vino
                  </th>
                  <th
                    className={`py-2.5 px-space-md ${ETIQUETA_CLASS} w-48 text-center`}
                    scope="col"
                  >
                    Stock en la Sala
                  </th>
                  <th
                    className={`py-2.5 px-space-md ${ETIQUETA_CLASS} w-64 text-center`}
                    scope="col"
                  >
                    Stock en Depósito Central
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 font-body-md text-body-md text-on-surface">
                {sinStock.length === 0 && (
                  <tr>
                    <td
                      className="py-space-md font-body-md text-body-md text-on-surface-variant"
                      colSpan={4}
                    >
                      No hay vinos agotados en esta sala.
                    </td>
                  </tr>
                )}
                {sinStock.map((vino) => (
                  <tr className="hover:bg-surface-container-low transition-colors" key={vino.cod_vino}>
                    <td className="py-3 px-space-md font-tabular-data text-tabular-data font-semibold text-on-surface-variant">
                      {formatoCodigoVino(vino.cod_vino)}
                    </td>
                    <td className="py-3 px-space-md font-medium text-on-surface">
                      {vino.nombre}
                      <span className="block font-body-sm text-body-sm text-on-surface-variant">
                        {vino.anada} - {vino.volumen_ml} ml
                      </span>
                    </td>
                    <td className="py-3 px-space-md text-center">
                      <span className="inline-flex items-center justify-center font-label-sm text-label-sm font-medium px-2.5 py-1 rounded bg-error/15 text-error border border-error/40">
                        {vino.stock_sala} botellas
                      </span>
                    </td>
                    <td className="py-3 px-space-md text-center">
                      <span className="inline-flex items-center justify-center font-label-sm text-label-sm font-medium px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 font-tabular-data">
                        {vino.stock_deposito} botellas disponibles
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-space-md bg-surface-container-low border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-xs text-on-surface-variant">
              <MaterialIcon name="info" className="text-[18px] text-outline" />
              <span className="font-body-sm text-body-sm italic">
                Vinos listos para solicitar reposición mediante transferencia.
              </span>
            </div>
            <Link
              className="inline-flex items-center gap-space-xs border border-primary text-primary hover:bg-primary/10 font-label-md text-label-md px-space-md py-1.5 rounded transition-colors"
              to="/transferencias"
            >
              <MaterialIcon name="move_up" className="text-[16px]" />
              <span>Iniciar Transferencia de Stock</span>
            </Link>
          </div>
        </article>
      </section>
    </div>
  )
}
