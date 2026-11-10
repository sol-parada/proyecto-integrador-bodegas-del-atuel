import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { agregarRenglonTransferencia } from '../../api/transferencias'
import type { StockDepositoVino, Transferencia } from '../../api/types'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { Modal } from '../../components/ui/Modal'

interface RenglonTransferenciaModalProps {
  open: boolean
  onClose: () => void
  transferencia: Transferencia | null
  stock: StockDepositoVino[]
  onCargado: () => void | Promise<void>
}

const CAMPO_CLASS =
  'w-full h-9 bg-field border border-field-border rounded-lg px-2.5 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors'

export function RenglonTransferenciaModal({
  open,
  onClose,
  transferencia,
  stock,
  onCargado,
}: RenglonTransferenciaModalProps) {
  return (
    <Modal labelledBy="titulo-renglon-transferencia" onClose={onClose} open={open}>
      <ContenidoModal
        onCargado={onCargado}
        onClose={onClose}
        stock={stock}
        transferencia={transferencia}
      />
    </Modal>
  )
}

interface ContenidoModalProps {
  onClose: () => void
  transferencia: Transferencia | null
  stock: StockDepositoVino[]
  onCargado: () => void | Promise<void>
}

function ContenidoModal({
  onClose,
  transferencia,
  stock,
  onCargado,
}: ContenidoModalProps) {
  const [codVino, setCodVino] = useState<number | ''>('')
  const [cantidad, setCantidad] = useState('1')
  const [error, setError] = useState<ApiError | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()

    if (!transferencia || codVino === '' || Number(cantidad) <= 0) {
      return
    }

    setGuardando(true)
    setError(null)

    try {
      await agregarRenglonTransferencia(
        transferencia.numero_solicitud,
        codVino,
        Number(cantidad),
      )

      await onCargado()
      onClose()
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err
          : new ApiError(0, 'No se pudo agregar el renglón.'),
      )
    } finally {
      setGuardando(false)
    }
  }

  const vino = stock.find((item) => item.cod_vino === codVino)

  return (
    <Modal labelledBy="titulo-renglon-transferencia" onClose={onClose} open>
      <div className="flex items-center gap-space-md px-space-lg py-space-md bg-surface-container-low border-b border-outline-variant">
        <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
          <MaterialIcon name="playlist_add" className="text-[18px]" />
        </div>
        <div>
          <h2
            className="font-headline-md text-headline-md text-on-surface"
            id="titulo-renglon-transferencia"
          >
            Agregar vino al renglón
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Transferencia N.{transferencia?.numero_solicitud}
          </p>
        </div>
      </div>

      <form className="flex flex-col gap-space-md p-space-lg" onSubmit={enviar}>
        {error && <ErrorBanner detail={error.detail} sqlstate={error.sqlstate} />}

        <label className="flex flex-col gap-space-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
            Vino
          </span>
          <select
            className={CAMPO_CLASS}
            onChange={(e) => setCodVino(Number(e.target.value))}
            value={codVino}
          >
            <option value="">Seleccione un vino</option>
            {stock.map((item) => (
              <option key={item.cod_vino} value={item.cod_vino}>
                {item.nombre} - {item.anada} - {item.stock_deposito} en depósito
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-space-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
            Cantidad
          </span>
          <input
            className={CAMPO_CLASS}
            max={vino?.stock_deposito}
            min={1}
            onChange={(e) => setCantidad(e.target.value)}
            type="number"
            value={cantidad}
          />
          {vino && (
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Disponible en el depósito: {vino.stock_deposito} botellas.
            </span>
          )}
        </label>

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          El stock se descuenta del depósito cuando la transferencia se procesa, no al cargarla.
        </p>

        <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-outline-variant">
          <button
            className="px-4 py-2 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container rounded-lg font-label-md text-label-md text-on-surface transition-colors"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex items-center gap-space-xs px-4 py-2 bg-primary-container hover:bg-primary hover:text-on-primary text-on-primary-container rounded-lg font-label-md text-label-md tracking-wide transition-colors shadow-sm disabled:opacity-40"
            disabled={guardando || codVino === ''}
            type="submit"
          >
            <MaterialIcon name="add" className="text-[18px]" />
            <span>{guardando ? 'Agregando...' : 'Agregar renglón'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
