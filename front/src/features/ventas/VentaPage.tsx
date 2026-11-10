import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { listarClientes } from '../../api/clientes'
import { listarSalas, obtenerStockSala } from '../../api/salas'
import { crearComprobante } from '../../api/ventas'
import type { ClienteResumen, Sala, StockSalaVino } from '../../api/types'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { SuccessBanner } from '../../components/ui/SuccessBanner'
import { formatoPrecio } from '../../lib/format'

interface LineaVenta {
  cod_vino: number
  cantidad: number
}

const INPUT_CLASS =
  'w-full h-9 px-space-sm bg-white border border-slate-300 rounded font-body-md text-body-md text-slate-900 focus:outline-none focus:border-[#800e13] focus:ring-1 focus:ring-[#800e13] transition-colors'

const CANTIDAD_INICIAL = 1

export function VentaPage() {
  const [salas, setSalas] = useState<Sala[]>([])
  const [idSala, setIdSala] = useState<number | ''>('')
  const [clientes, setClientes] = useState<ClienteResumen[]>([])
  const [idCliente, setIdCliente] = useState<number | ''>('')
  const [vinos, setVinos] = useState<StockSalaVino[]>([])
  const [lineas, setLineas] = useState<LineaVenta[]>([])
  const [codVino, setCodVino] = useState<number | ''>('')
  const [cantidad, setCantidad] = useState(String(CANTIDAD_INICIAL))
  const [errorCarga, setErrorCarga] = useState<ApiError | null>(null)
  const [errorVenta, setErrorVenta] = useState<ApiError | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [registrando, setRegistrando] = useState(false)

  useEffect(() => {
    let active = true

    Promise.all([listarSalas(), listarClientes(1, 100)])
      .then(([datosSalas, datosClientes]) => {
        if (!active) {
          return
        }
        setSalas(datosSalas)
        setClientes(datosClientes.items)
        if (datosSalas.length > 0) {
          setIdSala(datosSalas[0].id_sala)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setErrorCarga(
            err instanceof ApiError
              ? err
              : new ApiError(0, 'No se pudieron cargar los datos de la venta.'),
          )
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

    obtenerStockSala(idSala)
      .then((datos) => {
        if (active) {
          setVinos(datos)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setErrorCarga(
            err instanceof ApiError
              ? err
              : new ApiError(0, 'No se pudo cargar el stock de la sala.'),
          )
        }
      })

    return () => {
      active = false
    }
  }, [idSala])

  const vinosDisponibles = useMemo(() => (idSala === '' ? [] : vinos), [idSala, vinos])

  const vinoSeleccionado = useMemo(
    () => vinosDisponibles.find((vino) => vino.cod_vino === codVino),
    [vinosDisponibles, codVino],
  )

  const salaSeleccionada = useMemo(
    () => salas.find((sala) => sala.id_sala === idSala),
    [salas, idSala],
  )

  function agregarLinea(evento: FormEvent) {
    evento.preventDefault()

    if (codVino === '' || Number(cantidad) <= 0) {
      return
    }

    if (lineas.some((linea) => linea.cod_vino === codVino)) {
      setErrorVenta(new ApiError(0, 'Ese vino ya está en la venta. Modificá la cantidad.'))
      return
    }

    setLineas([...lineas, { cod_vino: codVino, cantidad: Number(cantidad) }])
    setCodVino('')
    setCantidad(String(CANTIDAD_INICIAL))
    setErrorVenta(null)
  }

  function cambiarCantidad(cod: number, valor: string) {
    const nueva = Number(valor)

    setLineas(
      lineas.map((linea) =>
        linea.cod_vino === cod ? { ...linea, cantidad: nueva > 0 ? nueva : 0 } : linea,
      ),
    )
  }

  function quitarLinea(cod: number) {
    setLineas(lineas.filter((linea) => linea.cod_vino !== cod))
  }

  async function registrarVenta(evento: FormEvent) {
    evento.preventDefault()

    if (idSala === '' || idCliente === '') {
      setErrorVenta(new ApiError(0, 'Elegí la sala y el cliente antes de registrar la venta.'))
      return
    }

    const renglones = lineas.filter((linea) => linea.cantidad > 0)

    if (renglones.length === 0) {
      setErrorVenta(new ApiError(0, 'Agregá al menos un vino con cantidad mayor a cero.'))
      return
    }

    setRegistrando(true)
    setErrorVenta(null)
    setExito(null)

    try {
      const comprobante = await crearComprobante({
        id_cliente: idCliente,
        id_sala: idSala,
        renglones: renglones.map((linea) => ({
          cod_vino: linea.cod_vino,
          cantidad: linea.cantidad,
        })),
      })

      setExito(`Venta registrada. Comprobante N.${comprobante.numero_comprobante}.`)
      setLineas([])
    } catch (err: unknown) {
      // El mensaje de la regla lo devuelve la API tal cual, sin recalcularlo.
      setErrorVenta(
        err instanceof ApiError ? err : new ApiError(0, 'No se pudo registrar la venta.'),
      )
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex flex-col gap-space-xs">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Nueva Venta</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Registrá una venta. Los importes y el stock los calcula la base de datos.
        </p>
      </header>

      {errorCarga && <ErrorBanner detail={errorCarga.detail} sqlstate={errorCarga.sqlstate} />}
      {errorVenta && <ErrorBanner detail={errorVenta.detail} sqlstate={errorVenta.sqlstate} />}
      {exito && <SuccessBanner message={exito} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg items-start">
        <section className="lg:col-span-1 flex flex-col gap-space-md bg-surface-container-lowest border border-[#e2e8f0] rounded-lg p-space-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">Datos de la venta</h2>

          <label className="flex flex-col gap-space-xs">
            <span className="font-label-md text-label-md text-on-surface-variant">Sala de venta</span>
            <select
              className={INPUT_CLASS}
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

          {salaSeleccionada && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Cierra los {salaSeleccionada.dia_cierre}.{' '}
              <span className="font-tabular-data text-tabular-data">
                CP {salaSeleccionada.codigo_postal}
              </span>
            </p>
          )}

          <label className="flex flex-col gap-space-xs">
            <span className="font-label-md text-label-md text-on-surface-variant">Cliente</span>
            <select
              className={INPUT_CLASS}
              onChange={(e) => setIdCliente(Number(e.target.value))}
              value={idCliente}
            >
              <option value="">Seleccione un cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id_cliente} value={cliente.id_cliente}>
                  {cliente.nombre_razon_social} ({cliente.tipo_cliente})
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-space-xs pt-space-sm border-t border-[#e2e8f0]">
            <span className="font-label-md text-label-md text-on-surface-variant">
              Disponibilidad en sala
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {vinosDisponibles.filter((vino) => vino.stock_sala > 0).length} de{' '}
              {vinosDisponibles.length} vinos con stock.
            </p>
          </div>
        </section>

        <section className="lg:col-span-2 flex flex-col gap-space-md bg-surface-container-lowest border border-[#e2e8f0] rounded-lg p-space-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">Vinos de la venta</h2>

          <form className="flex flex-wrap items-end gap-space-sm" onSubmit={agregarLinea}>
            <label className="flex-1 min-w-[220px] flex flex-col gap-space-xs">
              <span className="font-label-md text-label-md text-on-surface-variant">Vino</span>
              <select
                className={INPUT_CLASS}
                onChange={(e) => setCodVino(Number(e.target.value))}
                value={codVino}
              >
                <option value="">Seleccione un vino</option>
                {vinosDisponibles.map((vino) => (
                  <option key={vino.cod_vino} value={vino.cod_vino}>
                    {vino.nombre} - {vino.anada} - {vino.stock_sala} en stock
                  </option>
                ))}
              </select>
            </label>

            <label className="w-24 flex flex-col gap-space-xs">
              <span className="font-label-md text-label-md text-on-surface-variant">Cantidad</span>
              <input
                className={INPUT_CLASS}
                min={1}
                onChange={(e) => setCantidad(e.target.value)}
                type="number"
                value={cantidad}
              />
            </label>

            <button
              className="h-9 px-space-md rounded bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-40"
              disabled={codVino === ''}
              type="submit"
            >
              Agregar
            </button>
          </form>

          {vinoSeleccionado && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Precio de lista {formatoPrecio(vinoSeleccionado.precio)} por botella. El descuento
              segun el tipo de cliente lo aplica la base.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0]">
                  <th className="text-left py-space-sm font-label-md text-label-md text-on-surface-variant">
                    Vino
                  </th>
                  <th className="text-left py-space-sm font-label-md text-label-md text-on-surface-variant">
                    Precio
                  </th>
                  <th className="text-left py-space-sm font-label-md text-label-md text-on-surface-variant w-28">
                    Cantidad
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lineas.length === 0 && (
                  <tr>
                    <td
                      className="py-space-md font-body-md text-body-md text-on-surface-variant"
                      colSpan={4}
                    >
                      Todavia no agregaste vinos a la venta.
                    </td>
                  </tr>
                )}
                {lineas.map((linea) => {
                  const vino = vinosDisponibles.find((item) => item.cod_vino === linea.cod_vino)

                  return (
                    <tr className="border-b border-[#eef1f4]" key={linea.cod_vino}>
                      <td className="py-space-sm font-body-md text-body-md text-on-surface">
                        {vino ? vino.nombre : `Vino ${linea.cod_vino}`}
                        {vino && (
                          <span className="block font-body-sm text-body-sm text-on-surface-variant">
                            {vino.anada} - {vino.volumen_ml} ml
                          </span>
                        )}
                      </td>
                      <td className="py-space-sm font-tabular-data text-tabular-data text-on-surface">
                        {vino ? formatoPrecio(vino.precio) : '-'}
                      </td>
                      <td className="py-space-sm">
                        <input
                          className="w-20 h-8 px-space-sm bg-white border border-slate-300 rounded font-tabular-data text-tabular-data text-slate-900 focus:outline-none focus:border-[#800e13]"
                          min={1}
                          onChange={(e) => cambiarCantidad(linea.cod_vino, e.target.value)}
                          type="number"
                          value={linea.cantidad}
                        />
                      </td>
                      <td className="py-space-sm">
                        <button
                          aria-label={`Quitar ${vino ? vino.nombre : linea.cod_vino}`}
                          className="text-on-surface-variant hover:text-error transition-colors"
                          onClick={() => quitarLinea(linea.cod_vino)}
                          type="button"
                        >
                          <MaterialIcon name="close" className="text-[18px]" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-space-sm border-t border-[#e2e8f0]">
            <button
              className="px-space-lg h-10 rounded bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-40"
              disabled={registrando || lineas.length === 0}
              onClick={registrarVenta}
              type="submit"
            >
              {registrando ? 'Registrando...' : 'Registrar venta'}
            </button>
          </div>

          <p className="font-body-sm text-body-sm text-on-surface-variant">
            El total, el descuento y el stock los calcula PostgreSQL. Si no hay stock suficiente, la
            operacion se rechaza y no queda nada a medias.
          </p>
        </section>
      </div>
    </div>
  )
}
