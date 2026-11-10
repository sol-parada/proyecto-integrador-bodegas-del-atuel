export function formatoCodigoVino(codVino: number): string {
  return `VIN-${String(codVino).padStart(3, '0')}`
}

export function formatoPrecio(precio: number | string): string {
  const value = Number(precio)
  if (Number.isNaN(value)) {
    return '-'
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatoGraduacion(graduacion: number | string): string {
  const value = Number(graduacion)
  return Number.isNaN(value) ? '-' : `${value.toFixed(1)}°`
}

export function formatoVolumen(volumen: number): string {
  return `${volumen} ml`
}

export function formatoPorcentaje(porcentaje: number | string): string {
  const value = Number(porcentaje)
  if (Number.isNaN(value)) {
    return '-'
  }
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)}%`
}

export function formatoTemperatura(temperatura: number | string): string {
  const value = Number(temperatura)
  if (Number.isNaN(value)) {
    return '-'
  }
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value)}°C`
}
