'use client'

import { useState } from 'react'
import { ProductFilters } from '@/components/productos/ProductFilters'
import { ProductTable } from '@/components/productos/ProductTable'
import { CookieInput } from '@/components/productos/CookieInput'
import { Product, ProductFilters as Filters } from '@/lib/dropkiller/types'
import { Target, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductResearchPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [cookies, setCookies] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (filters: Filters) => {
    if (!cookies) {
      toast.error('Primero ingresa tus cookies de DropKiller')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/productos/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, cookies }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al buscar productos')
      }

      setProducts(data.products)
      
      if (data.products.length === 0) {
        toast('No se encontraron productos con esos filtros', { icon: '🔍' })
      } else {
        toast.success(`Se encontraron ${data.products.length} productos`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
          <Target className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Encuentra tu Producto Ganador
          </h1>
          <p className="text-text-secondary">
            Busca productos con buenos números usando datos de DropKiller
          </p>
        </div>
      </div>

      {/* Cookie Input */}
      <CookieInput onCookiesChange={setCookies} />

      {/* Filters */}
      <ProductFilters onSearch={handleSearch} isLoading={isLoading} />

      {/* Error Alert */}
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-error">Error en la búsqueda</p>
            <p className="text-sm text-error/80">{error}</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      <ProductTable products={products} isLoading={isLoading} />

      {/* Info Footer */}
      <div className="text-center text-sm text-text-secondary/70 py-4">
        <p>Los datos provienen de DropKiller. Necesitas una suscripción activa para usar esta herramienta.</p>
      </div>
    </div>
  )
}
