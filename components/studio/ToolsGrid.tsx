'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import {
  Layers,
  Maximize2,
  Eraser,
  RotateCcw,
  Smartphone,
  Mic2,
  X,
  ArrowLeft,
  Sparkles,
  Upload,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Tool {
  id: string
  name: string
  description: string
  icon: React.ElementType
  color: string
  soon?: boolean
}

const TOOLS: Tool[] = [
  {
    id: 'variations',
    name: 'Variaciones',
    description: 'Genera variantes de una imagen',
    icon: Layers,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'upscale',
    name: 'Mejorar Imagen',
    description: 'Aumenta la resolucion (Upscaler)',
    icon: Maximize2,
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'remove-bg',
    name: 'Quitar Fondo',
    description: 'Elimina el fondo de imagenes',
    icon: Eraser,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'camera-angle',
    name: 'Cambiar Angulo',
    description: 'Cambia la perspectiva de la camara',
    icon: RotateCcw,
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'mockup',
    name: 'Mockup Generator',
    description: 'Crea mockups de productos',
    icon: Smartphone,
    color: 'from-indigo-500 to-violet-500',
  },
  {
    id: 'lip-sync',
    name: 'Lip Sync',
    description: 'Sincroniza labios con audio',
    icon: Mic2,
    color: 'from-rose-500 to-pink-500',
    soon: true,
  },
]

type ActiveTool = typeof TOOLS[number]['id'] | null

export function ToolsGrid() {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultImage, setResultImage] = useState<string | null>(null)

  const currentTool = TOOLS.find((t) => t.id === activeTool)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedImage(file)
      setResultImage(null)
    }
  }

  const handleProcess = async () => {
    if (!uploadedImage || !activeTool) return

    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append('image', uploadedImage)
      formData.append('tool', activeTool)

      const response = await fetch('/api/studio/tools', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error procesando imagen')
      }

      if (data.success && data.imageBase64) {
        setResultImage(`data:${data.mimeType || 'image/png'};base64,${data.imageBase64}`)
        toast.success('Imagen procesada exitosamente')
      }
    } catch (error) {
      console.error('Processing error:', error)
      toast.error(error instanceof Error ? error.message : 'Error procesando imagen')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!resultImage) return
    const link = document.createElement('a')
    link.href = resultImage
    link.download = `${activeTool}-${Date.now()}.png`
    link.click()
  }

  const resetTool = () => {
    setUploadedImage(null)
    setResultImage(null)
  }

  // Tool interface view
  if (activeTool && currentTool) {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[600px]">
        <div className="bg-surface rounded-2xl border border-border h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
            <button
              onClick={() => {
                setActiveTool(null)
                resetTool()
              }}
              className="p-2 hover:bg-border/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </button>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br',
                  currentTool.color
                )}
              >
                <currentTool.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  {currentTool.name}
                </h2>
                <p className="text-sm text-text-secondary">{currentTool.description}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 flex gap-6">
            {/* Upload / Input */}
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Imagen original
              </label>
              {uploadedImage ? (
                <div className="relative flex-1 bg-surface-elevated rounded-xl overflow-hidden">
                  <img
                    src={URL.createObjectURL(uploadedImage)}
                    alt="Uploaded"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={resetTool}
                    className="absolute top-3 right-3 p-2 bg-error/80 hover:bg-error rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent/50 rounded-xl cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Upload className="w-12 h-12 text-text-secondary mb-4" />
                  <p className="text-text-primary font-medium">
                    Arrastra una imagen o haz click para subir
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    PNG, JPG hasta 10MB
                  </p>
                </label>
              )}
            </div>

            {/* Result */}
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Resultado
              </label>
              <div className="flex-1 bg-surface-elevated rounded-xl overflow-hidden flex items-center justify-center">
                {resultImage ? (
                  <img
                    src={resultImage}
                    alt="Result"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <Sparkles className="w-12 h-12 text-text-secondary mx-auto mb-3" />
                    <p className="text-text-secondary">
                      El resultado aparecera aqui
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <button
              onClick={resetTool}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Limpiar
            </button>
            <div className="flex items-center gap-3">
              {resultImage && (
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-surface-elevated border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-border/50 transition-colors"
                >
                  Descargar
                </button>
              )}
              <button
                onClick={handleProcess}
                disabled={!uploadedImage || isProcessing}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all',
                  !uploadedImage || isProcessing
                    ? 'bg-border text-text-secondary cursor-not-allowed'
                    : 'bg-accent hover:bg-accent-hover text-background'
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Procesar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px]">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Herramientas IA</h2>
        <p className="text-text-secondary">
          Herramientas de edicion y procesamiento de imagenes con IA
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => !tool.soon && setActiveTool(tool.id)}
            disabled={tool.soon}
            className={cn(
              'relative p-6 bg-surface rounded-2xl border border-border text-left transition-all duration-200',
              tool.soon
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-1'
            )}
          >
            {tool.soon && (
              <span className="absolute top-3 right-3 px-2 py-0.5 text-xs font-medium bg-border text-text-secondary rounded">
                Pronto
              </span>
            )}
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br mb-4',
                tool.color
              )}
            >
              <tool.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              {tool.name}
            </h3>
            <p className="text-sm text-text-secondary">{tool.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
