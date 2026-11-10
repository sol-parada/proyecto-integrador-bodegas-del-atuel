interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const puedeAnterior = page > 1
  const puedeSiguiente = page < totalPages

  return (
    <div className="flex items-center justify-between px-space-md py-[10px] bg-[#ffffff] border-t border-[#e2e8f0]">
      <span className="font-tabular-data text-tabular-data text-on-surface-variant">
        Página <span className="font-semibold text-on-surface">{page}</span> de{' '}
        <span className="font-semibold text-on-surface">{totalPages}</span>
      </span>
      <div className="flex items-center gap-space-xs">
        <button
          className={`px-space-md py-1 border rounded font-label-md text-label-md transition-colors ${
            puedeAnterior
              ? 'border-[#cbd5e1] text-on-surface hover:bg-[#f1f5f9] cursor-pointer'
              : 'border-[#e2e8f0] text-on-surface-variant/40 bg-surface-container-low cursor-not-allowed'
          }`}
          disabled={!puedeAnterior}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Anterior
        </button>
        <button
          className={`px-space-md py-1 border rounded font-label-md text-label-md transition-colors ${
            puedeSiguiente
              ? 'border-[#cbd5e1] text-on-surface hover:bg-[#f1f5f9] cursor-pointer'
              : 'border-[#e2e8f0] text-on-surface-variant/40 bg-surface-container-low cursor-not-allowed'
          }`}
          disabled={!puedeSiguiente}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
