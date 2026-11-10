import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { obtenerVino } from '../../api/vinos'
import type { VinoDetalle } from '../../api/types'
import { formatoCodigoVino, formatoPorcentaje, formatoTemperatura } from '../../lib/format'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { Modal } from '../../components/ui/Modal'

interface VinoDetailModalProps {
  codVino: number
  onClose: () => void
}

export function VinoDetailModal({ codVino, onClose }: VinoDetailModalProps) {
  const [detalle, setDetalle] = useState<VinoDetalle | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    let active = true

    obtenerVino(codVino)
      .then((vino) => {
        if (active) {
          setDetalle(vino)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof ApiError
              ? err
              : new ApiError(0, 'No se pudo cargar la ficha del vino.'),
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
  }, [codVino])

  return (
    <Modal labelledBy="vino-modal-title" onClose={onClose} open>
      <div className="flex items-start justify-between p-space-lg border-b border-[#e2e8f0]">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface" id="vino-modal-title">
            {detalle
              ? `${detalle.nombre} ${detalle.anada} - ${formatoCodigoVino(detalle.cod_vino)}`
              : 'Ficha del Vino'}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            {detalle
              ? `${detalle.bodega} - CUIT ${detalle.cuit_bodega}`
              : 'Cargando información del vino...'}
          </p>
        </div>
        <button
          aria-label="Cerrar modal"
          className="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-container transition-colors cursor-pointer"
          onClick={onClose}
          type="button"
        >
          <MaterialIcon name="close" className="text-[20px]" />
        </button>
      </div>

      <div className="p-space-lg flex flex-col gap-space-lg overflow-y-auto">
        {cargando && (
          <p className="font-body-md text-body-md text-on-surface-variant">
            Cargando composición, maridajes y stock...
          </p>
        )}

        {error && <ErrorBanner detail={error.detail} sqlstate={error.sqlstate} />}

        {detalle && (
          <>
            <div className="grid grid-cols-3 gap-space-sm">
              <div className="border border-[#e2e8f0] rounded p-space-sm bg-[#f8fafc]">
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Depósito
                </div>
                <div className="font-tabular-data text-tabular-data font-semibold text-on-surface mt-0.5">
                  {detalle.stock_deposito} botellas
                </div>
              </div>
              <div className="border border-[#e2e8f0] rounded p-space-sm bg-[#f8fafc]">
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Salas
                </div>
                <div className="font-tabular-data text-tabular-data font-semibold text-on-surface mt-0.5">
                  {detalle.stock_salas} botellas
                </div>
              </div>
              <div className="border border-[#e2e8f0] rounded p-space-sm bg-[#f8fafc]">
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Total
                </div>
                <div className="font-tabular-data text-tabular-data font-semibold text-on-surface mt-0.5">
                  {detalle.stock_total} botellas
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-space-xs">
                Composición de Cepas
              </h3>
              <div className="border border-[#e2e8f0] rounded overflow-hidden">
                <table className="w-full text-left text-body-sm">
                  <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <tr>
                      <th className="py-1.5 px-space-md font-label-sm text-label-sm text-on-surface-variant" scope="col">
                        Cepa
                      </th>
                      <th className="py-1.5 px-space-md font-label-sm text-label-sm text-on-surface-variant text-right" scope="col">
                        Porcentaje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {detalle.composicion.length === 0 && (
                      <tr>
                        <td className="py-1.5 px-space-md text-on-surface-variant" colSpan={2}>
                          Sin composición registrada.
                        </td>
                      </tr>
                    )}
                    {detalle.composicion.map((cepa) => (
                      <tr key={cepa.id_cepa}>
                        <td className="py-1.5 px-space-md text-on-surface font-medium">
                          {cepa.nombre}
                        </td>
                        <td className="py-1.5 px-space-md text-right font-tabular-data text-tabular-data text-on-surface">
                          {formatoPorcentaje(cepa.porcentaje)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-space-xs">
                Maridajes Recomendados
              </h3>
              <ul className="border border-[#e2e8f0] rounded divide-y divide-[#f1f5f9] bg-[#ffffff]">
                {detalle.maridajes.length === 0 && (
                  <li className="py-2 px-space-md font-body-md text-body-md text-on-surface-variant">
                    Sin maridajes registrados.
                  </li>
                )}
                {detalle.maridajes.map((maridaje) => (
                  <li
                    className="flex items-center justify-between py-2 px-space-md"
                    key={maridaje.id_maridaje}
                  >
                    <span className="font-body-md text-body-md text-on-surface">
                      {maridaje.nombre}
                    </span>
                    <span className="font-tabular-data text-tabular-data text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                      {formatoTemperatura(maridaje.temp_servicio_sugerida_c)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-space-sm p-space-md bg-[#f8fafc] border-t border-[#e2e8f0]">
        <button
          className="px-space-md py-[6px] bg-[#ffffff] border border-[#cbd5e1] hover:bg-[#f1f5f9] font-label-md text-label-md text-on-surface rounded transition-colors cursor-pointer"
          onClick={onClose}
          type="button"
        >
          Cerrar
        </button>
        {detalle && (
          <Link
            className="px-space-md py-[6px] bg-[#800e13] hover:bg-[#ad2831] text-white font-label-md text-label-md rounded transition-colors"
            to={`/vinos/${detalle.cod_vino}/editar`}
          >
            Editar vino
          </Link>
        )}
      </div>
    </Modal>
  )
}
