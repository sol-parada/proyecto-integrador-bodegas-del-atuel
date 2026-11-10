import { apiRequest } from './client'
import type { StockDepositoVino } from './types'

export function listarStockDeposito(): Promise<StockDepositoVino[]> {
  return apiRequest<StockDepositoVino[]>('/deposito/stock')
}
