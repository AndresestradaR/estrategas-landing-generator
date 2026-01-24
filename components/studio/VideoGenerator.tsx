'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils/cn'
import {
  Video,
  ChevronDown,
  ImageIcon,
  Sparkles,
  Loader2,
  Download,
  X,
  Check,
  Clock,
  Zap,
  Film,
  Volume2,
  VolumeX,
  Layers,
  Play,
} from 'lucide-react'
import {
  VIDEO_MODELS,
  VIDEO_COMPANY_GROUPS,
  type VideoModelId,
  type VideoModelConfig,
} from '@/lib/video-providers/types'

type VideoAspectRatio = '16:9' | '9:16' | '1:1'

interface GeneratedVideo {
  id: string
  url: string
  prompt: string
  model: string
  timestamp: Date
  duration: string
  aspectRatio: string
}

// Tag styling config
const TAG_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  NEW: { label: 'NUEVO', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <Sparkles className="w-2.5 h-2.5" /> },
  FAST: { label: 'RÁPIDO', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Zap className="w-2.5 h-2.5" /> },
  PREMIUM: { label: 'PREMIUM', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <Sparkles className="w-2.5 h-2.5" /> },
  AUDIO: { label: 'AUDIO', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Volume2 className="w-2.5 h-2.5" /> },
  REFERENCES: { label: 'REFS', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <ImageIcon className="w-2.5 h-2.5" /> },
  MULTI_SHOTS: { label: 'MULTI-SHOT', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: <Layers className="w-2.5 h-2.5" /> },
  RECOMENDADO: { label: '⭐ TOP', color: 'bg-accent/20 text-accent border-accent/30', icon: null },
}

export function VideoGenerator() {
  // Model selection
  const [selectedModel, setSelectedModel] = useState<VideoModelId>('hailuo-2.3')
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)

  // References
  const [startImage, setStartImage] = useState<{ file: File; preview: string } | null>(null)
  const [referenceImage, setReferenceImage] = useState<{ file: File; preview: string } | null>(null)

  // Generation options
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState<number>(5)
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9')
  const [resolution, setResolution] = useState<string>('1080p')
  const [enableAudio, setEnableAudio] = useState(true)

  // State
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([])
  const [error, setError] = useState<string | null>(null)

  // Refs
  const startImageRef = useRef<HTMLInputElement>(null)
  const referenceImageRef = useRef<HTMLInputElement>(null)

  const currentModel = VIDEO_MODELS[selectedModel]

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      // Convert images to base64 if present
      let startImageBase64: string | undefined
      let referenceImageBase64: string | undefined

      if (startImage && currentModel.supportsStartEndFrames) {
        startImageBase64 = await fileToBase64(startImage.file)
      }

      if (referenceImage && currentModel.supportsReferences) {
        referenceImageBase64 = await fileToBase64(referenceImage.file)
      }

      const response = await fetch('/api/studio/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModel,
          prompt,
          duration,
          aspectRatio,
          resolution,
          enableAudio: currentModel.supportsAudio ? enableAudio : false,
          startImageBase64,
          referenceImageBase64,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Error al generar video')
      }

      // Add to gallery
      setGeneratedVideos((prev) => [
        {
          id: Date.now().toString(),
          url: data.videoUrl,
          prompt,
          model: currentModel.name,
          timestamp: new Date(),
          duration: `${duration}s`,
          aspectRatio,
        },
        ...prev,
      ])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: { file: File; preview: string } | null) => void
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      setter({ file, preview: URL.createObjectURL(file) })
    }
  }

  const getDurationOptions = () => {
    // Parse duration range from model config (e.g., "4-8s" -> [4, 8])
    const range = currentModel.durationRange.match(/(\d+)-(\d+)/)
    if (!range) return [5, 10]
    const min = parseInt(range[1])
    const max = parseInt(range[2])
    const options = []
    for (let i = min; i <= max; i++) {
      options.push(i)
    }
    return options
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[600px]">
      {/* Left Panel - Controls */}
      <div className="w-[420px] flex-shrink-0 bg-surface rounded-2xl border border-border p-5 overflow-y-auto">
        <div className="space-y-5">
          {/* Model Selector */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Modelo
            </label>
            <div className="relative">
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-elevated border border-border rounded-xl hover:border-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20">
                    <Video className="w-5 h-5 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-text-primary">
                      {currentModel.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {currentModel.companyName} · {currentModel.priceRange} créditos
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-text-secondary transition-transform',
                    isModelDropdownOpen && 'rotate-180'
                  )}
                />
              </button>

              {isModelDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated border border-border rounded-xl shadow-xl z-50 p-2 max-h-[400px] overflow-y-auto">
                  {VIDEO_COMPANY_GROUPS.map((group) => (
                    <div key={group.id} className="mb-3 last:mb-0">
                      <p className="px-3 py-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        {group.name}
                      </p>
                      {group.models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model.id)
                            setResolution(model.defaultResolution)
                            setIsModelDropdownOpen(false)
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                            selectedModel === model.id
                              ? 'bg-accent/10 text-accent'
                              : 'hover:bg-border/50 text-text-primary'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br',
                            group.color
                          )}>
                            <Video className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{model.name}</p>
                              {model.tags?.map((tag) => {
                                const config = TAG_CONFIG[tag]
                                if (!config) return null
                                return (
                                  <span
                                    key={tag}
                                    className={cn(
                                      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border',
                                      config.color
                                    )}
                                  >
                                    {config.icon}
                                    {config.label}
                                  </span>
                                )
                              })}
                            </div>
                            <p className="text-xs text-text-secondary">
                              {model.durationRange} · {model.priceRange} créditos
                            </p>
                          </div>
                          {selectedModel === model.id && (
                            <Check className="w-4 h-4 text-accent" />
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Model Features */}
          <div className="flex flex-wrap gap-2">
            {currentModel.supportsAudio && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Volume2 className="w-3 h-3" /> Audio
              </span>
            )}
            {currentModel.supportsReferences && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <ImageIcon className="w-3 h-3" /> Referencias
              </span>
            )}
            {currentModel.supportsStartEndFrames && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Film className="w-3 h-3" /> Start/End
              </span>
            )}
            {currentModel.supportsMultiShots && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Layers className="w-3 h-3" /> Multi-shots
              </span>
            )}
          </div>

          {/* Start Image (if supported) */}
          {currentModel.supportsStartEndFrames && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Imagen Inicial (opcional)
              </label>
              <input
                ref={startImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, setStartImage)}
              />
              <button
                onClick={() => startImageRef.current?.click()}
                className={cn(
                  'w-full flex items-center justify-center gap-3 p-4 rounded-xl border border-dashed transition-colors',
                  startImage
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-accent/50'
                )}
              >
                {startImage ? (
                  <div className="relative w-full aspect-video">
                    <img
                      src={startImage.preview}
                      alt="Start"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setStartImage(null)
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-error/90 rounded-full hover:bg-error transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 text-text-secondary" />
                    <span className="text-sm text-text-secondary">
                      Subir imagen de inicio
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Reference Image (if supported) */}
          {currentModel.supportsReferences && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Imagen de Referencia (estilo)
              </label>
              <input
                ref={referenceImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, setReferenceImage)}
              />
              <button
                onClick={() => referenceImageRef.current?.click()}
                className={cn(
                  'w-full flex items-center justify-center gap-3 p-4 rounded-xl border border-dashed transition-colors',
                  referenceImage
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-accent/50'
                )}
              >
                {referenceImage ? (
                  <div className="relative w-full aspect-video">
                    <img
                      src={referenceImage.preview}
                      alt="Reference"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setReferenceImage(null)
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-error/90 rounded-full hover:bg-error transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 text-text-secondary" />
                    <span className="text-sm text-text-secondary">
                      Subir imagen de referencia
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              PROMPT
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe el video que quieres generar..."
              rows={4}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Duración
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {getDurationOptions().map((d) => (
                  <option key={d} value={d}>
                    {d}s
                  </option>
                ))}
              </select>
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Resolución
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {currentModel.resolutions.map((res) => (
                  <option key={res} value={res}>
                    {res}
                  </option>
                ))}
              </select>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as VideoAspectRatio)}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </div>
          </div>

          {/* Audio Toggle */}
          {currentModel.supportsAudio && (
            <div className="flex items-center justify-between p-3 bg-surface-elevated rounded-xl border border-border">
              <div className="flex items-center gap-3">
                {enableAudio ? (
                  <Volume2 className="w-5 h-5 text-accent" />
                ) : (
                  <VolumeX className="w-5 h-5 text-text-secondary" />
                )}
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Generar Audio
                  </p>
                  <p className="text-xs text-text-secondary">
                    El modelo generará audio ambiental
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEnableAudio(!enableAudio)}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors relative',
                  enableAudio ? 'bg-accent' : 'bg-border'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    enableAudio ? 'translate-x-7' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all duration-200',
              isGenerating || !prompt.trim()
                ? 'bg-border text-text-secondary cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover text-background shadow-lg shadow-accent/25 hover:shadow-accent/40'
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generar Video
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel - Gallery */}
      <div className="flex-1 bg-surface rounded-2xl border border-border p-5 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Galería ({generatedVideos.length})
          </h3>
        </div>

        {generatedVideos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-border/50 flex items-center justify-center">
                <Video className="w-8 h-8 text-text-secondary" />
              </div>
              <p className="text-text-secondary">
                Tus videos generados aparecerán aquí
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              {generatedVideos.map((video) => (
                <div
                  key={video.id}
                  className="group relative rounded-xl overflow-hidden bg-surface-elevated"
                  style={{
                    aspectRatio:
                      video.aspectRatio === '16:9'
                        ? '16/9'
                        : video.aspectRatio === '9:16'
                        ? '9/16'
                        : '1/1',
                  }}
                >
                  <video
                    src={video.url}
                    className="w-full h-full object-cover"
                    controls
                    poster=""
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-xs text-white/80 line-clamp-2">
                        {video.prompt}
                      </p>
                      <p className="text-[10px] text-white/60 mt-1">
                        {video.model} · {video.duration}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = video.url
                      a.download = `video-${video.id}.mp4`
                      a.click()
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
