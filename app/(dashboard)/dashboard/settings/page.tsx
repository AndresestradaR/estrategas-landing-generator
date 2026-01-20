'use client'

import { useState, useEffect } from 'react'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { Key, ExternalLink, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const [googleApiKey, setGoogleApiKey] = useState('')
  const [hasGoogleApiKey, setHasGoogleApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/keys')
      const data = await response.json()
      if (data.hasGoogleApiKey) setHasGoogleApiKey(true)
      if (data.maskedGoogleApiKey) setGoogleApiKey(data.maskedGoogleApiKey)
    } catch (error) {
      console.error('Error fetching keys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Only send key if it doesn't look like a masked value
      if (!googleApiKey || googleApiKey.includes('•')) {
        toast.error('Ingresa tu API key de Google')
        return
      }

      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleApiKey }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar')
      }

      toast.success('API key guardada correctamente')
      fetchKeys() // Refresh the masked key
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar')
    } finally {
      setIsSaving(false)
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
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Configuración</h1>
        <p className="text-text-secondary mt-1">
          Configura tu API key para comenzar a generar
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Google AI API Key
          </CardTitle>
          <CardDescription>
            Tu API key de Google AI Studio. Se usa para generar imágenes (Nano Banana Pro) y mejorar prompts (Gemini).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">
                API Key
                <span className="text-error"> *</span>
              </label>
              {hasGoogleApiKey && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <Check className="w-3 h-3" />
                  Configurada
                </span>
              )}
            </div>
            <Input
              type="password"
              placeholder="AIzaSy..."
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey(e.target.value)}
            />
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Obtener API Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSave}
            isLoading={isSaving}
          >
            Guardar API Key
          </Button>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6" variant="glass">
        <CardContent className="pt-6">
          <h3 className="font-medium text-text-primary mb-2">¿Qué incluye?</h3>
          <ul className="text-sm text-text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span><strong>Nano Banana Pro</strong> - Generación de imágenes de alta calidad para tus landings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span><strong>Gemini</strong> - Mejora automática de prompts para mejores resultados</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* BYOK Info */}
      <Card className="mt-4" variant="glass">
        <CardContent className="pt-6">
          <h3 className="font-medium text-text-primary mb-2">¿Por qué necesito mi propia key?</h3>
          <p className="text-sm text-text-secondary">
            Estrategas IA utiliza el modelo BYOK (Bring Your Own Key) para darte control total 
            sobre tus costos. Solo pagas lo que consumes directamente a Google, sin intermediarios.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
