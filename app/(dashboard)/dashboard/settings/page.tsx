'use client'

import { useEffect, useState } from 'react'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { Key, Save, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [nanoBananaKey, setNanoBananaKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [hasNanoBananaKey, setHasNanoBananaKey] = useState(false)
  const [hasGeminiKey, setHasGeminiKey] = useState(false)

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/keys')
      const data = await response.json()
      
      setHasNanoBananaKey(data.hasNanoBananaKey)
      setHasGeminiKey(data.hasGeminiKey)
    } catch (error) {
      console.error('Error fetching keys:', error)
    } finally {
      setIsFetching(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload: Record<string, string> = {}
      
      if (nanoBananaKey) {
        payload.nanoBananaKey = nanoBananaKey
      }
      
      if (geminiKey) {
        payload.geminiKey = geminiKey
      }

      if (Object.keys(payload).length === 0) {
        toast.error('Ingresa al menos una API key')
        return
      }

      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al guardar')
      }

      toast.success('API Keys guardadas correctamente')
      setNanoBananaKey('')
      setGeminiKey('')
      fetchKeys()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">
          Configura tus API keys para usar los servicios de IA
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-accent" />
            </div>
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Tus keys están encriptadas y seguras
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isFetching ? (
            <div className="space-y-4">
              <div className="h-20 bg-border rounded-lg animate-shimmer" />
              <div className="h-20 bg-border rounded-lg animate-shimmer" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Nano Banana Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-text-primary">
                    Nano Banana API Key
                  </label>
                  <a 
                    href="https://nanobanana.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
                  >
                    Obtener key
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Input
                  type="password"
                  placeholder={hasNanoBananaKey ? '••••••••••••' : 'Ingresa tu API key de Nano Banana'}
                  value={nanoBananaKey}
                  onChange={(e) => setNanoBananaKey(e.target.value)}
                  hint={hasNanoBananaKey ? 'Ya tienes una key configurada. Ingresa una nueva para reemplazarla.' : 'Requerida para generar imágenes'}
                />
                {hasNanoBananaKey && (
                  <p className="text-xs text-success flex items-center gap-1">
                    ✓ Key configurada
                  </p>
                )}
              </div>

              {/* Gemini Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-text-primary">
                    Google Gemini API Key
                  </label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
                  >
                    Obtener key
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Input
                  type="password"
                  placeholder={hasGeminiKey ? '••••••••••••' : 'Ingresa tu API key de Gemini'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  hint={hasGeminiKey ? 'Ya tienes una key configurada. Ingresa una nueva para reemplazarla.' : 'Opcional - mejora automáticamente tus prompts'}
                />
                {hasGeminiKey && (
                  <p className="text-xs text-success flex items-center gap-1">
                    ✓ Key configurada
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                Guardar Keys
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="pt-6">
          <h3 className="font-medium text-text-primary mb-2">¿Cómo funcionan las API Keys?</h3>
          <ul className="text-sm text-text-secondary space-y-2">
            <li>• <strong>Nano Banana:</strong> Genera las imágenes de producto. Es requerida.</li>
            <li>• <strong>Google Gemini:</strong> Mejora automáticamente tus prompts. Es opcional pero recomendada.</li>
            <li>• Tus keys están encriptadas con AES-256 y solo se usan cuando generas imágenes.</li>
            <li>• Los costos de las APIs los asumes tú. Nosotros solo somos el motor.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}