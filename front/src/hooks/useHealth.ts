import { useEffect, useState } from 'react'
import { obtenerSalud } from '../api/health'

export type HealthState = 'cargando' | 'ok' | 'error'

export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>('cargando')

  useEffect(() => {
    let active = true

    const check = () => {
      obtenerSalud()
        .then(() => {
          if (active) {
            setState('ok')
          }
        })
        .catch(() => {
          if (active) {
            setState('error')
          }
        })
    }

    check()
    const intervalId = window.setInterval(check, 30000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [])

  return state
}
