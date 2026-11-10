import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { obtenerCatalogosDerivados } from '../../api/catalogos'
import type { CatalogosDerivados } from '../../api/catalogos'
import type { BodegaOpcion, TipoVino, VinoDetalle, VinoInput } from '../../api/types'
import { actualizarVino, crearVino, obtenerVino } from '../../api/vinos'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { CEPAS, MARIDAJES, TIPOS_VINO, VOLUMENES } from '../../data/catalogos'
import { formatoCodigoVino, formatoPorcentaje, formatoTemperatura } from '../../lib/format'

interface FilaComposicion {
  id: string
  porcentaje: string
}

const FILA_VACIA: FilaComposicion = { id: '', porcentaje: '' }
const ANIO_ACTUAL = new Date().getFullYear()

const INPUT_CLASS =
  'w-full h-9 px-space-sm bg-white border border-slate-300 rounded font-body-md text-body-md text-slate-900 focus:outline-none focus:border-[#800e13] focus:ring-1 focus:ring-[#800e13] transition-colors'

const INPUT_NUMERO_CLASS =
  'w-full h-9 px-space-sm bg-white border border-slate-300 rounded font-tabular-data text-tabular-data text-slate-900 focus:outline-none focus:border-[#800e13] focus:ring-1 focus:ring-[#800e13] transition-colors'

export function VinoFormPage() {
  const { codVino } = useParams()
  const navigate = useNavigate()
  const cod = codVino ? Number(codVino) : undefined
  const esEdicion = cod !== undefined && Number.isFinite(cod)

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoVino>('tinto')
  const [anada, setAnada] = useState(String(ANIO_ACTUAL))
  const [volumen, setVolumen] = useState('750')
  const [graduacion, setGraduacion] = useState('14')
  const [precio, setPrecio] = useState('')
  const [cuitBodega, setCuitBodega] = useState('')
  const [composicion, setComposicion] = useState<FilaComposicion[]>([{ ...FILA_VACIA }])
  const [maridajesSeleccionados, setMaridajesSeleccionados] = useState<number[]>([])
  const [catalogos, setCatalogos] = useState<CatalogosDerivados | null>(null)
  const [catalogosCargados, setCatalogosCargados] = useState(false)
  const [detalle, setDetalle] = useState<VinoDetalle | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(Boolean(esEdicion))
  const [errorCarga, setErrorCarga] = useState<ApiError | null>(null)
  const [errorGuardado, setErrorGuardado] = useState<ApiError | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let active = true

    obtenerCatalogosDerivados()
      .then((data) => {
        if (active) {
          setCatalogos(data)
          setCatalogosCargados(true)
        }
      })
      .catch(() => {
        if (active) {
          setCatalogos({ bodegas: [], anadas: [] })
          setCatalogosCargados(true)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!esEdicion || cod === undefined) {
      return
    }

    let active = true

    obtenerVino(cod)
      .then((vino) => {
        if (!active) {
          return
        }
        setDetalle(vino)
        setNombre(vino.nombre)
        setTipo(vino.tipo)
        setAnada(String(vino.anada))
        setVolumen(String(vino.volumen_ml))
        setGraduacion(String(vino.graduacion))
        setPrecio(String(vino.precio))
        setCuitBodega(vino.cuit_bodega)
        setComposicion(
          vino.composicion.length > 0
            ? vino.composicion.map((cepa) => ({
                id: String(cepa.id_cepa),
                porcentaje: String(cepa.porcentaje),
              }))
            : [{ ...FILA_VACIA }],
        )
        setMaridajesSeleccionados(vino.maridajes.map((maridaje) => maridaje.id_maridaje))
      })
      .catch((err: unknown) => {
        if (active) {
          setErrorCarga(
            err instanceof ApiError
              ? err
              : new ApiError(0, 'No se pudo cargar la ficha del vino.'),
          )
        }
      })
      .finally(() => {
        if (active) {
          setCargandoDetalle(false)
        }
      })

    return () => {
      active = false
    }
  }, [cod, esEdicion])

  const sumaPorcentajes =
    Math.round(
      composicion.reduce((total, fila) => total + (Number(fila.porcentaje) || 0), 0) * 100,
    ) / 100
  const sumaValida = Math.abs(sumaPorcentajes - 100) < 0.001
  const diferencia = Math.round((100 - sumaPorcentajes) * 100) / 100
  const progreso = Math.max(0, Math.min(sumaPorcentajes, 100))

  const volumenActual = Number(volumen)
  const opcionesVolumen =
    Number.isFinite(volumenActual) && !VOLUMENES.includes(volumenActual)
      ? [...VOLUMENES, volumenActual].sort((a, b) => a - b)
      : VOLUMENES

  const bodegas: BodegaOpcion[] = catalogos?.bodegas ?? []
  const opcionesBodega =
    cuitBodega && !bodegas.some((bodega) => bodega.cuit === cuitBodega)
      ? [
          {
            cuit: cuitBodega,
            nombre: detalle?.bodega ?? `CUIT ${cuitBodega}`,
          },
          ...bodegas,
        ]
      : bodegas
  const usaSelectBodega = catalogosCargados && opcionesBodega.length > 0

  const actualizarFila = (index: number, campo: keyof FilaComposicion, valor: string) => {
    setComposicion((prev) =>
      prev.map((fila, filaIndex) =>
        filaIndex === index ? { ...fila, [campo]: valor } : fila,
      ),
    )
  }

  const agregarFila = () => {
    setComposicion((prev) => [...prev, { ...FILA_VACIA }])
  }

  const quitarFila = (index: number) => {
    setComposicion((prev) =>
      prev.length > 1 ? prev.filter((_, filaIndex) => filaIndex !== index) : prev,
    )
  }

  const alternarMaridaje = (idMaridaje: number) => {
    setMaridajesSeleccionados((prev) =>
      prev.includes(idMaridaje)
        ? prev.filter((id) => id !== idMaridaje)
        : [...prev, idMaridaje],
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorGuardado(null)

    const filasValidas = composicion.filter(
      (fila) => fila.id !== '' && fila.porcentaje !== '',
    )

    if (filasValidas.length === 0) {
      setErrorGuardado(
        new ApiError(0, 'Agregá al menos una cepa con su porcentaje en la composición.'),
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const payload: VinoInput = {
      nombre: nombre.trim(),
      tipo,
      anada: Number(anada),
      volumen_ml: Number(volumen),
      graduacion: Number(graduacion),
      precio: Number(precio),
      cuit_bodega: cuitBodega,
      composicion: filasValidas.map(
        (fila) => [Number(fila.id), Number(fila.porcentaje)] as [number, number],
      ),
      maridajes: maridajesSeleccionados,
    }

    setGuardando(true)

    try {
      const resultado =
        esEdicion && cod !== undefined
          ? await actualizarVino(cod, payload)
          : await crearVino(payload)

      navigate('/vinos', {
        state: {
          mensaje: esEdicion
            ? 'Vino actualizado correctamente.'
            : 'Vino creado correctamente.',
          abrirVino: resultado.cod_vino,
        },
      })
    } catch (err: unknown) {
      setErrorGuardado(
        err instanceof ApiError ? err : new ApiError(0, 'No se pudo guardar el vino.'),
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setGuardando(false)
    }
  }

  if (esEdicion && cargandoDetalle) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-space-lg">
        <div className="w-full bg-white border border-slate-200 rounded p-space-lg shadow-sm">
          <p className="font-body-md text-body-md text-slate-500">Cargando ficha del vino...</p>
        </div>
      </div>
    )
  }

  if (esEdicion && errorCarga && !detalle) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-space-lg">
        <ErrorBanner
          detail={errorCarga.detail}
          sqlstate={errorCarga.sqlstate}
          title="No se pudo cargar el vino"
        />
        <Link
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 rounded font-label-md text-label-md text-slate-700 hover:bg-slate-50 transition-colors w-fit"
          to="/vinos"
        >
          Volver al catálogo
        </Link>
      </div>
    )
  }

  const tituloError = errorGuardado?.detail.includes('RN-05')
    ? 'Restricción de Enología (RN-05)'
    : 'No se pudo guardar el vino'

  return (
    <div className="flex flex-col w-full">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-y-space-lg">
        <header className="flex flex-col gap-y-space-xs">
          <nav className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            <Link className="hover:text-on-surface transition-colors" to="/vinos">
              Catálogo de Vinos
            </Link>
            <MaterialIcon name="chevron_right" className="text-[14px]" />
            <span className="text-on-surface">
              {esEdicion ? 'Edición de Vino' : 'Alta de Vino'}
            </span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-space-sm pt-space-xs">
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              {esEdicion ? 'Edición de Vino' : 'Alta de Vino'}
            </h1>
            <span className="font-tabular-data text-tabular-data text-on-surface-variant">
              ID Referencia:{' '}
              <span className="font-medium text-on-surface">
                {esEdicion && cod !== undefined
                  ? formatoCodigoVino(cod)
                  : 'Se asigna al guardar'}
              </span>
            </span>
          </div>
        </header>

        {errorCarga && (
          <ErrorBanner
            detail={errorCarga.detail}
            sqlstate={errorCarga.sqlstate}
            title="No se pudo cargar el vino"
          />
        )}

        {errorGuardado && (
          <ErrorBanner
            detail={errorGuardado.detail}
            sqlstate={errorGuardado.sqlstate}
            title={tituloError}
          />
        )}

        <section className="w-full bg-white border border-slate-200 rounded p-space-lg sm:p-space-xl shadow-sm">
          <form className="flex flex-col gap-y-space-xl" onSubmit={handleSubmit}>
            <section className="flex flex-col">
              <div className="pb-space-sm border-b border-slate-200 mb-space-lg">
                <h2 className="font-headline-md text-headline-md text-slate-800 tracking-tight">
                  Datos Generales del Producto
                </h2>
                <p className="font-body-sm text-body-sm text-slate-500 mt-0.5">
                  Parámetros primarios para rotulado, trazabilidad y control de inventario fiscal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-space-lg gap-y-space-md">
                <div className="flex flex-col">
                  <label
                    className="font-label-sm text-label-sm text-slate-700 mb-1 flex items-center justify-between"
                    htmlFor="commercialName"
                  >
                    <span>Nombre comercial</span>
                    <span className="text-primary text-[10px] font-bold uppercase tracking-wider">
                      Requerido
                    </span>
                  </label>
                  <input
                    className={INPUT_CLASS}
                    id="commercialName"
                    onChange={(event) => setNombre(event.target.value)}
                    placeholder="Ej. Malbec Reserva"
                    required
                    type="text"
                    value={nombre}
                  />
                </div>

                <div className="flex flex-col">
                  <label
                    className="font-label-sm text-label-sm text-slate-700 mb-1 flex items-center justify-between"
                    htmlFor="winerySelect"
                  >
                    <span>Bodega elaboradora</span>
                    <span className="text-primary text-[10px] font-bold uppercase tracking-wider">
                      Requerido
                    </span>
                  </label>
                  {!catalogosCargados ? (
                    <select className={INPUT_CLASS} disabled id="winerySelect">
                      <option>Cargando bodegas...</option>
                    </select>
                  ) : usaSelectBodega ? (
                    <select
                      className={INPUT_CLASS}
                      id="winerySelect"
                      onChange={(event) => setCuitBodega(event.target.value)}
                      required
                      value={cuitBodega}
                    >
                      <option value="">Seleccione una bodega</option>
                      {opcionesBodega.map((bodega) => (
                        <option key={bodega.cuit} value={bodega.cuit}>
                          {bodega.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={INPUT_CLASS}
                      id="winerySelect"
                      inputMode="numeric"
                      maxLength={11}
                      onChange={(event) => setCuitBodega(event.target.value)}
                      placeholder="CUIT de 11 dígitos"
                      required
                      type="text"
                      value={cuitBodega}
                    />
                  )}
                  {catalogosCargados && opcionesBodega.length === 0 && (
                    <span className="font-body-sm text-body-sm text-amber-700 mt-1">
                      No se pudieron cargar las bodegas. Ingresá el CUIT manualmente.
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <label
                    className="font-label-sm text-label-sm text-slate-700 mb-1"
                    htmlFor="wineType"
                  >
                    Tipo de vino
                  </label>
                  <select
                    className={INPUT_CLASS}
                    id="wineType"
                    onChange={(event) => setTipo(event.target.value as TipoVino)}
                    value={tipo}
                  >
                    {TIPOS_VINO.map((tipoVino) => (
                      <option key={tipoVino.value} value={tipoVino.value}>
                        {tipoVino.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label
                    className="font-label-sm text-label-sm text-slate-700 mb-1 flex items-center justify-between"
                    htmlFor="vintageYear"
                  >
                    <span>Añada (Cosecha)</span>
                    <span className="text-slate-400 font-tabular-data text-[11px]">Año fiscal</span>
                  </label>
                  <input
                    className={INPUT_NUMERO_CLASS}
                    id="vintageYear"
                    max="2100"
                    min="1900"
                    onChange={(event) => setAnada(event.target.value)}
                    required
                    type="number"
                    value={anada}
                  />
                </div>

                <div className="flex flex-col">
                  <label
                    className="font-label-sm text-label-sm text-slate-700 mb-1"
                    htmlFor="packaging"
                  >
                    Presentación estándar
                  </label>
                  <select
                    className={INPUT_CLASS}
                    id="packaging"
                    onChange={(event) => setVolumen(event.target.value)}
                    value={volumen}
                  >
                    {opcionesVolumen.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion} ml
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="font-label-sm text-label-sm text-slate-700 mb-1" htmlFor="abv">
                    Graduación alcohólica (% v/v)
                  </label>
                  <div className="relative">
                    <input
                      className={`${INPUT_NUMERO_CLASS} pr-7`}
                      id="abv"
                      max="20.0"
                      min="5.0"
                      onChange={(event) => setGraduacion(event.target.value)}
                      step="0.1"
                      type="number"
                      value={graduacion}
                    />
                    <span className="absolute right-2.5 top-2 font-tabular-data text-body-sm text-slate-400 select-none">
                      %
                    </span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label
                    className="font-label-sm text-label-sm text-slate-700 mb-1"
                    htmlFor="unitPrice"
                  >
                    Precio unitario oficial
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 font-tabular-data text-body-sm text-slate-400 select-none">
                      $
                    </span>
                    <input
                      className={`${INPUT_NUMERO_CLASS} pl-7`}
                      id="unitPrice"
                      min="0.01"
                      onChange={(event) => setPrecio(event.target.value)}
                      required
                      step="0.01"
                      type="number"
                      value={precio}
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <label
                    className="font-label-sm text-label-sm text-slate-700 mb-1"
                    htmlFor="internalCode"
                  >
                    Código interno
                  </label>
                  <input
                    className="w-full h-9 px-space-sm bg-slate-50 border border-slate-300 rounded font-tabular-data text-tabular-data text-slate-600 focus:outline-none"
                    disabled
                    id="internalCode"
                    type="text"
                    value={
                      esEdicion && cod !== undefined
                        ? formatoCodigoVino(cod)
                        : 'Se asigna al guardar'
                    }
                  />
                </div>
              </div>
            </section>

            <section className="flex flex-col">
              <div className="pb-space-sm border-b border-slate-200 mb-space-md">
                <h2 className="font-headline-md text-headline-md text-slate-800 tracking-tight">
                  Composición de Cepas (Corte / Assemblage)
                </h2>
                <p className="font-body-sm text-body-sm text-slate-500 mt-0.5">
                  Defina el porcentaje de cada variedad que compone el corte enológico.
                </p>
              </div>

              <div className="w-full border border-slate-200 rounded overflow-hidden">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th
                        className="py-2.5 px-space-md font-label-sm text-label-sm text-slate-600 font-semibold"
                        scope="col"
                      >
                        Cepa
                      </th>
                      <th
                        className="py-2.5 px-space-md font-label-sm text-label-sm text-slate-600 font-semibold w-40 text-right"
                        scope="col"
                      >
                        Porcentaje (%)
                      </th>
                      <th
                        className="py-2.5 px-space-md font-label-sm text-label-sm text-slate-600 font-semibold w-20 text-center"
                        scope="col"
                      >
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-body-md text-body-md">
                    {composicion.map((fila, index) => (
                      <tr className="hover:bg-slate-50/70 transition-colors" key={index}>
                        <td className="py-2 px-space-md">
                          <select
                            className="w-full h-8 px-2 bg-white border border-slate-300 rounded font-body-md text-body-md text-slate-800 focus:outline-none focus:border-[#800e13]"
                            onChange={(event) =>
                              actualizarFila(index, 'id', event.target.value)
                            }
                            value={fila.id}
                          >
                            <option value="">Seleccione una cepa</option>
                            {CEPAS.map((cepa) => (
                              <option key={cepa.id_cepa} value={cepa.id_cepa}>
                                {cepa.nombre}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-space-md text-right">
                          <div className="relative inline-block w-28">
                            <input
                              className="w-full h-8 pl-2 pr-6 text-right font-tabular-data text-tabular-data font-semibold text-slate-900 border border-slate-300 rounded focus:outline-none focus:border-[#800e13]"
                              max="100"
                              min="0"
                              onChange={(event) =>
                                actualizarFila(index, 'porcentaje', event.target.value)
                              }
                              step="0.01"
                              type="number"
                              value={fila.porcentaje}
                            />
                            <span className="absolute right-2 top-1.5 font-tabular-data text-body-sm text-slate-400 select-none">
                              %
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-space-md text-center">
                          <button
                            className="p-1 rounded text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={composicion.length === 1}
                            onClick={() => quitarFila(index)}
                            title="Eliminar variedad"
                            type="button"
                          >
                            <MaterialIcon name="delete" className="text-[18px]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-space-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded font-label-md text-label-md text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                  onClick={agregarFila}
                  type="button"
                >
                  <MaterialIcon name="add" className="text-[16px] text-slate-500" />
                  <span>Agregar Cepa</span>
                </button>

                <div
                  className={`w-full sm:w-auto flex flex-col items-start sm:items-end gap-1 px-space-md py-2 rounded ${
                    sumaValida
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'bg-red-50/60 border border-red-200/80'
                  }`}
                >
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <MaterialIcon
                      name={sumaValida ? 'check_circle' : 'warning'}
                      className={`text-[16px] ${sumaValida ? 'text-emerald-700' : 'text-red-700'}`}
                    />
                    <span
                      className={`font-body-md text-body-md font-semibold ${
                        sumaValida ? 'text-emerald-800' : 'text-red-800'
                      }`}
                    >
                      Suma total de corte:{' '}
                      <span className="font-tabular-data">
                        {formatoPorcentaje(sumaPorcentajes)}
                      </span>
                    </span>
                    <span
                      className={`font-body-sm text-body-sm ${
                        sumaValida ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {sumaValida
                        ? '(Balance balanceado 100%)'
                        : `(${
                            diferencia > 0
                              ? `Déficit: -${formatoPorcentaje(diferencia)}`
                              : `Exceso: +${formatoPorcentaje(Math.abs(diferencia))}`
                          } - Debe ser exactamente 100%)`}
                    </span>
                  </div>
                  <div className="w-full sm:w-64 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-0.5">
                    <div
                      className={`h-full transition-all duration-300 ${
                        sumaValida ? 'bg-emerald-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="flex flex-col">
              <div className="pb-space-sm border-b border-slate-200 mb-space-md">
                <h2 className="font-headline-md text-headline-md text-slate-800 tracking-tight">
                  Maridajes Recomendados
                </h2>
                <p className="font-body-sm text-body-sm text-slate-500 mt-0.5">
                  Seleccione las preparaciones sugeridas para acompañar este vino.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                {MARIDAJES.map((maridaje) => (
                  <label
                    className="flex items-center justify-between gap-space-sm border border-slate-200 rounded px-space-md py-2 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                    key={maridaje.id_maridaje}
                  >
                    <span className="flex items-center gap-space-sm">
                      <input
                        checked={maridajesSeleccionados.includes(maridaje.id_maridaje)}
                        className="h-4 w-4 rounded border-slate-300 accent-[#800e13]"
                        onChange={() => alternarMaridaje(maridaje.id_maridaje)}
                        type="checkbox"
                      />
                      <span className="font-body-md text-body-md text-slate-800">
                        {maridaje.nombre}
                      </span>
                    </span>
                    <span className="font-tabular-data text-tabular-data text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {formatoTemperatura(maridaje.temp_servicio_sugerida_c)}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <footer className="pt-space-md border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-space-md">
              <div className="flex items-center gap-space-xs text-slate-500 font-label-sm text-label-sm">
                <MaterialIcon name="info" className="text-[15px]" />
                <span>La validación final la realiza la base de datos al guardar.</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  className="w-full sm:w-auto px-5 py-2 bg-white border border-slate-300 text-slate-700 rounded font-label-md text-label-md hover:bg-slate-50 transition-colors text-center"
                  onClick={() => navigate('/vinos')}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="w-full sm:w-auto px-6 py-2 bg-[#800e13] hover:bg-[#ad2831] text-white rounded font-label-md text-label-md shadow-sm transition-colors flex items-center justify-center gap-space-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={guardando}
                  type="submit"
                >
                  <MaterialIcon name="save" className="text-[16px]" />
                  <span>{guardando ? 'Guardando...' : 'Guardar Vino'}</span>
                </button>
              </div>
            </footer>
          </form>
        </section>
      </div>
    </div>
  )
}
