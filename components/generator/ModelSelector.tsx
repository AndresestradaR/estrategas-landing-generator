'use client'

import { useState } from 'react'
import { ChevronDown, Sparkles, Zap, Image as ImageIcon, Cpu } from 'lucide-react'
import { ImageProviderType, IMAGE_PROVIDERS } from '@/lib/image-providers/types'

interface ModelSelectorProps {
  value: ImageProviderType
  onChange: (provider: ImageProviderType) => void
  disabled?: boolean
}

const PROVIDER_ICONS: Record<ImageProviderType, React.ReactNode> = {
  gemini: <Sparkles className="w-4 h-4" />,
  openai: <Zap className="w-4 h-4" />,
  seedream: <ImageIcon className="w-4 h-4" />,
  flux: <Cpu className="w-4 h-4" />,
}

const PROVIDER_COLORS: Record<ImageProviderType, string> = {
  gemini: 'from-blue-500 to-purple-500',
  openai: 'from-green-500 to-emerald-500',
  seedream: 'from-orange-500 to-red-500',
  flux: 'from-pink-500 to-rose-500',
}

export default function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedProvider = IMAGE_PROVIDERS[value]

  return (
    <div className="relative">
      <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
        <Sparkles className="w-4 h-4 text-accent" />
        Modelo de IA
      </label>

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 bg-background border border-border rounded-xl
          text-left flex items-center justify-between
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent/50 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-accent/50 border-accent' : ''}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${PROVIDER_COLORS[value]} text-white`}>
            {PROVIDER_ICONS[value]}
          </div>
          <div>
            <p className="text-text-primary font-medium">{selectedProvider.name}</p>
            <p className="text-xs text-text-secondary">{selectedProvider.description}</p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 w-full mt-2 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
            {Object.entries(IMAGE_PROVIDERS).map(([id, provider]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onChange(id as ImageProviderType)
                  setIsOpen(false)
                }}
                className={`
                  w-full px-4 py-3 flex items-center gap-3 transition-colors
                  ${value === id ? 'bg-accent/10' : 'hover:bg-background'}
                `}
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${PROVIDER_COLORS[id as ImageProviderType]} text-white`}>
                  {PROVIDER_ICONS[id as ImageProviderType]}
                </div>
                <div className="text-left flex-1">
                  <p className="text-text-primary font-medium">{provider.name}</p>
                  <p className="text-xs text-text-secondary">{provider.description}</p>
                </div>
                {value === id && (
                  <div className="w-2 h-2 rounded-full bg-accent" />
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Provider features */}
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedProvider.supportsImageInput && (
          <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full">
            Soporta imágenes
          </span>
        )}
        {selectedProvider.supportsAspectRatio && (
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs rounded-full">
            Aspect ratio
          </span>
        )}
        {selectedProvider.requiresPolling && (
          <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 text-xs rounded-full">
            Async
          </span>
        )}
      </div>
    </div>
  )
}

// Simple inline selector (alternative)
export function ModelSelectorInline({
  value,
  onChange,
  disabled,
}: ModelSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.entries(IMAGE_PROVIDERS).map(([id, provider]) => (
        <button
          key={id}
          type="button"
          onClick={() => !disabled && onChange(id as ImageProviderType)}
          disabled={disabled}
          className={`
            px-4 py-2 rounded-xl border transition-all flex items-center gap-2
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${
              value === id
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border hover:border-accent/50 text-text-secondary hover:text-text-primary'
            }
          `}
        >
          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${PROVIDER_COLORS[id as ImageProviderType]} text-white`}>
            {PROVIDER_ICONS[id as ImageProviderType]}
          </div>
          <span className="text-sm font-medium">{provider.name}</span>
        </button>
      ))}
    </div>
  )
}
