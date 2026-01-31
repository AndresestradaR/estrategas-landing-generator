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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'

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

const DATE_FILTERS: { value: DateFilter; label: string; days: number }[] = [
  { value: '7d', label: '7 días', days: 7 },
  { value: '15d', label: '15 días', days: 15 },
  { value: '30d', label: '30 días', days: 30 },
  { value: '60d', label: '60 días', days: 60 },
  { value: '90d', label: '90 días', days: 90 },
]

// Función para llenar días faltantes con 0
const fillMissingDays = (historial: HistorialItem[], days: number) => {
  const result: { date: string; soldUnits: number; salesAmount: number }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Crear mapa de datos existentes por fecha
  const dataMap = new Map<string, HistorialItem>()
  historial.forEach(h => {
    dataMap.set(h.date.split('T')[0], h)
  })

  // Llenar todos los días desde hace X días hasta hoy
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const existing = dataMap.get(dateStr)
    if (existing) {
      result.push({
        date: dateStr,
        soldUnits: existing.soldUnits,
        salesAmount: existing.salesAmount
      })
    } else {
      result.push({
        date: dateStr,
        soldUnits: 0,
        salesAmount: 0
      })
    }
  }

  return result
}

// Formatear fecha para el eje X
const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

// Formatear fecha para el tooltip
const formatDateFull = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('30d')

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

  const selectedFilter = DATE_FILTERS.find(f => f.value === dateFilter) || DATE_FILTERS[2]

  const chartData = useMemo(() => {
    if (!product?.historial) return []
    return fillMissingDays(product.historial, selectedFilter.days)
  }, [product?.historial, selectedFilter.days])

  const periodStats = useMemo(() => {
    if (!chartData.length) return { total: 0, promedio: 0, facturacion: 0 }

    const total = chartData.reduce((sum, h) => sum + h.soldUnits, 0)
    const facturacion = chartData.reduce((sum, h) => sum + h.salesAmount, 0)
    const promedio = Math.round(total / chartData.length)

    return { total, promedio, facturacion }
  }, [chartData])

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

        {/* Area Chart */}
        {chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
                  stroke="#6B7280"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  stroke="#6B7280"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.toLocaleString('es-CO')}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                  }}
                  labelStyle={{ color: '#F9FAFB', fontWeight: 'bold', marginBottom: '4px' }}
                  itemStyle={{ color: '#10B981' }}
                  labelFormatter={formatDateFull}
                  formatter={(value: number, name: string) => {
                    if (name === 'soldUnits') return [formatNumber(value), 'Ventas']
                    if (name === 'salesAmount') return [formatCurrency(value), 'Facturación']
                    return [formatNumber(value), name]
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="soldUnits"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVentas)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center">
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
