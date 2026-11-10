import type { TipoVino } from '../../api/types'

const ESTILOS: Record<TipoVino, string> = {
  tinto: 'bg-[#ffdad6]/40 text-[#5b0006] border border-[#ffdad6]',
  blanco: 'bg-surface-container text-on-surface-variant border border-[#cbd5e1]',
  rosado: 'bg-[#ffdad6]/30 text-[#805344] border border-[#ffdad6]',
  espumante: 'bg-[#d3e4ff]/50 text-[#002a4e] border border-[#a2c9ff]',
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
