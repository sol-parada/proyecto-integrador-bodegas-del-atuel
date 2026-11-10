import { MaterialIcon } from './MaterialIcon'

interface ErrorBannerProps {
  detail: string
  sqlstate?: string
  title?: string
}

export function ErrorBanner({ detail, sqlstate, title = 'Error de la base de datos' }: ErrorBannerProps) {
  return (
    <section
      aria-live="assertive"
      className="w-full rounded bg-red-50 border border-red-300 p-space-md shadow-sm"
      role="alert"
    >
      <div className="flex items-start gap-space-md">
        <div className="flex-shrink-0 pt-0.5">
          <MaterialIcon name="error" className="text-red-700 text-[20px]" />
        </div>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-200 text-red-900 border border-red-300">
                Error de validación
              </span>
              <span className="font-label-md text-label-md text-red-900">{title}</span>
            </div>
            <p className="font-body-md text-body-md text-red-800 whitespace-pre-wrap">{detail}</p>
          </div>
          {sqlstate && (
            <span className="font-tabular-data text-tabular-data font-semibold text-red-800 whitespace-nowrap self-start sm:self-center bg-red-100/80 px-space-sm py-0.5 rounded border border-red-200">
              SQLSTATE {sqlstate}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
