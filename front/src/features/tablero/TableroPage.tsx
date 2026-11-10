import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../api/client'
import { listarSalas } from '../../api/salas'
import { topVinos, ventasPorSala, vinosSinStock } from '../../api/reportes'
import type { Sala, TopVino, VentaPorSala, VinoSinStock } from '../../api/types'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { formatoPrecio } from '../../lib/format'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLOR_BARRA = '#800e13'
const COLOR_BARRA_ALT = '#a8303a'

function etiquetaSala(venta: VentaPorSala): string {
  return `${venta.calle} ${venta.numero}`
}

export function TableroPage() {
  const [salas, setSalas] = useState<Sala[]>([])
  const [idSala, setIdSala] = useState<number | ''>('')
  const [top, setTop] = useState<TopVino[]>([])
  const [ventas, setVentas] = useState<VentaPorSala[]>([])
  const [sinStock, setSinStock] = useState<VinoSinStock[]>([])
  const [error, setError] = useState<ApiError | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let active = true

    Promise.all([listarSalas(), topVinos(), ventasPorSala()])
      .then(([datosSalas, datosTop, datosVentas]) => {
        if (!active) {
          return
        }
        setSalas(datosSalas)
        setTop(datosTop)
        setVentas(datosVentas)
        if (datosSalas.length > 0) {
          setIdSala(datosSalas[0].id_sala)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof ApiError ? err : new ApiError(0, 'No se pudo cargar el tablero.'),
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

  const datosTop = useMemo(
    () =>
      top.map((vino) => ({
        nombre: vino.nombre.length > 22 ? `${vino.nombre.slice(0, 22)}…` : vino.nombre,
        botellas: vino.botellas_vendidas,
      })),
    [top],
  )

  const datosVentas = useMemo(
    () =>
      ventas.map((venta) => ({
        nombre: etiquetaSala(venta),
        total: Number(venta.ventas_totales),
      })),
    [ventas],
  )

  const totalTrimestre = useMemo(
    () => ventas.reduce((acumulado, venta) => acumulado + Number(venta.ventas_totales), 0),
    [ventas],
  )

  const salaSeleccionada = useMemo(
    () => salas.find((sala) => sala.id_sala === idSala),
    [salas, idSala],
  )

  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex flex-col gap-space-xs">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Tablero</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Indicadores de la red de salas de venta.
        </p>
      </header>

      {error && <ErrorBanner detail={error.detail} sqlstate={error.sqlstate} />}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-space-lg">
        <div className="flex flex-col gap-space-xs bg-surface-container-lowest border border-[#e2e8f0] rounded-lg p-space-md">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Ventas del último trimestre
          </span>
          <span className="font-metric-lg text-metric-lg text-on-surface">
            {formatoPrecio(totalTrimestre)}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {ventas.length} salas con ventas
          </span>
        </div>

        <div className="flex flex-col gap-space-xs bg-surface-container-lowest border border-[#e2e8f0] rounded-lg p-space-md">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Vinos más vendidos
          </span>
          <span className="font-metric-lg text-metric-lg text-on-surface">{top.length}</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            En el ranking de toda la red
          </span>
        </div>

        <div className="flex flex-col gap-space-xs bg-surface-container-lowest border border-[#e2e8f0] rounded-lg p-space-md">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Vinos sin stock
          </span>
          <span className="font-metric-lg text-metric-lg text-on-surface">{sinStock.length}</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {salaSeleccionada
              ? `En ${salaSeleccionada.calle} ${salaSeleccionada.numero}`
              : 'Elegí una sala'}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">
        <section className="flex flex-col gap-space-md bg-surface-container-lowest border border-[#e2e8f0] rounded-lg p-space-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Top 10 vinos por botellas vendidas
          </h2>

          <div className="h-72">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={datosTop} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  axisLine={false}
                  tick={{ fill: '#58413f', fontSize: 11 }}
                  tickLine={false}
                  type="number"
                />
                <YAxis
                  axisLine={false}
                  dataKey="nombre"
                  tick={{ fill: '#58413f', fontSize: 11 }}
                  tickLine={false}
                  type="category"
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.25rem',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="botellas" fill={COLOR_BARRA} radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="flex flex-col gap-space-md bg-surface-container-lowest border border-[#e2e8f0] rounded-lg p-space-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Ventas por sala en el último trimestre
          </h2>

          <div className="h-72">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={datosVentas} margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="nombre"
                  tick={{ fill: '#58413f', fontSize: 10 }}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fill: '#58413f', fontSize: 11 }}
                  tickFormatter={(valor: number) => `$${Math.round(valor / 1000)}k`}
                  tickLine={false}
                  type="number"
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.25rem',
                    fontSize: 12,
                  }}
                  formatter={(valor) => [formatoPrecio(Number(valor)), 'Ventas']}
                />
                <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                  {datosVentas.map((_entrada, indice) => (
                    <Cell
                      fill={indice % 2 === 0 ? COLOR_BARRA : COLOR_BARRA_ALT}
                      key={`celda-${indice}`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-space-md bg-surface-container-lowest border border-[#e2e8f0] rounded-lg p-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Vinos sin stock en sala con stock en el depósito
          </h2>

          <label className="flex flex-col gap-space-xs">
            <span className="font-label-md text-label-md text-on-surface-variant">Sala</span>
            <select
              className="h-9 px-space-sm bg-white border border-slate-300 rounded font-body-md text-body-md text-slate-900 focus:outline-none focus:border-[#800e13]"
              onChange={(e) => setIdSala(Number(e.target.value))}
              value={idSala}
            >
              {salas.map((sala) => (
                <option key={sala.id_sala} value={sala.id_sala}>
                  {sala.calle} {sala.numero} - {sala.localidad}
                </option>
              ))}
            </select>
          </label>
        </div>

        {sinStock.length === 0 ? (
          <div className="flex items-center justify-center gap-space-sm py-space-lg text-on-surface-variant">
            <MaterialIcon name="check_circle" className="text-[20px]" />
            <span className="font-body-md text-body-md">
              No hay vinos sin stock en esta sala.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0]">
                  <th className="text-left py-space-sm font-label-md text-label-md text-on-surface-variant">
                    Vino
                  </th>
                  <th className="text-right py-space-sm font-label-md text-label-md text-on-surface-variant">
                    En sala
                  </th>
                  <th className="text-right py-space-sm font-label-md text-label-md text-on-surface-variant">
                    En depósito
                  </th>
                </tr>
              </thead>
              <tbody>
                {sinStock.map((vino) => (
                  <tr className="border-b border-[#eef1f4]" key={vino.cod_vino}>
                    <td className="py-space-sm font-body-md text-body-md text-on-surface">
                      {vino.nombre}
                    </td>
                    <td className="py-space-sm text-right font-tabular-data text-tabular-data text-on-surface">
                      {vino.stock_sala}
                    </td>
                    <td className="py-space-sm text-right font-tabular-data text-tabular-data text-primary font-semibold">
                      {vino.stock_deposito}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {cargando && (
        <p className="font-body-md text-body-md text-on-surface-variant">Cargando indicadores...</p>
      )}
    </div>
  )
}
