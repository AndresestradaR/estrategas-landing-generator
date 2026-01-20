'use client'

import { useState, useEffect } from 'react'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { Key, ExternalLink, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const [nanoBananaKey, setNanoBananaKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [hasNanoBananaKey, setHasNanoBananaKey] = useState(false)
  const [hasGeminiKey, setHasGeminiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/keys')
      const data = await response.json()
      if (data.hasNanoBananaKey) setHasNanoBananaKey(true)
      if (data.hasGeminiKey) setHasGeminiKey(true)
      if (data.maskedNanoBananaKey) setNanoBananaKey(data.maskedNanoBananaKey)
      if (data.maskedGeminiKey) setGeminiKey(data.maskedGeminiKey)
    } catch (error) {
      console.error('Error fetching keys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const body: any = {}
      
      // Only send keys that don't look like masked values
      if (nanoBananaKey && !nanoBananaKey.includes('•')) {
        body.nanoBananaKey = nanoBananaKey
      }
      if (geminiKey && !geminiKey.includes('•')) {
        body.geminiKey = geminiKey
      }

      if (Object.keys(body).length === 0) {
        toast.error('Ingresa al menos una API key nueva')
        return
      }

      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar')
      }

      toast.success('API keys guardadas correctamente')
      fetchKeys() // Refresh the masked keys
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
          Configura tus API keys para comenzar a generar
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Ingresa tus propias API keys. Tus keys se encriptan y almacenan de forma segura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nano Banana Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">
                Nano Banana API Key
                <span className="text-error"> *</span>
              </label>
              {hasNanoBananaKey && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <Check className="w-3 h-3" />
                  Configurada
                </span>
              )}
            </div>
            <Input
              type="password"
              placeholder="nb_xxxxxxxxxxxxxxxx"
              value={nanoBananaKey}
              onChange={(e) => setNanoBananaKey(e.target.value)}
            />
            <a 
              href="https://nanobanana.ai/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Obtener API Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Gemini Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">
                Google Gemini API Key
                <span className="text-text-secondary text-xs ml-1">(opcional)</span>
              </label>
              {hasGeminiKey && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <Check className="w-3 h-3" />
                  Configurada
                </span>
              )}
            </div>
            <Input
              type="password"
              placeholder="AIzaXxxxxxxxxxxxxxxxx"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
            <p className="text-xs text-text-secondary">
              Mejora los prompts automáticamente con IA
            </p>
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
            Guardar API Keys
          </Button>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6" variant="glass">
        <CardContent className="pt-6">
          <h3 className="font-medium text-text-primary mb-2">¿Por qué necesito mis propias keys?</h3>
          <p className="text-sm text-text-secondary">
            Estrategas IA utiliza el modelo BYOK (Bring Your Own Key) para darte control total 
            sobre tus costos y uso. Solo pagas lo que consumes directamente a los proveedores 
            de IA, sin intermediarios ni markups.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}