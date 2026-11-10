import { NavLink } from 'react-router-dom'
import { useHealth } from '../../hooks/useHealth'
import type { HealthState } from '../../hooks/useHealth'
import { MaterialIcon } from '../ui/MaterialIcon'

interface ItemMenu {
  label: string
  icon: string
  to?: string
}

const ITEMS: ItemMenu[] = [
  { label: 'Listado de Varietales', icon: 'view_list', to: '/vinos' },
  { label: 'Nueva Venta', icon: 'point_of_sale', to: '/ventas' },
  { label: 'Transferencias', icon: 'swap_horiz', to: '/transferencias' },
  { label: 'Tablero', icon: 'dashboard', to: '/tablero' },
]

const ESTADO_SALUD: Record<HealthState, { color: string; texto: string; detalle: string }> = {
  ok: { color: 'bg-emerald-600', texto: 'En línea', detalle: 'API conectada' },
  error: { color: 'bg-red-600', texto: 'Sin conexión', detalle: 'API no disponible' },
  cargando: { color: 'bg-amber-500', texto: 'Verificando...', detalle: 'Consultando /salud' },
}

export function Sidebar() {
  const health = useHealth()
  const estado = ESTADO_SALUD[health]

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 bg-surface-container-low border-r border-outline-variant z-40 hidden lg:flex flex-col justify-between py-space-md">
      <div className="flex flex-col gap-space-xs px-space-sm">
        <div className="px-space-md py-space-xs font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
          Operaciones Rápidas
        </div>
        <nav className="flex flex-col gap-0.5">
          {ITEMS.map((item) =>
            item.to ? (
              <NavLink
                className={({ isActive }) =>
                  `flex items-center gap-space-md px-space-md py-space-sm rounded-lg font-label-md text-label-md transition-colors ${
                    isActive
                      ? 'bg-surface-container-highest text-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`
                }
                key={item.label}
                to={item.to}
              >
                <MaterialIcon name={item.icon} className="text-[18px]" />
                {item.label}
              </NavLink>
            ) : (
              <span
                className="flex items-center gap-space-md px-space-md py-space-sm rounded-lg font-label-md text-label-md text-on-surface-variant/40 cursor-not-allowed"
                key={item.label}
                title="Próximamente"
              >
                <MaterialIcon name={item.icon} className="text-[18px]" />
                {item.label}
              </span>
            ),
          )}
        </nav>
      </div>
      <div className="px-space-md pt-space-sm border-t border-outline-variant">
        <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
          <span>ESTADO API</span>
          <span className={`inline-block w-2 h-2 rounded-full ${estado.color}`} />
        </div>
        <div className="mt-space-xs font-tabular-data text-tabular-data text-on-surface-variant">
          {estado.detalle}
        </div>
      </div>
    </aside>
  )
}
