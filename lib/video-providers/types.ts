// Video Provider Types for Estudio IA

export type VideoProviderCompany = 'google' | 'kuaishou' | 'openai' | 'minimax' | 'seedance' | 'wan'

export type VideoModelId =
  // Google Veo
  | 'veo-3.1'
  | 'veo-3-fast'
  // Kling (Kuaishou)
  | 'kling-2.6'
  | 'kling-o1'
  // OpenAI Sora
  | 'sora-2'
  // MiniMax Hailuo
  | 'hailuo-2.3'
  | 'hailuo-2.3-fast'
  // Seedance (ByteDance)
  | 'seedance-1.5-pro'
  | 'seedance-1.0-fast'
  // Wan
  | 'wan-2.6'
  | 'wan-2.5'

export type VideoModelTag = 'NEW' | 'FAST' | 'PREMIUM' | 'AUDIO' | 'REFERENCES' | 'MULTI_SHOTS' | 'RECOMENDADO'

export interface VideoModelConfig {
  id: VideoModelId
  apiModelId: string // KIE.ai model identifier
  name: string
  description: string
  company: VideoProviderCompany
  companyName: string
  priceRange: string // e.g., "800-2400 credits"
  durationRange: string // e.g., "4-12s"
  resolutions: string[] // e.g., ["720p", "1080p", "4K"]
  defaultResolution: string
  supportsAudio: boolean
  supportsReferences: boolean
  supportsStartEndFrames: boolean
  supportsMultiShots: boolean
  tags?: VideoModelTag[]
  recommended?: boolean
}

export interface VideoCompanyGroup {
  id: VideoProviderCompany
  name: string
  icon: string
  color: string
  models: VideoModelConfig[]
}

// Video Model Definitions
export const VIDEO_MODELS: Record<VideoModelId, VideoModelConfig> = {
  // ============ GOOGLE VEO ============
  'veo-3.1': {
    id: 'veo-3.1',
    apiModelId: 'google/veo-3.1',
    name: 'Google Veo 3.1',
    description: 'Flagship con referencias, audio y 4K',
    company: 'google',
    companyName: 'Google',
    priceRange: '800-2400',
    durationRange: '4-8s',
    resolutions: ['720p', '1080p', '4K'],
    defaultResolution: '1080p',
    supportsAudio: true,
    supportsReferences: true,
    supportsStartEndFrames: true,
    supportsMultiShots: false,
    tags: ['PREMIUM', 'AUDIO', 'REFERENCES'],
    recommended: true,
  },
  'veo-3-fast': {
    id: 'veo-3-fast',
    apiModelId: 'google/veo-3-fast',
    name: 'Veo 3 Fast',
    description: 'Generación rápida con audio',
    company: 'google',
    companyName: 'Google',
    priceRange: '400-960',
    durationRange: '4-8s',
    resolutions: ['720p', '1080p'],
    defaultResolution: '720p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: false,
    tags: ['FAST', 'AUDIO'],
  },

  // ============ KLING (KUAISHOU) ============
  'kling-2.6': {
    id: 'kling-2.6',
    apiModelId: 'kling/2.6',
    name: 'Kling 2.6',
    description: 'Último modelo con audio',
    company: 'kuaishou',
    companyName: 'Kling',
    priceRange: '225-800',
    durationRange: '5-10s',
    resolutions: ['1080p'],
    defaultResolution: '1080p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: false,
    tags: ['NEW', 'AUDIO'],
    recommended: true,
  },
  'kling-o1': {
    id: 'kling-o1',
    apiModelId: 'kling/o1',
    name: 'Kling O1',
    description: 'Generación con imágenes de referencia',
    company: 'kuaishou',
    companyName: 'Kling',
    priceRange: '225-1500',
    durationRange: '3-10s',
    resolutions: ['720p', '1080p'],
    defaultResolution: '1080p',
    supportsAudio: false,
    supportsReferences: true,
    supportsStartEndFrames: true,
    supportsMultiShots: false,
    tags: ['NEW', 'REFERENCES'],
  },

  // ============ OPENAI SORA ============
  'sora-2': {
    id: 'sora-2',
    apiModelId: 'openai/sora-2',
    name: 'OpenAI Sora 2',
    description: 'El modelo de video de OpenAI',
    company: 'openai',
    companyName: 'OpenAI',
    priceRange: '800-2400',
    durationRange: '4-12s',
    resolutions: ['720p'],
    defaultResolution: '720p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: false,
    tags: ['PREMIUM', 'AUDIO'],
    recommended: true,
  },

  // ============ MINIMAX HAILUO ============
  'hailuo-2.3': {
    id: 'hailuo-2.3',
    apiModelId: 'minimax/hailuo-2.3',
    name: 'Hailuo 2.3',
    description: 'Buena calidad a precio competitivo',
    company: 'minimax',
    companyName: 'MiniMax',
    priceRange: '360-600',
    durationRange: '6-10s',
    resolutions: ['768p', '1080p'],
    defaultResolution: '1080p',
    supportsAudio: false,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: false,
    tags: ['RECOMENDADO'],
    recommended: true,
  },
  'hailuo-2.3-fast': {
    id: 'hailuo-2.3-fast',
    apiModelId: 'minimax/hailuo-2.3-fast',
    name: 'Hailuo 2.3 Fast',
    description: 'Rápido y económico para pruebas',
    company: 'minimax',
    companyName: 'MiniMax',
    priceRange: '150-430',
    durationRange: '6-10s',
    resolutions: ['768p', '1080p'],
    defaultResolution: '768p',
    supportsAudio: false,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: false,
    tags: ['FAST'],
  },

  // ============ SEEDANCE (BYTEDANCE) ============
  'seedance-1.5-pro': {
    id: 'seedance-1.5-pro',
    apiModelId: 'seedance/1.5-pro',
    name: 'Seedance 1.5 Pro',
    description: 'Multi-shots y audio, de ByteDance',
    company: 'seedance',
    companyName: 'Seedance',
    priceRange: '180-2640',
    durationRange: '4-12s',
    resolutions: ['1080p'],
    defaultResolution: '1080p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: true,
    tags: ['NEW', 'AUDIO', 'MULTI_SHOTS'],
    recommended: true,
  },
  'seedance-1.0-fast': {
    id: 'seedance-1.0-fast',
    apiModelId: 'seedance/1.0-fast',
    name: 'Seedance 1.0 Fast',
    description: 'Muy económico con referencias',
    company: 'seedance',
    companyName: 'Seedance',
    priceRange: '40-1080',
    durationRange: '2-12s',
    resolutions: ['480p', '1080p'],
    defaultResolution: '1080p',
    supportsAudio: false,
    supportsReferences: true,
    supportsStartEndFrames: true,
    supportsMultiShots: true,
    tags: ['FAST', 'REFERENCES', 'MULTI_SHOTS'],
  },

  // ============ WAN ============
  'wan-2.6': {
    id: 'wan-2.6',
    apiModelId: 'wan/2.6',
    name: 'Wan 2.6',
    description: 'Nuevo con multi-shots y audio',
    company: 'wan',
    companyName: 'Wan',
    priceRange: '1000-4500',
    durationRange: '5-15s',
    resolutions: ['720p', '1080p'],
    defaultResolution: '1080p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: true,
    tags: ['NEW', 'AUDIO', 'MULTI_SHOTS'],
  },
  'wan-2.5': {
    id: 'wan-2.5',
    apiModelId: 'wan/2.5',
    name: 'Wan 2.5',
    description: 'Estable con audio',
    company: 'wan',
    companyName: 'Wan',
    priceRange: '500-3000',
    durationRange: '5-10s',
    resolutions: ['480p', '1080p'],
    defaultResolution: '1080p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: false,
    tags: ['AUDIO'],
  },
}

// Group models by company for UI
export const VIDEO_COMPANY_GROUPS: VideoCompanyGroup[] = [
  {
    id: 'google',
    name: 'Google',
    icon: 'Sparkles',
    color: 'from-blue-500 to-blue-600',
    models: [
      VIDEO_MODELS['veo-3.1'],
      VIDEO_MODELS['veo-3-fast'],
    ],
  },
  {
    id: 'kuaishou',
    name: 'Kling',
    icon: 'Zap',
    color: 'from-purple-500 to-purple-600',
    models: [
      VIDEO_MODELS['kling-2.6'],
      VIDEO_MODELS['kling-o1'],
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: 'Cpu',
    color: 'from-emerald-500 to-emerald-600',
    models: [
      VIDEO_MODELS['sora-2'],
    ],
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    icon: 'Video',
    color: 'from-orange-500 to-orange-600',
    models: [
      VIDEO_MODELS['hailuo-2.3'],
      VIDEO_MODELS['hailuo-2.3-fast'],
    ],
  },
  {
    id: 'seedance',
    name: 'Seedance',
    icon: 'Film',
    color: 'from-cyan-500 to-cyan-600',
    models: [
      VIDEO_MODELS['seedance-1.5-pro'],
      VIDEO_MODELS['seedance-1.0-fast'],
    ],
  },
  {
    id: 'wan',
    name: 'Wan',
    icon: 'Clapperboard',
    color: 'from-rose-500 to-rose-600',
    models: [
      VIDEO_MODELS['wan-2.6'],
      VIDEO_MODELS['wan-2.5'],
    ],
  },
]

// Helper to get API model ID
export function getVideoApiModelId(modelId: VideoModelId): string {
  return VIDEO_MODELS[modelId]?.apiModelId || modelId
}

// Generation request interface
export interface GenerateVideoRequest {
  modelId: VideoModelId
  prompt: string
  duration?: number // seconds
  resolution?: string
  aspectRatio?: '16:9' | '9:16' | '1:1'
  startImageBase64?: string // First frame
  endImageBase64?: string // Last frame
  referenceImageBase64?: string // Style reference
  enableAudio?: boolean
}

export interface GenerateVideoResult {
  success: boolean
  taskId?: string
  videoUrl?: string
  videoBase64?: string
  mimeType?: string
  status?: 'processing' | 'completed' | 'failed'
  error?: string
  provider?: string
}
