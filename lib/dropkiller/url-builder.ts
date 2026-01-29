import { ProductFilters } from './types'
import { PRODUCT_API_BASE_URL } from './constants'

export function buildDropKillerUrl(filters: ProductFilters): string {
  const params = new URLSearchParams()
  
  if (filters.platform) params.set('platform', filters.platform)
  if (filters.country) params.set('country', filters.country)
  if (filters.limit) params.set('limit', filters.limit.toString())
  if (filters.page) params.set('page', filters.page.toString())
  
  // Ventas 7 días
  if (filters.minSales7d) params.set('s7min', filters.minSales7d.toString())
  if (filters.maxSales7d) params.set('s7max', filters.maxSales7d.toString())
  
  // Ventas 30 días
  if (filters.minSales30d) params.set('s30min', filters.minSales30d.toString())
  if (filters.maxSales30d) params.set('s30max', filters.maxSales30d.toString())
  
  // Facturación 7 días
  if (filters.minRevenue7d) params.set('f7min', filters.minRevenue7d.toString())
  if (filters.maxRevenue7d) params.set('f7max', filters.maxRevenue7d.toString())
  
  // Facturación 30 días
  if (filters.minRevenue30d) params.set('f30min', filters.minRevenue30d.toString())
  if (filters.maxRevenue30d) params.set('f30max', filters.maxRevenue30d.toString())
  
  // Stock
  if (filters.minStock) params.set('stock-min', filters.minStock.toString())
  if (filters.maxStock) params.set('stock-max', filters.maxStock.toString())
  
  // Precio
  if (filters.minPrice) params.set('price-min', filters.minPrice.toString())
  if (filters.maxPrice) params.set('price-max', filters.maxPrice.toString())
  
  // Rango de fechas
  if (filters.dateRange?.from && filters.dateRange?.to) {
    params.set('creation-date', `${filters.dateRange.from}/${filters.dateRange.to}`)
  }
  
  return `${PRODUCT_API_BASE_URL}/dashboard/products?${params.toString()}`
}
