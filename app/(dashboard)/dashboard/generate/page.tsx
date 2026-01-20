'use client'

import { useState } from 'react'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { Sparkles, Download, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export const dynamic = 'force-dynamic'

export default function GeneratePage() {
  const [productName, setProductName] = useState('')
  const [notes, setNotes] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!productName.trim()) {
      toast.error('Ingresa el nombre del producto')
      return
    }

    setIsGenerating(true)
    setGeneratedImage(null)
    setEnhancedPrompt(null)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: productName.trim(),
          notes: notes.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar imagen')
      }

      setGeneratedImage(data.imageUrl)
      setEnhancedPrompt(data.enhancedPrompt)
      toast.success('¡Imagen generada exitosamente!')
    } catch (error: any) {
      toast.error(error.message || 'Error al generar imagen')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!generatedImage) return

    try {
      const response = await fetch(generatedImage)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${productName.replace(/\s+/g, '-').toLowerCase()}-landing.png`
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Generar Imagen</h1>
        <p className="text-text-secondary mt-1">
          Crea imágenes profesionales 9:16 para tus landing pages
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Producto</CardTitle>
            <CardDescription>
              Describe tu producto para generar la imagen perfecta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <Input
                label="Nombre del Producto"
                placeholder="Ej: Sérum de Vitamina C"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors resize-none"
                  rows={3}
                  placeholder="Ej: Fondo rosa suave, estilo minimalista, con gotas de agua"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                isLoading={isGenerating}
                disabled={isGenerating}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generando...' : 'Generar Imagen'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa</CardTitle>
            <CardDescription>
              Tu imagen generada aparecerá aquí
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-[9/16] bg-background border border-border rounded-lg overflow-hidden flex items-center justify-center">
              {isGenerating ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
                  <p className="text-text-secondary text-sm">Generando imagen...</p>
                  <p className="text-text-secondary text-xs mt-1">Esto puede tomar 20-30 segundos</p>
                </div>
              ) : generatedImage ? (
                <img 
                  src={generatedImage} 
                  alt={productName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center px-4">
                  <Sparkles className="w-12 h-12 text-border mx-auto mb-3" />
                  <p className="text-text-secondary text-sm">
                    Completa el formulario para generar tu imagen
                  </p>
                </div>
              )}
            </div>

            {generatedImage && (
              <div className="mt-4 space-y-3">
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Imagen
                </Button>
                
                {enhancedPrompt && (
                  <div className="p-3 bg-background rounded-lg border border-border">
                    <p className="text-xs text-text-secondary mb-1">Prompt utilizado:</p>
                    <p className="text-xs text-text-primary">{enhancedPrompt}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}