'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card } from '@/components/ui'
import { Plus, Trash2, LayoutTemplate, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'

export const dynamic = 'force-dynamic'

interface Product {
  id: string
  name: string
  description?: string
  image_url?: string
  sections_count: number
  created_at: string
}

export default function LandingPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', description: '' })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      if (data.products) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProduct = async () => {
    if (!newProduct.name.trim()) {
      toast.error('Ingresa el nombre del producto')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear producto')
      }

      toast.success('Producto creado')
      setIsModalOpen(false)
      setNewProduct({ name: '', description: '' })
      
      // Navegar a la página de generación del producto
      router.push(`/dashboard/landing/${data.product.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Error al crear producto')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('¿Eliminar este producto y todas sus secciones?')) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar')
      }

      toast.success('Producto eliminado')
      fetchProducts()
    } catch (error) {
      toast.error('Error al eliminar producto')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Crea tu Landing</h1>
          <p className="text-text-secondary mt-1">
            Organiza tus productos y genera secciones de landing profesionales con IA
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-5 h-5" />
          Nueva Landing
        </Button>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LayoutTemplate className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No tienes productos aún
          </h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Crea tu primer producto para comenzar a generar secciones de landing con IA
          </p>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            Crear mi primer producto
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card 
              key={product.id} 
              className="group relative overflow-hidden cursor-pointer hover:border-accent/50 transition-colors"
              onClick={() => router.push(`/dashboard/landing/${product.id}`)}
            >
              {/* Product Image */}
              <div className="aspect-square bg-gradient-to-br from-accent/5 to-accent/10 flex items-center justify-center">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <LayoutTemplate className="w-12 h-12 text-accent/30" />
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-semibold text-text-primary truncate">
                  {product.name}
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  {product.sections_count} {product.sections_count === 1 ? 'sección' : 'secciones'}
                </p>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteProduct(product.id)
                }}
                className="absolute top-2 right-2 p-2 bg-background/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/10 hover:text-error"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}

          {/* Add New Product Card */}
          <Card 
            className="aspect-square flex flex-col items-center justify-center cursor-pointer border-dashed hover:border-accent/50 hover:bg-accent/5 transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-accent" />
            </div>
            <p className="font-medium text-text-primary">Agregar producto</p>
            <p className="text-sm text-text-secondary">Crea un nuevo producto</p>
          </Card>
        </div>
      )}

      {/* Create Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <Card className="relative w-full max-w-md p-6 z-10">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-text-secondary hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-text-primary mb-1">
              Crear Nuevo Producto
            </h2>
            <p className="text-text-secondary text-sm mb-6">
              Ingresa los detalles del producto para comenzar a generar secciones de landing
            </p>

            <div className="space-y-4">
              <Input
                label="Nombre del Producto"
                placeholder="Ej: Suplemento Vitamínico"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                autoFocus
              />

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Descripción <span className="text-text-secondary font-normal">(opcional)</span>
                </label>
                <textarea
                  placeholder="Describe brevemente el producto..."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateProduct}
                  isLoading={isCreating}
                >
                  Crear Producto
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
