'use client'

import { AudioLines, Music, Mic, Radio } from 'lucide-react'

export function AudioGenerator() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)] min-h-[600px]">
      <div className="text-center max-w-md">
        {/* Animated Icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-accent/20 rounded-3xl animate-pulse" />
          <div className="absolute inset-2 bg-surface rounded-2xl flex items-center justify-center">
            <AudioLines className="w-10 h-10 text-accent" />
          </div>
          {/* Floating icons */}
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-surface-elevated rounded-lg flex items-center justify-center shadow-lg animate-bounce" style={{ animationDelay: '0s' }}>
            <Music className="w-4 h-4 text-accent" />
          </div>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-surface-elevated rounded-lg flex items-center justify-center shadow-lg animate-bounce" style={{ animationDelay: '0.2s' }}>
            <Mic className="w-4 h-4 text-accent" />
          </div>
          <div className="absolute top-1/2 -right-4 w-8 h-8 bg-surface-elevated rounded-lg flex items-center justify-center shadow-lg animate-bounce" style={{ animationDelay: '0.4s' }}>
            <Radio className="w-4 h-4 text-accent" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-3">
          Generador de Audio
        </h2>
        <p className="text-text-secondary mb-6">
          Pronto podras generar musica, efectos de sonido, voces y mas con inteligencia artificial.
        </p>

        {/* Feature preview */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="p-4 bg-surface rounded-xl border border-border">
            <Music className="w-5 h-5 text-accent mb-2" />
            <p className="text-sm font-medium text-text-primary">Musica IA</p>
            <p className="text-xs text-text-secondary">Genera tracks completos</p>
          </div>
          <div className="p-4 bg-surface rounded-xl border border-border">
            <Mic className="w-5 h-5 text-accent mb-2" />
            <p className="text-sm font-medium text-text-primary">Voces IA</p>
            <p className="text-xs text-text-secondary">Text-to-speech realista</p>
          </div>
          <div className="p-4 bg-surface rounded-xl border border-border">
            <Radio className="w-5 h-5 text-accent mb-2" />
            <p className="text-sm font-medium text-text-primary">Efectos</p>
            <p className="text-xs text-text-secondary">Sonidos y SFX</p>
          </div>
          <div className="p-4 bg-surface rounded-xl border border-border">
            <AudioLines className="w-5 h-5 text-accent mb-2" />
            <p className="text-sm font-medium text-text-primary">Podcast</p>
            <p className="text-xs text-text-secondary">Audio long-form</p>
          </div>
        </div>

        {/* Coming soon badge */}
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full">
          <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span className="text-sm font-medium text-accent">Proximamente</span>
        </div>
      </div>
    </div>
  )
}
