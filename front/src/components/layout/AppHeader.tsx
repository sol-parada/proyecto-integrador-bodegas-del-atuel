import { NavLink } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'

const enlaceActivo = 'bg-on-primary-fixed text-white border-b-2 border-primary-fixed'
const enlaceInactivo =
  'text-primary-fixed/80 hover:text-white hover:bg-on-primary-fixed/60 transition-colors'

export function AppHeader() {
  return (
    <header className="fixed top-0 left-0 w-full h-14 bg-on-primary-fixed z-50 flex items-center justify-between px-margin lg:px-margin-desktop border-b border-primary-container/60">
      <div className="flex items-center gap-space-xl">
        <div className="flex items-center gap-space-sm">
          <MaterialIcon name="wine_bar" className="text-primary-fixed text-[20px]" />
          <span className="font-headline-md text-headline-md text-white tracking-tight">
            Bodegas del Atuel{' '}
            <span className="hidden sm:inline font-body-sm text-body-sm text-primary-fixed/70 font-normal">
              | Sistema de Gestión Vitivinícola
            </span>
          </span>
        </div>
        <nav className="hidden md:flex items-center h-14">
          <NavLink
            className={({ isActive }) =>
              `h-14 flex items-center px-space-md font-label-md text-label-md ${
                isActive ? enlaceActivo : enlaceInactivo
              }`
            }
            to="/vinos"
          >
            Catálogo de Vinos
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `h-14 flex items-center px-space-md font-label-md text-label-md ${
                isActive ? enlaceActivo : enlaceInactivo
              }`
            }
            to="/ventas"
          >
            Nueva Venta
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `h-14 flex items-center px-space-md font-label-md text-label-md ${
                isActive ? enlaceActivo : enlaceInactivo
              }`
            }
            to="/transferencias"
          >
            Transferencias
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `h-14 flex items-center px-space-md font-label-md text-label-md ${
                isActive ? enlaceActivo : enlaceInactivo
              }`
            }
            to="/tablero"
          >
            Tablero
          </NavLink>
        </nav>
      </div>
      <div className="flex items-center gap-space-md">
        <div className="hidden sm:flex flex-col text-right">
          <span className="font-label-md text-label-md text-white leading-none">
            Dirección Enológica
          </span>
          <span className="font-label-sm text-label-sm text-primary-fixed/70 leading-none mt-space-xs">
            Sede Central - Mendoza
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <MaterialIcon name="person" className="text-on-primary text-[18px]" />
        </div>
      </div>
    </header>
  )
}
