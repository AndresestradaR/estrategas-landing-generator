'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Loader2,
  ExternalLink,
  Calendar,
  BarChart3,
  Boxes,
  Store,
  Tag,
  MapPin
} from 'lucide-react'

const API_URL = 'https://product-intelligence-dropi-production.up.railway.app'

interface HistorialItem {
  uuid: string
  date: string
  soldUnits: number
  stock: number
  salePrice: number
  salesAmount: number
  country: string
  platform: string
}

interface Product {
  id: string
  externalId: string
  name: string
  description: string
  salePrice: number
  suggestedPrice: number
  totalSoldUnits: number
  soldUnitsLast30Days: number
  soldUnitsLast7Days: number
  billingLast30Days: number
  stock: number
  status: string
  baseCategory: { id: string; name: string } | null
  provider: { id: string; name: string } | null
  multimedia: Array<{ url: string; type: string }> | null
  historial: HistorialItem[]
  createdAt: string
  updatedAt: string
}

type DateFilter = '7d' | '15d' | '30d' | '60d' | '90d'

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: '7d', label: '7 días' },
  { value: '15d', label: '15 días' },
  { value: '30d', label: '30 días' },
  { value: '60d', label: '60 días' },
  { value: '90d', label: '90 días' },
]

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('30d')
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  useEffect(() => {
    if (productId) {
      loadProduct()
    }
  }, [productId])

  const loadProduct = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/productos/${productId}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setProduct(data)
      }
    } catch (err) {
      console.error('Error loading product:', err)
      setError('Error al cargar el producto')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredHistorial = useMemo(() => {
    if (!product?.historial) return []

    const daysMap: Record<DateFilter, number> = {
      '7d': 7,
      '15d': 15,
      '30d': 30,
      '60d': 60,
      '90d': 90
    }
    const days = daysMap[dateFilter]
    const now = new Date()
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    return product.historial
      .filter(h => new Date(h.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [product?.historial, dateFilter])

  const chartData = useMemo(() => {
    const data = filteredHistorial.map(h => ({
      date: new Date(h.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      fullDate: h.date,
      ventas: h.soldUnits,
      stock: h.stock,
      facturacion: h.salesAmount
    }))

    const maxVentas = Math.max(...data.map(d => d.ventas), 1)
    return data.map(d => ({ ...d, percentage: (d.ventas / maxVentas) * 100 }))
  }, [filteredHistorial])

  const periodStats = useMemo(() => {
    if (!filteredHistorial.length) return { total: 0, promedio: 0, facturacion: 0 }

    const total = filteredHistorial.reduce((sum, h) => sum + h.soldUnits, 0)
    const facturacion = filteredHistorial.reduce((sum, h) => sum + h.salesAmount, 0)
    const promedio = Math.round(total / filteredHistorial.length)

    return { total, promedio, facturacion }
  }, [filteredHistorial])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-CO').format(value)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver
        </button>
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <Package className="w-12 h-12 text-text-secondary/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {error || 'Producto no encontrado'}
          </h3>
          <p className="text-text-secondary">
            El producto que buscas no existe o no está disponible
          </p>
        </div>
      </div>
    )
  }

  const imageUrl = product.multimedia?.[0]?.url
  const ganancia = product.suggestedPrice - product.salePrice

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver al catálogo
      </button>

      {/* Product Header */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          {/* Image */}
          <div className="aspect-square bg-background rounded-xl overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-16 h-16 text-text-secondary/30" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="md:col-span-2 space-y-4">
            {/* Status & Category */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                product.status === 'ACTIVE'
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {product.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
              </span>
              {product.baseCategory?.name && (
                <span className="px-2 py-1 bg-accent/10 text-accent rounded text-xs font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {product.baseCategory.name}
                </span>
              )}
              <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Colombia
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-text-primary">
              {product.name}
            </h1>

            {/* IDs */}
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span>ID: {product.externalId}</span>
              {product.provider?.name && (
                <span className="flex items-center gap-1">
                  <Store className="w-4 h-4" />
                  {product.provider.name}
                </span>
              )}
            </div>

            {/* Prices */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-sm text-text-secondary mb-1">Precio de venta</p>
                <p className="text-2xl font-bold text-accent">
                  {formatCurrency(product.salePrice)}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">Precio sugerido</p>
                <p className="text-2xl font-bold text-text-primary">
                  {formatCurrency(product.suggestedPrice)}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-1">Ganancia estimada</p>
                <p className="text-2xl font-bold text-green-500">
                  {formatCurrency(ganancia)}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 pt-4">
              <div className="bg-background rounded-lg p-3">
                <div className="flex items-center gap-2 text-text-secondary mb-1">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="text-xs">Ventas 30d</span>
                </div>
                <p className="text-lg font-bold text-text-primary">
                  {formatNumber(product.soldUnitsLast30Days)}
                </p>
              </div>
              <div className="bg-background rounded-lg p-3">
                <div className="flex items-center gap-2 text-text-secondary mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs">Ventas 7d</span>
                </div>
                <p className="text-lg font-bold text-text-primary">
                  {formatNumber(product.soldUnitsLast7Days)}
                </p>
              </div>
              <div className="bg-background rounded-lg p-3">
                <div className="flex items-center gap-2 text-text-secondary mb-1">
                  <Boxes className="w-4 h-4" />
                  <span className="text-xs">Stock</span>
                </div>
                <p className="text-lg font-bold text-text-primary">
                  {formatNumber(product.stock)}
                </p>
              </div>
              <div className="bg-background rounded-lg p-3">
                <div className="flex items-center gap-2 text-text-secondary mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs">Facturación 30d</span>
                </div>
                <p className="text-lg font-bold text-green-500">
                  {formatCurrency(product.billingLast30Days)}
                </p>
              </div>
            </div>

            {/* Dropi Link */}
            <a
              href={`https://app.dropi.co/catalogo/${product.externalId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-background font-medium rounded-lg transition-colors"
            >
              Ver en Dropi
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">Historial de Ventas</h2>
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {DATE_FILTERS.map(filter => (
              <button
                key={filter.value}
                onClick={() => setDateFilter(filter.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === filter.value
                    ? 'bg-accent text-background'
                    : 'bg-background text-text-secondary hover:text-text-primary'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-background rounded-lg p-4">
            <p className="text-sm text-text-secondary mb-1">Total ventas en período</p>
            <p className="text-2xl font-bold text-accent">
              {formatNumber(periodStats.total)}
            </p>
          </div>
          <div className="bg-background rounded-lg p-4">
            <p className="text-sm text-text-secondary mb-1">Promedio diario</p>
            <p className="text-2xl font-bold text-text-primary">
              {formatNumber(periodStats.promedio)}
            </p>
          </div>
          <div className="bg-background rounded-lg p-4">
            <p className="text-sm text-text-secondary mb-1">Facturación en período</p>
            <p className="text-2xl font-bold text-green-500">
              {formatCurrency(periodStats.facturacion)}
            </p>
          </div>
        </div>

        {/* Chart - Simple Bar Chart with CSS */}
        {chartData.length > 0 ? (
          <div className="relative">
            {/* Tooltip */}
            {hoveredBar !== null && chartData[hoveredBar] && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm z-10 pointer-events-none">
                <p className="text-white font-medium">{chartData[hoveredBar].date}</p>
                <p className="text-green-400">Ventas: {formatNumber(chartData[hoveredBar].ventas)}</p>
                <p className="text-gray-400">Facturación: {formatCurrency(chartData[hoveredBar].facturacion)}</p>
              </div>
            )}

            {/* Bar Chart */}
            <div className="h-[250px] flex items-end gap-1 pt-8">
              {chartData.map((item, index) => (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                  onMouseEnter={() => setHoveredBar(index)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t transition-all duration-200 ${
                      hoveredBar === index ? 'bg-green-400' : 'bg-green-500/70'
                    }`}
                    style={{ height: `${Math.max(item.percentage, 2)}%` }}
                  />
                  {/* Label - show every nth label based on data length */}
                  {(chartData.length <= 15 || index % Math.ceil(chartData.length / 10) === 0) && (
                    <span className="text-[10px] text-text-secondary mt-2 rotate-[-45deg] origin-top-left whitespace-nowrap">
                      {item.date}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-8 bottom-8 flex flex-col justify-between text-xs text-text-secondary pointer-events-none">
              <span>{formatNumber(Math.max(...chartData.map(d => d.ventas)))}</span>
              <span>{formatNumber(Math.round(Math.max(...chartData.map(d => d.ventas)) / 2))}</span>
              <span>0</span>
            </div>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
              <p className="text-text-secondary">No hay datos de historial para este período</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-text-secondary/70 py-4">
        <p>Datos actualizados de Dropi Colombia</p>
      </div>
    </div>
  )
}
