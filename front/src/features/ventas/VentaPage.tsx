import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { listarClientes } from '../../api/clientes'
import { listarSalas, obtenerStockSala } from '../../api/salas'
import { crearComprobante } from '../../api/ventas'
import type { ClienteResumen, Sala, StockSalaVino } from '../../api/types'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { SuccessBanner } from '../../components/ui/SuccessBanner'
import { formatoPrecio } from '../../lib/format'

interface LineaVenta {
  cod_vino: number
  cantidad: number
}

const CANTIDAD_INICIAL = 1

const CAMPO_CLASS =
  'w-full h-9 bg-field border border-field-border rounded px-2.5 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer'

const ETIQUETA_CLASS =
  'font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold'

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
  // La fecha se fija al montar la pantalla: es un dato de solo lectura y no
  // debe cambiar en cada re-render.
  const [fechaEmision] = useState(() => new Date().toLocaleString('es-AR'))

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

  const salaSeleccionada = useMemo(
    () => salas.find((sala) => sala.id_sala === idSala),
    [salas, idSala],
  )

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente) => cliente.id_cliente === idCliente),
    [clientes, idCliente],
  )

  const DESCUENTOS: Record<string, number> = {
    socio: 10,
    distribuidor: 20,
    exportador: 30,
  }

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

      setExito(
        `Comprobante N.${comprobante.numero_comprobante} emitido. Total ${formatoPrecio(
          comprobante.total,
        )}.`,
      )
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

  const hayErrorDeStock = errorVenta?.status === 409

  return (
    <div className="flex flex-col w-full">
      {/* Encabezado con ruta de la operacion */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-space-md border-b border-surface-container-high gap-space-sm">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant tracking-wider uppercase">
            <span>Ventas</span>
            <span className="text-outline">/</span>
            <span>Registro de salidas</span>
            <span className="text-outline">/</span>
            <span className="text-primary font-semibold">Nueva venta</span>
          </div>
          <div className="flex items-center gap-space-md mt-space-xs">
            <h1 className="font-headline-xl text-headline-xl text-on-surface">
              Nueva Venta (Punto de Venta Interno)
            </h1>
            {lineas.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface-container-high text-on-surface font-label-sm text-label-sm rounded border border-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                {lineas.length} Renglón {lineas.length === 1 ? 'activo' : 'activos'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-space-md font-tabular-data text-tabular-data text-on-surface-variant bg-surface-container-lowest px-3 py-1.5 rounded border border-surface-container-high shadow-sm">
          <div className="flex items-center gap-1.5">
            <MaterialIcon name="dns" className="text-[16px] text-outline" />
            <span>
              Sala:{' '}
              <strong className="text-on-surface font-medium">
                {salaSeleccionada ? `ID ${salaSeleccionada.id_sala}` : '-'}
              </strong>
            </span>
          </div>
          <span className="text-surface-dim">|</span>
          <div className="flex items-center gap-1.5">
            <MaterialIcon name="verified_user" className="text-[16px] text-outline" />
            <span>
              Módulo Fiscal: <strong className="text-on-surface font-medium">Activo</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Error de la regla de negocio (RN-09) */}
      {errorVenta && (
        <div className="mt-space-lg bg-error-container border border-error rounded p-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-start gap-space-md">
            <div className="w-8 h-8 rounded bg-error/20 flex items-center justify-center flex-shrink-0 text-on-error-container">
              <MaterialIcon name="error" className="text-[20px]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-error text-on-error font-label-sm text-label-sm tracking-wide font-bold">
                  ERROR {errorVenta.status}
                  {errorVenta.sqlstate ? ` (${errorVenta.sqlstate})` : ''}
                </span>
                <span className="font-label-md text-label-md text-on-error-container font-semibold">
                  {hayErrorDeStock
                    ? 'Excepción de Inventario Físico - Política RN-09'
                    : 'La operación fue rechazada por la base de datos'}
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-error-container mt-1">
                {errorVenta.detail}
              </p>
            </div>
          </div>

          {hayErrorDeStock && (
            <div className="flex items-center gap-space-md pl-11 md:pl-0 flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-1 bg-error/10 border border-error/40 rounded font-label-sm text-label-sm text-on-error-container">
                <MaterialIcon name="inventory_2" className="text-[16px]" />
                <span className="font-semibold">No se registró ningún dato a medias</span>
              </div>
            </div>
          )}
        </div>
      )}

      {errorCarga && (
        <div className="mt-space-lg bg-error-container border border-error rounded p-space-md">
          <p className="font-body-md text-body-md text-on-error-container">{errorCarga.detail}</p>
        </div>
      )}

      {exito && (
        <div className="mt-space-lg">
          <SuccessBanner message={exito} />
        </div>
      )}

      {/* Comprobante */}
      <div className="mt-space-lg bg-surface-container-lowest border border-outline-variant rounded p-space-xl shadow-sm flex flex-col gap-space-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg pb-space-lg border-b border-outline-variant">
          <div className="flex flex-col gap-1">
            <label className={`${ETIQUETA_CLASS} flex items-center justify-between`}>
              <span>Sala de Venta</span>
              <span className="text-primary font-mono text-[10px]">
                {salaSeleccionada ? `ID ${salaSeleccionada.id_sala}` : ''}
              </span>
            </label>
            <select
              className={CAMPO_CLASS}
              onChange={(e) => setIdSala(Number(e.target.value))}
              value={idSala}
            >
              {salas.map((sala) => (
                <option key={sala.id_sala} value={sala.id_sala}>
                  {sala.calle} {sala.numero} - {sala.localidad}
                </option>
              ))}
            </select>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {salaSeleccionada
                ? `Cierra los ${salaSeleccionada.dia_cierre}. Despacho inmediato desde el depósito.`
                : 'Depósito de origen físico y despacho inmediato'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label className={`${ETIQUETA_CLASS} flex items-center justify-between`}>
              <span>Cliente / Razón Social</span>
              {clienteSeleccionado && (
                <span className="text-tertiary font-mono text-[10px] bg-tertiary-container/20 px-1 border border-tertiary-fixed-dim/40 rounded">
                  Descuento {DESCUENTOS[clienteSeleccionado.tipo_cliente]}%
                </span>
              )}
            </label>
            <select
              className={CAMPO_CLASS}
              onChange={(e) => setIdCliente(Number(e.target.value))}
              value={idCliente}
            >
              <option value="">Seleccione un cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id_cliente} value={cliente.id_cliente}>
                  {cliente.nombre_razon_social} - Descuento:{' '}
                  {DESCUENTOS[cliente.tipo_cliente]}%
                </option>
              ))}
            </select>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {clienteSeleccionado
                ? `${clienteSeleccionado.tipo_doc} ${clienteSeleccionado.nro_doc} - ${clienteSeleccionado.localidad}`
                : 'El descuento según el tipo de cliente lo aplica la base'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label className={`${ETIQUETA_CLASS} flex items-center justify-between`}>
              <span>Fecha y Hora de Emisión</span>
              <span className="inline-flex items-center gap-0.5 text-on-surface-variant font-label-sm text-[10px]">
                <MaterialIcon name="lock" className="text-[12px]" />
                Solo lectura
              </span>
            </label>
            <div className="relative flex items-center">
              <input
                className="w-full h-9 bg-surface-container border border-field-border rounded px-2.5 font-tabular-data text-tabular-data text-on-surface-variant cursor-not-allowed select-none focus:outline-none font-mono"
                readOnly
                type="text"
                value={fechaEmision}
              />
              <MaterialIcon name="schedule" className="text-outline text-[18px] absolute right-2.5 pointer-events-none" />
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Sincronizado con el huso horario del servidor central
            </span>
          </div>
        </div>

        {/* Renglones */}
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-md text-headline-md text-on-surface">
                Detalle de Renglones de Despacho
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container font-label-sm text-label-sm text-on-surface-variant font-medium">
                {lineas.length} Renglón {lineas.length === 1 ? 'activo' : 'activos'}
              </span>
            </div>
            <div className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
              <MaterialIcon name="info" className="text-[14px]" />
              Precios fijados en Moneda Nacional (ARS)
            </div>
          </div>

          <div className="w-full overflow-x-auto border border-outline-variant rounded">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className={`py-2.5 px-3.5 ${ETIQUETA_CLASS}`}>Vino / Presentación</th>
                  <th className={`py-2.5 px-3.5 ${ETIQUETA_CLASS} text-center w-36`}>
                    Cantidad
                  </th>
                  <th className={`py-2.5 px-3.5 ${ETIQUETA_CLASS} text-right w-44`}>
                    Precio Unitario
                  </th>
                  <th className={`py-2.5 px-3.5 ${ETIQUETA_CLASS} text-right w-44`}>
                    Stock en sala
                  </th>
                  <th className={`py-2.5 px-3.5 ${ETIQUETA_CLASS} text-center w-24`}>
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 bg-surface-container-lowest">
                {lineas.length === 0 && (
                  <tr>
                    <td
                      className="py-space-md font-body-md text-body-md text-on-surface-variant"
                      colSpan={5}
                    >
                      Todavia no agregaste vinos a la venta.
                    </td>
                  </tr>
                )}
                {lineas.map((linea) => {
                  const vino = vinosDisponibles.find((item) => item.cod_vino === linea.cod_vino)
                  const insuficiente = vino !== undefined && linea.cantidad > vino.stock_sala

                  return (
                    <tr className="hover:bg-surface-container-low transition-colors group" key={linea.cod_vino}>
                      <td className="py-2.5 px-3.5 align-middle">
                        <div className="flex flex-col gap-1">
                          <span className="font-body-md text-body-md text-on-surface">
                            {vino ? vino.nombre : `Vino ${linea.cod_vino}`}
                            {vino && (
                              <span className="block font-body-sm text-body-sm text-on-surface-variant">
                                {vino.anada} - {vino.volumen_ml} ml
                              </span>
                            )}
                          </span>
                          {vino && insuficiente && (
                            <span className="text-error font-label-sm text-[11px] font-medium flex items-center gap-0.5">
                              <MaterialIcon name="warning" className="text-[13px]" />
                              Stock en sala: {vino.stock_sala} un. (Insuficiente)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 align-middle">
                        <div className="flex justify-center">
                          <div className="relative w-28">
                            <input
                              className={`w-full h-8.5 text-center font-tabular-data text-tabular-data font-semibold bg-field border rounded px-2 text-on-surface focus:outline-none focus:ring-1 ${
                                insuficiente
                                  ? 'border-error focus:border-error focus:ring-error'
                                  : 'border-field-border focus:border-primary focus:ring-primary'
                              }`}
                              min={1}
                              onChange={(e) => cambiarCantidad(linea.cod_vino, e.target.value)}
                              type="number"
                              value={linea.cantidad}
                            />
                            <span className="absolute right-2 top-2 font-label-sm text-label-sm text-on-surface-variant">
                              un.
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 align-middle text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-tabular-data text-tabular-data text-on-surface font-mono">
                            {vino ? formatoPrecio(vino.precio) : '-'}
                          </span>
                          <span className="font-label-sm text-[10px] text-on-surface-variant">
                            Base sin desc.
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 align-middle text-right">
                        <span
                          className={`font-tabular-data text-tabular-data font-semibold font-mono ${
                            insuficiente ? 'text-error' : 'text-on-surface-variant'
                          }`}
                        >
                          {vino ? vino.stock_sala : '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 align-middle text-center">
                        <button
                          className="w-8 h-8 rounded border border-transparent hover:border-error/40 hover:bg-error-container text-on-surface-variant hover:text-error transition-colors inline-flex items-center justify-center"
                          onClick={() => quitarLinea(linea.cod_vino)}
                          title="Quitar renglón"
                          type="button"
                        >
                          <MaterialIcon name="delete" className="text-[18px]" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Agregar renglon */}
          <form className="flex flex-wrap items-end gap-space-sm pt-1" onSubmit={agregarLinea}>
            <label className="flex-1 min-w-[240px] flex flex-col gap-space-xs">
              <span className={`${ETIQUETA_CLASS} normal-case tracking-normal`}>
                Vino a agregar
              </span>
              <select
                className={CAMPO_CLASS}
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
              <span className={`${ETIQUETA_CLASS} normal-case tracking-normal`}>Cantidad</span>
              <input
                className={CAMPO_CLASS}
                min={1}
                onChange={(e) => setCantidad(e.target.value)}
                type="number"
                value={cantidad}
              />
            </label>

            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 h-9 rounded bg-surface-container-lowest border border-field-border text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md"
              disabled={codVino === ''}
              type="submit"
            >
              <MaterialIcon name="add" className="text-[16px]" />
              + Agregar Renglón
            </button>
          </form>
        </div>

        {/* Liquidacion y auditoria */}
        <div className="pt-space-lg border-t border-outline-variant grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <div className="bg-surface-container-low border border-outline-variant rounded p-space-md flex flex-col gap-space-sm">
              <div className="flex items-center gap-2 text-on-surface font-label-md text-label-md font-semibold border-b border-outline-variant pb-2">
                <MaterialIcon name="gavel" className="text-[18px] text-secondary" />
                Parámetros Fiscales y Verificación Operativa
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm font-body-sm text-body-sm text-on-surface-variant pt-1">
                <div className="flex flex-col">
                  <span className={`${ETIQUETA_CLASS} normal-case tracking-normal`}>
                    Punto de Emisión Fiscal:
                  </span>
                  <span className="font-mono text-on-surface font-medium">
                    Bodega {salaSeleccionada ? `SALA-${String(salaSeleccionada.id_sala).padStart(2, '0')}` : '-'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className={`${ETIQUETA_CLASS} normal-case tracking-normal`}>
                    Tipo de Comprobante:
                  </span>
                  <span className="text-on-surface font-medium">Comprobante de Venta</span>
                </div>
                <div className="flex flex-col sm:col-span-2 mt-1">
                  <span className={`${ETIQUETA_CLASS} normal-case tracking-normal`}>
                    Validación de Inventario:
                  </span>
                  <span className="text-on-surface flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-error" />
                    Validación de stock en tiempo real mediante base de datos transaccional con
                    bloqueo de concurrencia.
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-surface-container-lowest border border-dashed border-field-border rounded font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
              <MaterialIcon name="verified" className="text-[18px] text-outline" />
              <span>
                El descuento por tipo de cliente y el total los valida y registra PostgreSQL
                mediante los triggers RN-06, RN-08 y RN-09.
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-space-md">
            <div className="bg-surface-container-low border border-outline-variant rounded p-space-lg flex flex-col gap-space-sm shadow-xs">
              <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant">
                <span className={`${ETIQUETA_CLASS}`}>Liquidación del Comprobante</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">ARS</span>
              </div>

              <div className="flex flex-col gap-2 pt-1 font-tabular-data text-tabular-data">
                <div className="flex items-center justify-between text-on-surface">
                  <span className="text-on-surface-variant">Subtotal Bruto:</span>
                  <span className="font-mono font-medium">—</span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Descuento aplicado:</span>
                  <span className="font-mono font-medium">
                    {clienteSeleccionado
                      ? `${DESCUENTOS[clienteSeleccionado.tipo_cliente]}% según tipo de cliente`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant text-xs">
                  <span>Validación de inventario:</span>
                  <span className="font-mono">En la base de datos</span>
                </div>
              </div>

              <div className="h-px bg-outline-variant my-1" />

              <div className="flex items-baseline justify-between pt-1">
                <div className="flex flex-col">
                  <span className="font-headline-md text-headline-md text-on-surface uppercase tracking-tight font-bold">
                    Total Final:
                  </span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">
                    Calculado por PostgreSQL
                  </span>
                </div>
                <div className="font-headline-xl text-headline-xl text-primary font-mono font-bold tracking-tight">
                  —
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant/60 mt-1">
                <p className="font-label-sm text-[11px] text-on-surface-variant leading-relaxed italic">
                  * Los totales y descuentos definitivos son validados y registrados directamente
                  por la base de datos. Se muestran al emitir el comprobante.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-md pt-1">
              <button
                className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container rounded font-label-md text-label-md transition-colors"
                onClick={() => {
                  setLineas([])
                  setErrorVenta(null)
                  setExito(null)
                }}
                type="button"
              >
                Cancelar comprobante
              </button>
              <button
                className="px-6 py-2 bg-primary-container hover:bg-primary hover:text-on-primary active:bg-primary/80 text-on-primary-container rounded font-label-md text-label-md font-semibold tracking-wide transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-40"
                disabled={registrando || lineas.length === 0}
                onClick={registrarVenta}
                type="button"
              >
                <MaterialIcon name="receipt_long" className="text-[18px]" />
                {registrando ? 'Emitiendo...' : 'Emitir Comprobante de Venta'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
