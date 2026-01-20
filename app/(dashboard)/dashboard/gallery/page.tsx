'use client'

import { useEffect, useState } from 'react'
import { Card, Button } from '@/components/ui'
import { Images, Download, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Generation {
  id: string
  product_name: string
  generated_image_url: string | null
  enhanced_prompt: string
  status: string
  created_at: string
}

export default function GalleryPage() {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<Generation | null>(null)

  useEffect(() => {
    fetchGenerations()
  }, [])

  const fetchGenerations = async () => {
    try {
      const response = await fetch('/api/generate')
      const data = await response.json()
      
      if (data.generations) {
        setGenerations(data.generations)
      }
    } catch (error) {
      toast.error('Error al cargar galería')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (gen: Generation) => {
    if (!gen.generated_image_url) return
    
    try {
      const response = await fetch(gen.generated_image_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${gen.product_name.replace(/\s+/g, '-')}-landing.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Imagen descargada')
    } catch (error) {
      toast.error('Error al descargar')
    }
  }

  const completedGenerations = generations.filter(g => g.status === 'completed' && g.generated_image_url)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Galería</h1>
        <p className="text-text-secondary mt-1">
          Todas tus imágenes generadas ({completedGenerations.length} imágenes)
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[9/16] bg-surface rounded-lg animate-shimmer" />
          ))}
        </div>
      ) : completedGenerations.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {completedGenerations.map((gen) => (
            <div 
              key={gen.id}
              onClick={() => setSelectedImage(gen)}
              className="group relative aspect-[9/16] bg-surface rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition-all"
            >
              <img 
                src={gen.generated_image_url!} 
                alt={gen.product_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-medium truncate">{gen.product_name}</p>
                  <p className="text-white/70 text-xs">
                    {new Date(gen.created_at).toLocaleDateString('es-CO')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="text-center py-16">
          <Images className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Sin imágenes aún</h3>
          <p className="text-text-secondary mb-6">
            Genera tu primera imagen para verla aquí
          </p>
          <Button onClick={() => window.location.href = '/dashboard/generate'}>
            Generar Primera Imagen
          </Button>
        </Card>
      )}

      {/* Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-2xl w-full max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{selectedImage.product_name}</h3>
              <button 
                onClick={() => setSelectedImage(null)}
                className="p-2 text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden rounded-lg">
              <img 
                src={selectedImage.generated_image_url!}
                alt={selectedImage.product_name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex gap-4 mt-4">
              <Button 
                onClick={() => handleDownload(selectedImage)}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            </div>

            <div className="mt-4 p-4 bg-surface/50 rounded-lg">
              <p className="text-xs text-text-secondary mb-1">Prompt:</p>
              <p className="text-sm text-white">{selectedImage.enhanced_prompt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}