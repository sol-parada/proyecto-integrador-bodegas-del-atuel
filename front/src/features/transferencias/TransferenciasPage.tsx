import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { listarSalas, obtenerStockSala } from '../../api/salas'
import {
  agregarRenglonTransferencia,
  crearTransferencia,
  listarTransferencias,
  obtenerTransferencia,
  procesarTransferencia,
  terminarTransferencia,
} from '../../api/transferencias'
import type { EstadoDocumento, Sala, StockSalaVino, Transferencia } from '../../api/types'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { SuccessBanner } from '../../components/ui/SuccessBanner'

const INPUT_CLASS =
  'w-full h-9 px-space-sm bg-white border border-slate-300 rounded font-body-md text-body-md text-slate-900 focus:outline-none focus:border-[#800e13] focus:ring-1 focus:ring-[#800e13] transition-colors'

const ETIQUETA_ESTADO: Record<EstadoDocumento, { texto: string; clase: string }> = {
  en_confeccion: {
    texto: 'En confección',
    clase: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  terminado: {
    texto: 'Terminado',
    clase: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  procesado: {
    texto: 'Procesado',
    clase: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
}

export function TransferenciasPage() {
  const [salas, setSalas] = useState<Sala[]>([])
  const [idSala, setIdSala] = useState<number | ''>('')
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [detalle, setDetalle] = useState<Transferencia | null>(null)
  const [vinos, setVinos] = useState<StockSalaVino[]>([])
  const [codVino, setCodVino] = useState<number | ''>('')
  const [cantidad, setCantidad] = useState('1')
  const [errorCarga, setErrorCarga] = useState<ApiError | null>(null)
  const [errorAccion, setErrorAccion] = useState<ApiError | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let active = true

    Promise.all([listarSalas(), listarTransferencias()])
      .then(([datosSalas, datosTransferencias]) => {
        if (!active) {
          return
        }
        setSalas(datosSalas)
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
              : new ApiError(0, 'No se pudieron cargar las transferencias.'),
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
      .catch(() => {
        if (active) {
          setVinos([])
        }
      })

    return () => {
      active = false
    }
  }, [idSala])

  const vinosDisponibles = useMemo(() => (idSala === '' ? [] : vinos), [idSala, vinos])

  async function recargarTransferencias(numero?: number) {
    try {
      const lista = await listarTransferencias()
      setTransferencias(lista)

      if (numero !== undefined) {
        setDetalle(await obtenerTransferencia(numero))
      }
    } catch (err: unknown) {
      setErrorCarga(
        err instanceof ApiError ? err : new ApiError(0, 'No se pudieron recargar los datos.'),
      )
    }
  }

  async function crearNueva(evento: FormEvent) {
    evento.preventDefault()

    if (idSala === '') {
      setErrorAccion(new ApiError(0, 'Elegí la sala de la transferencia.'))
      return
    }

    setOcupado(true)
    setErrorAccion(null)
    setExito(null)

    try {
      const transferencia = await crearTransferencia({
        id_sala: idSala,
        renglones: [],
      })

      setExito(`Transferencia N.${transferencia.numero_solicitud} creada en confección.`)
      await recargarTransferencias(transferencia.numero_solicitud)
    } catch (err: unknown) {
      setErrorAccion(
        err instanceof ApiError ? err : new ApiError(0, 'No se pudo crear la transferencia.'),
      )
    } finally {
      setOcupado(false)
    }
  }

  async function agregarRenglon(evento: FormEvent) {
    evento.preventDefault()

    if (!detalle || codVino === '' || Number(cantidad) <= 0) {
      return
    }

    setOcupado(true)
    setErrorAccion(null)

    try {
      await agregarRenglonTransferencia(detalle.numero_solicitud, codVino, Number(cantidad))
      setCodVino('')
      setCantidad('1')
      await recargarTransferencias(detalle.numero_solicitud)
    } catch (err: unknown) {
      setErrorAccion(
        err instanceof ApiError
          ? err
          : new ApiError(0, 'No se pudo agregar el renglón.'),
      )
    } finally {
      setOcupado(false)
    }
  }

  async function cambiarEstado(accion: 'terminar' | 'procesar') {
    if (!detalle) {
      return
    }

    setOcupado(true)
    setErrorAccion(null)
    setExito(null)

    try {
      if (accion === 'terminar') {
        await terminarTransferencia(detalle.numero_solicitud)
        setExito(`Transferencia N.${detalle.numero_solicitud} terminada.`)
      } else {
        await procesarTransferencia(detalle.numero_solicitud)
        setExito(`Transferencia N.${detalle.numero_solicitud} procesada.`)
      }

      await recargarTransferencias(detalle.numero_solicitud)
    } catch (err: unknown) {
      setErrorAccion(
        err instanceof ApiError ? err : new ApiError(0, 'No se pudo cambiar el estado.'),
      )
    } finally {
      setOcupado(false)
    }
  }

  const puedeCargarRenglones = detalle?.estado === 'en_confeccion'
  const puedeTerminar = detalle?.estado === 'en_confeccion'
  const puedeProcesar = detalle?.estado === 'terminado'

  const estadoDetalle = useMemo(
    () => (detalle ? ETIQUETA_ESTADO[detalle.estado] : null),
    [detalle],
  )

  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex flex-col gap-space-xs">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Transferencias</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Transferencias de vinos del deposito central hacia las salas de venta.
        </p>
      </header>

      {errorCarga && <ErrorBanner detail={errorCarga.detail} sqlstate={errorCarga.sqlstate} />}
      {errorAccion && <ErrorBanner detail={errorAccion.detail} sqlstate={errorAccion.sqlstate} />}
      {exito && <SuccessBanner message={exito} />}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-space-lg items-start">
        <section className="lg:col-span-2 flex flex-col gap-space-md bg-surface-container-lowest border border-[#e2e8f0] rounded-lg p-space-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">Documentos</h2>

          <div className="flex flex-wrap items-end gap-space-sm">
            <label className="flex-1 min-w-[200px] flex flex-col gap-space-xs">
              <span className="font-label-md text-label-md text-on-surface-variant">
                Sala de destino
              </span>
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

            <button
              className="h-9 px-space-md rounded bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-40"
              disabled={ocupado || idSala === ''}
              onClick={crearNueva}
              type="button"
            >
              Nueva transferencia
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0]">
                  <th className="text-left py-space-sm font-label-md text-label-md text-on-surface-variant">
                    N.
                  </th>
                  <th className="text-left py-space-sm font-label-md text-label-md text-on-surface-variant">
                    Sala
                  </th>
                  <th className="text-left py-space-sm font-label-md text-label-md text-on-surface-variant">
                    Estado
                  </th>
                  <th className="text-right py-space-sm font-label-md text-label-md text-on-surface-variant">
                    Botellas
                  </th>
                </tr>
              </thead>
              <tbody>
                {transferencias.length === 0 && (
                  <tr>
                    <td
                      className="py-space-md font-body-md text-body-md text-on-surface-variant"
                      colSpan={4}
                    >
                      Todavia no hay transferencias.
                    </td>
                  </tr>
                )}
                {transferencias.map((transferencia) => (
                  <tr
                    className={`border-b border-[#eef1f4] cursor-pointer hover:bg-surface-container ${
                      detalle?.numero_solicitud === transferencia.numero_solicitud
                        ? 'bg-surface-container-high'
                        : ''
                    }`}
                    key={transferencia.numero_solicitud}
                    onClick={() => {
                      setDetalle(transferencia)
                      setErrorAccion(null)
                    }}
                  >
                    <td className="py-space-sm font-tabular-data text-tabular-data text-on-surface">
                      {transferencia.numero_solicitud}
                    </td>
                    <td className="py-space-sm font-body-md text-body-md text-on-surface">
                      {transferencia.calle_sala} {transferencia.numero_sala}
                      <span className="block font-body-sm text-body-sm text-on-surface-variant">
                        {transferencia.localidad_sala}
                      </span>
                    </td>
                    <td className="py-space-sm">
                      <span
                        className={`inline-block px-space-sm py-0.5 rounded border font-label-sm text-label-sm ${
                          ETIQUETA_ESTADO[transferencia.estado].clase
                        }`}
                      >
                        {ETIQUETA_ESTADO[transferencia.estado].texto}
                      </span>
                    </td>
                    <td className="py-space-sm text-right font-tabular-data text-tabular-data text-on-surface">
                      {transferencia.total_botellas ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-3 flex flex-col gap-space-md bg-surface-container-lowest border border-[#e2e8f0] rounded-lg p-space-md">
          {detalle ? (
            <>
              <div className="flex items-center justify-between gap-space-md">
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Transferencia N.{detalle.numero_solicitud}
                </h2>
                {estadoDetalle && (
                  <span
                    className={`inline-block px-space-sm py-0.5 rounded border font-label-sm text-label-sm ${estadoDetalle.clase}`}
                  >
                    {estadoDetalle.texto}
                  </span>
                )}
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {detalle.calle_sala} {detalle.numero_sala} - {detalle.localidad_sala} - confechada
                el {detalle.fecha_confeccion}
              </p>

              <div className="flex flex-wrap gap-space-sm pt-space-sm border-t border-[#e2e8f0]">
                <button
                  className="h-9 px-space-md rounded border border-[#800e13] text-[#800e13] font-label-md text-label-md hover:bg-[#800e13] hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#800e13]"
                  disabled={!puedeTerminar || ocupado}
                  onClick={() => cambiarEstado('terminar')}
                  type="button"
                >
                  Terminar
                </button>
                <button
                  className="h-9 px-space-md rounded bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-40"
                  disabled={!puedeProcesar || ocupado}
                  onClick={() => cambiarEstado('procesar')}
                  type="button"
                >
                  Procesar
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#e2e8f0]">
                      <th className="text-left py-space-sm font-label-md text-label-md text-on-surface-variant">
                        Vino
                      </th>
                      <th className="text-right py-space-sm font-label-md text-label-md text-on-surface-variant">
                        Cantidad
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detalle.renglones ?? []).length === 0 && (
                      <tr>
                        <td
                          className="py-space-md font-body-md text-body-md text-on-surface-variant"
                          colSpan={2}
                        >
                          La transferencia no tiene renglones.
                        </td>
                      </tr>
                    )}
                    {(detalle.renglones ?? []).map((renglon) => (
                      <tr className="border-b border-[#eef1f4]" key={renglon.cod_vino}>
                        <td className="py-space-sm font-body-md text-body-md text-on-surface">
                          {renglon.nombre}
                        </td>
                        <td className="py-space-sm text-right font-tabular-data text-tabular-data text-on-surface">
                          {renglon.cantidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form
                className="flex flex-wrap items-end gap-space-sm pt-space-sm border-t border-[#e2e8f0]"
                onSubmit={agregarRenglon}
              >
                <label className="flex-1 min-w-[200px] flex flex-col gap-space-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    Agregar vino
                  </span>
                  <select
                    className={INPUT_CLASS}
                    disabled={!puedeCargarRenglones}
                    onChange={(e) => setCodVino(Number(e.target.value))}
                    value={codVino}
                  >
                    <option value="">Seleccione un vino</option>
                    {vinosDisponibles.map((vino) => (
                      <option key={vino.cod_vino} value={vino.cod_vino}>
                        {vino.nombre} - {vino.anada}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="w-24 flex flex-col gap-space-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    Cantidad
                  </span>
                  <input
                    className={INPUT_CLASS}
                    disabled={!puedeCargarRenglones}
                    min={1}
                    onChange={(e) => setCantidad(e.target.value)}
                    type="number"
                    value={cantidad}
                  />
                </label>

                <button
                  className="h-9 px-space-md rounded bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-40"
                  disabled={!puedeCargarRenglones || codVino === '' || ocupado}
                  type="submit"
                >
                  <MaterialIcon name="add" className="text-[18px]" />
                </button>
              </form>

              {!puedeCargarRenglones && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Solo se pueden cargar renglones mientras la transferencia está en confección.
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-space-sm py-space-xl text-center">
              <MaterialIcon name="swap_horiz" className="text-[32px] text-on-surface-variant/40" />
              <p className="font-body-md text-body-md text-on-surface-variant">
                Seleccioná una transferencia para ver su detalle.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
