import type { TipoVino } from '../../api/types'

const ESTILOS: Record<TipoVino, string> = {
  tinto:
    'bg-primary-fixed/40 text-primary border border-primary-fixed dark:bg-primary-container dark:text-on-primary-container',
  blanco:
    'bg-surface-container text-on-surface-variant border border-field-border',
  rosado:
    'bg-secondary-fixed/60 text-secondary border border-secondary-fixed dark:bg-secondary-container dark:text-on-secondary-container',
  espumante:
    'bg-tertiary-fixed/50 text-tertiary border border-tertiary-fixed-dim dark:bg-tertiary-container dark:text-on-tertiary-container',
}

const ETIQUETAS: Record<TipoVino, string> = {
  tinto: 'Tinto',
  blanco: 'Blanco',
  rosado: 'Rosado',
  espumante: 'Espumante',
}

export function TipoVinoBadge({ tipo }: { tipo: TipoVino }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${ESTILOS[tipo]}`}
    >
      {ETIQUETAS[tipo]}
    </span>
  )
}
