import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { listarStockDeposito } from '../../api/deposito'
import { listarSalas } from '../../api/salas'
import {
  crearTransferencia,
  listarTransferencias,
  procesarTransferencia,
  terminarTransferencia,
} from '../../api/transferencias'
import type { EstadoDocumento, Sala, StockDepositoVino, Transferencia } from '../../api/types'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { SuccessBanner } from '../../components/ui/SuccessBanner'
import { RenglonTransferenciaModal } from './RenglonTransferenciaModal'

interface LineaCarga {
  cod_vino: number
  cantidad: number
}

const ETIQUETA_CLASS =
  'font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold'

const CAMPO_CLASS =
  'w-full h-9 bg-field border border-field-border rounded-lg px-2.5 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors'

const ESTILO_ESTADO: Record<EstadoDocumento, string> = {
  en_confeccion: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  terminado: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  procesado: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
}

export function TransferenciasPage() {
  const [salas, setSalas] = useState<Sala[]>([])
  const [idSala, setIdSala] = useState<number | ''>('')
  const [stock, setStock] = useState<StockDepositoVino[]>([])
  const [lineas, setLineas] = useState<LineaCarga[]>([])
  const [codVino, setCodVino] = useState<number | ''>('')
  const [cantidad, setCantidad] = useState('1')
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [transferenciaSeleccionada, setTransferenciaSeleccionada] = useState<Transferencia | null>(
    null,
  )
  const [filtroEstado, setFiltroEstado] = useState<EstadoDocumento | 'todas'>('todas')
  const [formAbierto, setFormAbierto] = useState(true)
  const [errorCarga, setErrorCarga] = useState<ApiError | null>(null)
  const [errorAccion, setErrorAccion] = useState<ApiError | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  // La fecha de confección la fija la base (RN-11). Se muestra la del
  // servidor en el momento de abrir la pantalla.
  const [fechaConfeccion] = useState(() => new Date().toLocaleString('es-AR'))

  useEffect(() => {
    let active = true

    Promise.all([listarSalas(), listarStockDeposito(), listarTransferencias()])
      .then(([datosSalas, datosStock, datosTransferencias]) => {
        if (!active) {
          return
        }
        setSalas(datosSalas)
        setStock(datosStock)
        setTransferencias(datosTransferencias)
        if (datosSalas.length > 0) {
          setIdSala(datosSalas[0].id_sala)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setErrorCarga(
            err instanceof ApiError
              ? err
              : new ApiError(0, 'No se pudieron cargar los datos de transferencias.'),
          )
        }
      })

    return () => {
      active = false
    }
  }, [])

  const stockPorVino = useMemo(() => {
    const mapa = new Map<number, number>()

    stock.forEach((vino) => {
      mapa.set(vino.cod_vino, vino.stock_deposito)
    })

    return mapa
  }, [stock])

  const conteos = useMemo(() => {
    const totales = { todas: 0, en_confeccion: 0, terminado: 0, procesado: 0 }

    transferencias.forEach((transferencia) => {
      totales.todas += 1
      totales[transferencia.estado] += 1
    })

    return totales
  }, [transferencias])

  const visibles = useMemo(
    () =>
      filtroEstado === 'todas'
        ? transferencias
        : transferencias.filter((transferencia) => transferencia.estado === filtroEstado),
    [transferencias, filtroEstado],
  )

  const totalBotellas = useMemo(
    () => lineas.reduce((acumulado, linea) => acumulado + linea.cantidad, 0),
    [lineas],
  )

  function agregarLinea(evento: FormEvent) {
    evento.preventDefault()

    if (codVino === '' || Number(cantidad) <= 0) {
      return
    }

    if (lineas.some((linea) => linea.cod_vino === codVino)) {
      setErrorAccion(new ApiError(0, 'Ese vino ya está en la solicitud.'))
      return
    }

    const disponible = stockPorVino.get(codVino) ?? 0

    if (Number(cantidad) > disponible) {
      setErrorAccion(
        new ApiError(0, `El depósito tiene ${disponible} botellas de ese vino.`),
      )
      return
    }

    setLineas([...lineas, { cod_vino: codVino, cantidad: Number(cantidad) }])
    setCodVino('')
    setCantidad('1')
    setErrorAccion(null)
  }

  function quitarLinea(cod: number) {
    setLineas(lineas.filter((linea) => linea.cod_vino !== cod))
  }

  function descartar() {
    setLineas([])
    setCodVino('')
    setCantidad('1')
    setErrorAccion(null)
  }

  async function guardarSolicitud(evento: FormEvent) {
    evento.preventDefault()

    if (idSala === '') {
      setErrorAccion(new ApiError(0, 'Elegí la sala solicitante.'))
      return
    }

    if (lineas.length === 0) {
      setErrorAccion(new ApiError(0, 'Agregá al menos un vino a la solicitud.'))
      return
    }

    setOcupado(true)
    setErrorAccion(null)
    setExito(null)

    try {
      const transferencia = await crearTransferencia({
        id_sala: idSala,
        renglones: lineas.map((linea) => ({
          cod_vino: linea.cod_vino,
          cantidad: linea.cantidad,
        })),
      })

      setExito(
        `Solicitud N.${transferencia.numero_solicitud} creada en confección con ${lineas.length} línea(s).`,
      )
      descartar()
      setTransferencias(await listarTransferencias())
    } catch (err: unknown) {
      setErrorAccion(
        err instanceof ApiError
          ? err
          : new ApiError(0, 'No se pudo crear la transferencia.'),
      )
    } finally {
      setOcupado(false)
    }
  }

  async function cambiarEstado(transferencia: Transferencia, accion: 'terminar' | 'procesar') {
    setOcupado(true)
    setErrorAccion(null)
    setExito(null)

    try {
      if (accion === 'terminar') {
        await terminarTransferencia(transferencia.numero_solicitud)
        setExito(`Transferencia N.${transferencia.numero_solicitud} terminada.`)
      } else {
        await procesarTransferencia(transferencia.numero_solicitud)
        setExito(`Transferencia N.${transferencia.numero_solicitud} procesada.`)
      }

      setTransferencias(await listarTransferencias())
    } catch (err: unknown) {
      setErrorAccion(
        err instanceof ApiError
          ? err
          : new ApiError(0, 'No se pudo cambiar el estado de la transferencia.'),
      )
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="flex flex-col w-full">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-space-lg mb-space-lg border-b border-outline-variant">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-space-xs">
            <span>Inventario</span>
            <MaterialIcon name="chevron_right" className="text-[14px]" />
            <span>Logística Interna</span>
            <MaterialIcon name="chevron_right" className="text-[14px]" />
            <span className="text-primary font-semibold">Transferencias de Stock</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Transferencias de Stock
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Movimiento interno de producto terminado entre Depósito Central y Salas de Venta (RN-11)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm mt-space-md md:mt-0">
          <div className="inline-flex items-center gap-space-xs px-2.5 py-1 bg-surface-container rounded-lg border border-outline-variant font-label-sm text-label-sm text-on-surface">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-on-surface-variant font-normal">Nodo:</span>
            <span className="font-semibold text-on-surface">Depósito Central</span>
          </div>
          <div className="inline-flex items-center gap-space-xs px-2.5 py-1 bg-surface-container rounded-lg border border-outline-variant font-label-sm text-label-sm text-on-surface">
            <MaterialIcon name="verified_user" className="text-[15px] text-primary" />
            <span className="text-on-surface-variant font-normal">Stock:</span>
            <span className="font-semibold text-on-surface">Modo Transaccional</span>
          </div>
        </div>
      </div>

      {errorCarga && <ErrorBanner detail={errorCarga.detail} sqlstate={errorCarga.sqlstate} />}
      {errorAccion && <ErrorBanner detail={errorAccion.detail} sqlstate={errorAccion.sqlstate} />}
      {exito && <SuccessBanner message={exito} />}

      {/* Nueva solicitud */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-lg mb-space-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-space-lg py-space-md bg-surface-container-low border-b border-outline-variant">
          <div className="flex items-center gap-space-md">
            <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
              <MaterialIcon name="post_add" className="text-[18px]" />
            </div>
            <div className="flex items-center gap-space-sm">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Nueva Solicitud de Transferencia
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg font-label-sm text-label-sm bg-amber-500/15 text-amber-300 border border-amber-500/40">
                En confección
              </span>
            </div>
          </div>

          <button
            className="inline-flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface px-space-sm py-1 rounded transition-colors"
            onClick={() => setFormAbierto(!formAbierto)}
            type="button"
          >
            <span className="text-xs font-medium">{formAbierto ? 'Plegar' : 'Desplegar'}</span>
            <MaterialIcon
              className={`text-[18px] transition-transform duration-200 ${
                formAbierto ? '' : 'rotate-180'
              }`}
              name={formAbierto ? 'expand_less' : 'expand_more'}
            />
          </button>
        </div>

        {formAbierto && (
          <form className="flex flex-col p-space-lg gap-space-lg" onSubmit={guardarSolicitud}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg items-start">
              <div className="flex flex-col">
                <label className={`${ETIQUETA_CLASS} mb-1`} htmlFor="select-sala">
                  Sala Solicitante <span className="text-error">*</span>
                </label>
                <select
                  className={CAMPO_CLASS}
                  id="select-sala"
                  onChange={(e) => setIdSala(Number(e.target.value))}
                  value={idSala}
                >
                  {salas.map((sala) => (
                    <option key={sala.id_sala} value={sala.id_sala}>
                      {sala.calle} {sala.numero} - {sala.localidad}
                    </option>
                  ))}
                </select>
                <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Punto de recepción de expedición final
                </span>
              </div>

              <div className="flex flex-col">
                <label className={`${ETIQUETA_CLASS} mb-1`} htmlFor="input-fecha">
                  Fecha de Confección
                </label>
                <div className="relative flex items-center">
                  <input
                    className="w-full h-9 bg-surface-container border border-field-border rounded-lg px-2.5 font-tabular-data text-tabular-data text-on-surface-variant cursor-not-allowed select-none"
                    id="input-fecha"
                    readOnly
                    type="text"
                    value={fechaConfeccion}
                  />
                  <MaterialIcon
                    name="lock"
                    className="absolute right-2.5 text-on-surface-variant text-[18px]"
                  />
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant mt-1 text-[11px] leading-tight">
                  Bloqueado por regla de auditoría RN-11 (timestamp del servidor)
                </span>
              </div>

              <div className="flex flex-col">
                <span className={`${ETIQUETA_CLASS} mb-1`}>Depósito de Origen</span>
                <div className="h-9 px-3 bg-surface-container border border-outline-variant rounded-lg flex items-center gap-space-xs text-on-surface">
                  <MaterialIcon name="warehouse" className="text-[18px] text-on-surface-variant" />
                  <span className="font-body-md text-body-md font-medium truncate">
                    Depósito Central
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Ubicación física autorizada para salida
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant mb-space-sm">
                <span className="font-label-md text-label-md text-on-surface uppercase tracking-wide">
                  Líneas de Carga Solicitadas
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Control estricto de lote en stock
                </span>
              </div>

              <div className="overflow-x-auto border border-outline-variant rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low border-b border-outline-variant">
                    <tr>
                      <th className="py-2.5 px-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                        Vino / Presentación
                      </th>
                      <th className="py-2.5 px-3 font-label-sm text-label-sm text-on-surface-variant text-right uppercase tracking-wider w-40">
                        Stock en Origen
                      </th>
                      <th className="py-2.5 px-3 font-label-sm text-label-sm text-on-surface-variant text-right uppercase tracking-wider w-44">
                        Cantidad a Transferir
                      </th>
                      <th className="py-2.5 px-3 font-label-sm text-label-sm text-on-surface-variant text-center uppercase tracking-wider w-20">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60 font-body-md text-body-md">
                    {lineas.length === 0 && (
                      <tr>
                        <td
                          className="py-space-md font-body-md text-body-md text-on-surface-variant"
                          colSpan={4}
                        >
                          Todavia no agregaste vinos a la solicitud.
                        </td>
                      </tr>
                    )}
                    {lineas.map((linea) => {
                      const vino = stock.find((item) => item.cod_vino === linea.cod_vino)
                      const excede = vino !== undefined && linea.cantidad > vino.stock_deposito

                      return (
                        <tr className="hover:bg-surface-container-low transition-colors" key={linea.cod_vino}>
                          <td className="py-2 px-3">
                            <span className="font-body-md text-body-md text-on-surface">
                              {vino ? vino.nombre : `Vino ${linea.cod_vino}`}
                              {vino && (
                                <span className="block font-body-sm text-body-sm text-on-surface-variant">
                                  {vino.anada} - {vino.volumen_ml} ml
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className="inline-flex items-center gap-1 font-tabular-data text-tabular-data text-on-surface bg-surface-container px-2 py-0.5 rounded">
                              {vino ? `${vino.stock_deposito} un.` : '-'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="inline-flex items-center justify-end w-full">
                              <input
                                className={`w-24 h-8 text-right bg-field border rounded-lg px-2 font-tabular-data text-tabular-data font-semibold text-on-surface focus:outline-none focus:ring-1 ${
                                  excede
                                    ? 'border-error focus:border-error focus:ring-error'
                                    : 'border-field-border focus:border-primary focus:ring-primary'
                                }`}
                                max={vino?.stock_deposito}
                                min={1}
                                onChange={(e) =>
                                  setLineas(
                                    lineas.map((item) =>
                                      item.cod_vino === linea.cod_vino
                                        ? { ...item, cantidad: Number(e.target.value) }
                                        : item,
                                    ),
                                  )
                                }
                                type="number"
                                value={linea.cantidad}
                              />
                              <span className="ml-1.5 font-label-sm text-label-sm text-on-surface-variant">
                                un.
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              className="w-7 h-7 inline-flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded transition-colors"
                              onClick={() => quitarLinea(linea.cod_vino)}
                              title="Eliminar partida"
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

              <div className="mt-space-sm flex justify-start gap-space-sm">
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
                    {stock.map((vino) => (
                      <option key={vino.cod_vino} value={vino.cod_vino}>
                        {vino.nombre} - {vino.anada} - {vino.stock_deposito} en depósito
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
                  className="inline-flex items-center gap-space-xs px-3 py-1.5 h-9 bg-surface-container-lowest border border-field-border hover:bg-surface-container rounded-lg font-label-md text-label-md text-on-surface transition-colors"
                  disabled={codVino === ''}
                  onClick={agregarLinea}
                  type="button"
                >
                  <MaterialIcon name="add_circle" className="text-[16px] text-primary" />
                  <span>Agregar vino</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-space-md border-t border-outline-variant gap-space-md bg-surface-container-low -mx-space-lg -mb-space-lg px-space-lg py-space-md">
              <div className="flex items-center gap-space-md">
                <MaterialIcon name="receipt_long" className="text-[20px] text-on-surface-variant" />
                <span className="font-tabular-data text-tabular-data text-on-surface">
                  <strong className="font-semibold text-on-surface">{lineas.length}</strong>{' '}
                  referencias añadidas |{' '}
                  <strong className="font-semibold text-on-surface">{totalBotellas}</strong>{' '}
                  botellas totales
                </span>
              </div>

              <div className="flex items-center gap-space-sm w-full sm:w-auto justify-end">
                <button
                  className="px-4 py-2 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container rounded-lg font-label-md text-label-md text-on-surface transition-colors"
                  onClick={descartar}
                  type="button"
                >
                  Descartar
                </button>
                <button
                  className="inline-flex items-center gap-space-xs px-4 py-2 bg-primary-container hover:bg-primary hover:text-on-primary text-on-primary-container rounded-lg font-label-md text-label-md tracking-wide transition-colors shadow-sm disabled:opacity-40"
                  disabled={ocupado || lineas.length === 0}
                  type="submit"
                >
                  <MaterialIcon name="save" className="text-[18px]" />
                  <span>Crear Solicitud en Confección</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Registro historico */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between px-space-lg py-space-md border-b border-outline-variant gap-space-md bg-surface-container-lowest">
          <div className="flex items-center gap-space-md">
            <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
              <MaterialIcon name="swap_horiz" className="text-[18px]" />
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Registro Histórico de Transferencias
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {conteos.todas} Solicitudes registradas en el período activo
              </p>
            </div>
          </div>

          <div className="inline-flex p-0.5 bg-surface-container border border-outline-variant rounded-lg self-start md:self-auto">
            {(
              [
                ['todas', 'Todas'],
                ['en_confeccion', 'En confección'],
                ['terminado', 'Terminado'],
                ['procesado', 'Procesado'],
              ] as const
            ).map(([valor, etiqueta]) => (
              <button
                className={`px-3 py-1 font-label-sm text-label-sm rounded transition-all ${
                  filtroEstado === valor
                    ? 'bg-surface-container-lowest text-primary font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                key={valor}
                onClick={() => setFiltroEstado(valor)}
                type="button"
              >
                {etiqueta} ({conteos[valor]})
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-28">
                  Nro Solicitud
                </th>
                <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Sala Destino
                </th>
                <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-36">
                  Fecha Registro
                </th>
                <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-44">
                  Ítems / Cantidad
                </th>
                <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-36">
                  Estado
                </th>
                <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant text-right uppercase tracking-wider w-56">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 font-body-md text-body-md">
              {visibles.length === 0 && (
                <tr>
                  <td
                    className="py-space-md font-body-md text-body-md text-on-surface-variant"
                    colSpan={6}
                  >
                    No hay transferencias en este estado.
                  </td>
                </tr>
              )}
              {visibles.map((transferencia) => (
                <tr
                  className="hover:bg-surface-container-low/50 transition-colors"
                  key={transferencia.numero_solicitud}
                >
                  <td
                    className={`py-3 px-4 font-tabular-data text-tabular-data font-semibold ${
                      transferencia.estado === 'procesado' ? 'text-on-surface-variant' : 'text-primary'
                    }`}
                  >
                    N.{transferencia.numero_solicitud}
                  </td>
                  <td className="py-3 px-4 font-medium text-on-surface">
                    {transferencia.calle_sala} {transferencia.numero_sala}
                    <span className="block font-body-sm text-body-sm text-on-surface-variant">
                      {transferencia.localidad_sala}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-tabular-data text-tabular-data text-on-surface-variant">
                    {transferencia.fecha_confeccion}
                  </td>
                  <td className="py-3 px-4 font-tabular-data text-tabular-data text-on-surface">
                    <span className="font-medium text-on-surface">
                      {transferencia.cantidad_renglones ?? 0} vinos
                    </span>{' '}
                    <span className="text-on-surface-variant">
                      / {transferencia.total_botellas ?? 0} un.
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded font-label-sm text-label-sm border ${ESTILO_ESTADO[transferencia.estado]}`}
                    >
                      {transferencia.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {transferencia.estado === 'en_confeccion' && (
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-container-lowest border border-field-border hover:bg-surface-container rounded font-label-md text-label-md text-on-surface transition-colors"
                          onClick={() => setTransferenciaSeleccionada(transferencia)}
                          type="button"
                        >
                          <MaterialIcon name="add" className="text-[16px] text-primary" />
                          <span>Renglón</span>
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-container-lowest border border-field-border hover:bg-blue-500/15 hover:text-blue-300 hover:border-blue-500/40 rounded font-label-md text-label-md text-on-surface transition-colors"
                          disabled={ocupado}
                          onClick={() => cambiarEstado(transferencia, 'terminar')}
                          type="button"
                        >
                          <MaterialIcon name="check_circle" className="text-[16px] text-blue-400" />
                          <span>Marcar como Terminado</span>
                        </button>
                      </div>
                    )}

                    {transferencia.estado === 'terminado' && (
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-container hover:bg-primary hover:text-on-primary text-on-primary-container rounded font-label-md text-label-md tracking-wide transition-colors shadow-xs disabled:opacity-40"
                        disabled={ocupado}
                        onClick={() => cambiarEstado(transferencia, 'procesar')}
                        type="button"
                      >
                        <MaterialIcon name="output" className="text-[16px]" />
                        <span>Procesar en Depósito</span>
                      </button>
                    )}

                    {transferencia.estado === 'procesado' && (
                      <div className="inline-flex items-center justify-end gap-1 font-body-sm text-body-sm text-on-surface-variant">
                        <MaterialIcon name="check" className="text-emerald-500 text-[16px]" />
                        <span>Procesado (Stock impactado)</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between px-space-lg py-space-sm bg-surface-container-low border-t border-outline-variant font-label-sm text-label-sm text-on-surface-variant">
          <div>
            Mostrando {visibles.length} de {conteos.todas} solicitudes registradas
          </div>
          <div className="flex items-center gap-space-xs mt-2 sm:mt-0">
            <span>Auditoría de almacén habilitada</span>
            <span className="text-on-surface">•</span>
            <span>Módulo RN-11 Rev. 2026</span>
          </div>
        </div>
      </section>

      {/* Carga de renglones en una transferencia en confección */}
      {transferenciaSeleccionada && (
        <RenglonTransferenciaModal
          key={transferenciaSeleccionada.numero_solicitud}
          onCargado={async () => {
            setTransferencias(await listarTransferencias())
          }}
          onClose={() => setTransferenciaSeleccionada(null)}
          open
          stock={stock}
          transferencia={transferenciaSeleccionada}
        />
      )}
    </div>
  )
}
