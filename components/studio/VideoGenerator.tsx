'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils/cn'
import {
  Video,
  ChevronDown,
  Upload,
  ImageIcon,
  Sparkles,
  Loader2,
  Download,
  Play,
  X,
  Check,
  Type,
  Eye,
} from 'lucide-react'

type VideoModel = 'kling-2.1' | 'kling-2.6' | 'sora-2' | 'veo-3'
type VideoDuration = '5s' | '10s'
type VideoAspectRatio = '16:9' | '9:16' | '1:1'
type PromptMode = 'text' | 'visual'

interface VideoModelConfig {
  id: VideoModel
  name: string
  description: string
  company: string
  price: string
  color: string
}

const VIDEO_MODELS: VideoModelConfig[] = [
  {
    id: 'kling-2.1',
    name: 'Kling 2.1',
    description: 'Alta calidad, movimientos naturales',
    company: 'Kuaishou',
    price: '~$0.10/5s',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'kling-2.6',
    name: 'Kling 2.6',
    description: 'Ultima version, mejor coherencia',
    company: 'Kuaishou',
    price: '~$0.15/5s',
    color: 'from-blue-600 to-indigo-500',
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    description: 'OpenAI - Cinematografico',
    company: 'OpenAI',
    price: '~$0.20/5s',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'veo-3',
    name: 'Veo 3',
    description: 'Google - Realismo extremo',
    company: 'Google',
    price: '~$0.18/5s',
    color: 'from-purple-500 to-pink-500',
  },
]

interface GeneratedVideo {
  id: string
  url: string
  prompt: string
  model: string
  timestamp: Date
  duration: string
}

export function VideoGenerator() {
  // Model selection
  const [selectedModel, setSelectedModel] = useState<VideoModel>('kling-2.1')
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)

  // References
  const [startImage, setStartImage] = useState<File | null>(null)
  const [endImage, setEndImage] = useState<File | null>(null)

  // Prompt mode
  const [promptMode, setPromptMode] = useState<PromptMode>('text')

  // Generation options
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState<VideoDuration>('5s')
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9')

  // State
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([])

  // Refs
  const startImageRef = useRef<HTMLInputElement>(null)
  const endImageRef = useRef<HTMLInputElement>(null)

  const currentModel = VIDEO_MODELS.find((m) => m.id === selectedModel)!

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      return
    }

    setIsGenerating(true)

    // Simulate generation (API not connected yet)
    setTimeout(() => {
      setIsGenerating(false)
      // This would be the actual API call
      // For now, just show a message that it's not connected
    }, 2000)
  }

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      setter(file)
    }
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[600px]">
      {/* Left Panel - Controls */}
      <div className="w-[380px] flex-shrink-0 bg-surface rounded-2xl border border-border p-5 overflow-y-auto">
        <div className="space-y-6">
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
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br',
                      currentModel.color
                    )}
                  >
                    <Video className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-text-primary">
                      {currentModel.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {currentModel.company} · {currentModel.price}
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
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated border border-border rounded-xl shadow-xl z-50 p-2">
                  {VIDEO_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id)
                        setIsModelDropdownOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        selectedModel === model.id
                          ? 'bg-accent/10 text-accent'
                          : 'hover:bg-border/50 text-text-primary'
                      )}
                    >
                      <div
                        className={cn(
                          'w-6 h-6 rounded flex items-center justify-center bg-gradient-to-br',
                          model.color
                        )}
                      >
                        <Video className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{model.name}</p>
                        <p className="text-xs text-text-secondary">
                          {model.description}
                        </p>
                      </div>
                      {selectedModel === model.id && (
                        <Check className="w-4 h-4 text-accent" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* References */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Referencias (Transiciones)
            </label>
            <div className="flex gap-3">
              <input
                ref={startImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, setStartImage)}
              />
              <input
                ref={endImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, setEndImage)}
              />

              <button
                onClick={() => startImageRef.current?.click()}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed transition-colors aspect-video',
                  startImage
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50'
                )}
              >
                {startImage ? (
                  <div className="relative w-full h-full">
                    <img
                      src={URL.createObjectURL(startImage)}
                      alt="Start"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setStartImage(null)
                      }}
                      className="absolute top-1 right-1 p-1 bg-error rounded-full"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 text-text-secondary" />
                    <span className="text-xs text-text-secondary">Imagen inicial</span>
                  </>
                )}
              </button>

              <button
                onClick={() => endImageRef.current?.click()}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed transition-colors aspect-video',
                  endImage
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50'
                )}
              >
                {endImage ? (
                  <div className="relative w-full h-full">
                    <img
                      src={URL.createObjectURL(endImage)}
                      alt="End"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEndImage(null)
                      }}
                      className="absolute top-1 right-1 p-1 bg-error rounded-full"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 text-text-secondary" />
                    <span className="text-xs text-text-secondary">Imagen final</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Prompt Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Tipo de prompt
            </label>
            <div className="flex p-1 bg-surface-elevated rounded-lg">
              <button
                onClick={() => setPromptMode('text')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  promptMode === 'text'
                    ? 'bg-accent text-background'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <Type className="w-4 h-4" />
                Texto
              </button>
              <button
                onClick={() => setPromptMode('visual')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  promptMode === 'visual'
                    ? 'bg-accent text-background'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <Eye className="w-4 h-4" />
                Visual
              </button>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              PROMPT
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                promptMode === 'text'
                  ? 'Describe el video que quieres generar...'
                  : 'Describe visualmente la escena, movimientos de camara, transiciones...'
              }
              rows={5}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Duracion
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as VideoDuration)}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="5s">5 segundos</option>
                <option value="10s">10 segundos</option>
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
                <option value="16:9">16:9 (Horizontal)</option>
                <option value="9:16">9:16 (Vertical)</option>
                <option value="1:1">1:1 (Cuadrado)</option>
              </select>
            </div>
          </div>

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

          {/* Coming Soon Notice */}
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
            <p className="text-sm text-warning font-medium">
              API de video en desarrollo
            </p>
            <p className="text-xs text-text-secondary mt-1">
              La generacion de video estara disponible proximamente.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Gallery */}
      <div className="flex-1 bg-surface rounded-2xl border border-border p-5 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Videos ({generatedVideos.length})
          </h3>
        </div>

        {generatedVideos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-border/50 flex items-center justify-center">
                <Video className="w-8 h-8 text-text-secondary" />
              </div>
              <p className="text-text-secondary">
                Tus videos generados apareceran aqui
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              {generatedVideos.map((video) => (
                <div
                  key={video.id}
                  className="group relative aspect-video rounded-xl overflow-hidden bg-surface-elevated"
                >
                  <video
                    src={video.url}
                    className="w-full h-full object-cover"
                    controls
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-xs text-white/80 line-clamp-2">
                        {video.prompt}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
