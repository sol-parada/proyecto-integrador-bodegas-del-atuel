import { MaterialIcon } from './MaterialIcon'

export function SuccessBanner({ message }: { message: string }) {
  return (
    <section
      aria-live="polite"
      className="w-full rounded bg-emerald-50 border border-emerald-300 p-space-md shadow-sm"
      role="status"
    >
      <div className="flex items-center gap-space-md">
        <MaterialIcon name="check_circle" className="text-emerald-700 text-[20px]" />
        <div className="flex flex-col gap-0.5">
          <span className="font-label-md text-label-md text-emerald-900">Operación completada</span>
          <p className="font-body-md text-body-md text-emerald-800">{message}</p>
        </div>
      </div>
    </section>
  )
}
