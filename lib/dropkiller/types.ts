export interface Product {
  id: string
  externalId: string
  name: string
  image: string
  price: number
  stock: number
  sales7d: number
  sales30d: number
  revenue7d: number
  revenue30d: number
  platform: string
  country: string
  url: string
  createdAt?: string
  dailySales?: number[]
}

export interface ProductFilters {
  platform?: string
  country?: string
  minSales7d?: number
  maxSales7d?: number
  minSales30d?: number
  maxSales30d?: number
  minStock?: number
  maxStock?: number
  minPrice?: number
  maxPrice?: number
  minRevenue7d?: number
  maxRevenue7d?: number
  minRevenue30d?: number
  maxRevenue30d?: number
  dateRange?: { from: string; to: string }
  page?: number
  limit?: number
}

export interface SearchResponse {
  products: Product[]
  total: number
  page: number
  hasMore: boolean
}
