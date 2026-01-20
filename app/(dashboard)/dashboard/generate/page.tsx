'use client'

import { useState } from 'react'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { ImagePlus, Download, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GeneratePage() {
  const [productName, setProductName] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ imageUrl: string; prompt: string } | null>(null)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!productName.trim()) {
      toast.error('Ingresa el nombre del producto')
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, notes }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar')
      }

      setResult({
        imageUrl: data.imageUrl,
        prompt: data.prompt,
      })
      toast.success('¡Imagen generada!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al generar imagen')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!result?.imageUrl) return
    
    try {
      const response = await fetch(result.imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${productName.replace(/\s+/g, '-')}-landing.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Imagen descargada')
    } catch (error) {
      toast.error('Error al descargar')
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Generar Imagen</h1>
        <p className="text-text-secondary mt-1">
          Crea imágenes de producto profesionales para tus landings
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Producto</CardTitle>
            <CardDescription>
              Ingresa la información del producto que quieres generar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-6">
              <Input
                label="Nombre del Producto"
                placeholder="Ej: Smartwatch deportivo negro"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Notas Adicionales (opcional)
                </label>
                <textarea
                  placeholder="Ej: Mostrar en muñeca, fondo degradado azul, estilo minimalista"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 resize-none"
                />
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading}>
                <Sparkles className="w-4 h-4 mr-2" />
                {isLoading ? 'Generando...' : 'Generar Imagen'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Tu imagen generada aparecerá aquí
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-[9/16] bg-border/50 rounded-lg overflow-hidden flex items-center justify-center">
              {isLoading ? (
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-text-secondary">Generando imagen...</p>
                  <p className="text-xs text-text-secondary mt-2">Esto puede tardar unos segundos</p>
                </div>
              ) : result?.imageUrl ? (
                <img 
                  src={result.imageUrl} 
                  alt={productName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-8">
                  <ImagePlus className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
                  <p className="text-text-secondary">
                    Ingresa los datos del producto y haz clic en generar
                  </p>
                </div>
              )}
            </div>

            {result?.imageUrl && (
              <div className="mt-4 space-y-4">
                <Button onClick={handleDownload} variant="secondary" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Imagen
                </Button>
                
                <div className="p-4 bg-surface rounded-lg">
                  <p className="text-xs text-text-secondary mb-1">Prompt utilizado:</p>
                  <p className="text-sm text-text-primary">{result.prompt}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}