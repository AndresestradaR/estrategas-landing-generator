'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import { Images, Download, X, Loader2 } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Generation {
  id: string
  product_name: string
  generated_image_url: string
  enhanced_prompt: string
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
      console.error('Error fetching generations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (imageUrl: string, productName: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${productName.replace(/\s+/g, '-').toLowerCase()}-landing.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Galería</h1>
          <p className="text-text-secondary mt-1">
            Todas tus imágenes generadas
          </p>
        </div>
        <Link href="/dashboard/generate">
          <Button>
            Nueva Generación
          </Button>
        </Link>
      </div>

      {generations.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {generations.map((gen) => (
            <div 
              key={gen.id} 
              className="group relative aspect-[9/16] bg-surface border border-border rounded-lg overflow-hidden cursor-pointer hover:border-accent/50 transition-colors"
              onClick={() => setSelectedImage(gen)}
            >
              <img 
                src={gen.generated_image_url} 
                alt={gen.product_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-medium truncate">{gen.product_name}</p>
                  <p className="text-white/60 text-xs">{formatDate(gen.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Images className="w-12 h-12 text-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No tienes imágenes aún</h3>
              <p className="text-text-secondary mb-4">Genera tu primera imagen para comenzar</p>
              <Link href="/dashboard/generate">
                <Button>Crear primera imagen</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-lg w-full bg-surface rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute top-3 right-3 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-5 h-5" />
            </button>
            
            <img 
              src={selectedImage.generated_image_url} 
              alt={selectedImage.product_name}
              className="w-full aspect-[9/16] object-cover"
            />
            
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-medium text-text-primary">{selectedImage.product_name}</h3>
                <p className="text-sm text-text-secondary">{formatDate(selectedImage.created_at)}</p>
              </div>
              
              {selectedImage.enhanced_prompt && (
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-xs text-text-secondary mb-1">Prompt:</p>
                  <p className="text-xs text-text-primary">{selectedImage.enhanced_prompt}</p>
                </div>
              )}
              
              <Button 
                className="w-full"
                onClick={() => handleDownload(selectedImage.generated_image_url, selectedImage.product_name)}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}