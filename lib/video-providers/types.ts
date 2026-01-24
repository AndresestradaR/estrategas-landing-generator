// Video Provider Types for Estudio IA
// Prices from KIE.ai (January 2026)

export type VideoProviderCompany = 'google' | 'kuaishou' | 'openai' | 'minimax' | 'seedance' | 'wan'

export type VideoModelId =
  // Google Veo
  | 'veo-3.1'
  | 'veo-3-fast'
  // Kling (Kuaishou)
  | 'kling-2.6'
  | 'kling-v25-turbo'
  // OpenAI Sora
  | 'sora-2-pro'
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

export type VideoModelTag = 'NEW' | 'FAST' | 'PREMIUM' | 'AUDIO' | 'REFERENCES' | 'MULTI_SHOTS' | 'RECOMENDADO' | 'IMG2VID'

export interface VideoModelConfig {
  id: VideoModelId
  apiModelId: string // KIE.ai model identifier
  name: string
  description: string
  company: VideoProviderCompany
  companyName: string
  priceRange: string // USD price range
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

// Video Model Definitions - Prices from KIE.ai
export const VIDEO_MODELS: Record<VideoModelId, VideoModelConfig> = {
  // ============ GOOGLE VEO ============
  'veo-3.1': {
    id: 'veo-3.1',
    apiModelId: 'google/veo-3.1',
    name: 'Google Veo 3.1',
    description: 'Flagship con referencias, audio y 4K',
    company: 'google',
    companyName: 'Google',
    priceRange: '$0.55-1.10',
    durationRange: '5-10s',
    resolutions: ['720p', '1080p'],
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
    priceRange: '$0.28-0.55',
    durationRange: '5-10s',
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
    apiModelId: 'kling/v2-6-pro',
    name: 'Kling 2.6',
    description: 'Último modelo, muy económico',
    company: 'kuaishou',
    companyName: 'Kling',
    priceRange: '$0.08-0.36',
    durationRange: '5-10s',
    resolutions: ['720p', '1080p'],
    defaultResolution: '1080p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: false,
    tags: ['NEW', 'AUDIO', 'RECOMENDADO'],
    recommended: true,
  },
  'kling-v25-turbo': {
    id: 'kling-v25-turbo',
    apiModelId: 'kling/v2-5-turbo-image-to-video-pro',
    name: 'Kling V2.5 Turbo',
    description: 'Image-to-video profesional',
    company: 'kuaishou',
    companyName: 'Kling',
    priceRange: '$0.21-0.42',
    durationRange: '5-10s',
    resolutions: ['720p', '1080p'],
    defaultResolution: '1080p',
    supportsAudio: false,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: false,
    tags: ['IMG2VID'],
  },

  // ============ OPENAI SORA ============
  'sora-2-pro': {
    id: 'sora-2-pro',
    apiModelId: 'openai/sora-2-pro',
    name: 'Sora 2 Pro',
    description: 'Máxima calidad de OpenAI',
    company: 'openai',
    companyName: 'OpenAI',
    priceRange: '$0.75-1.35',
    durationRange: '10-15s',
    resolutions: ['720p', '1080p'],
    defaultResolution: '1080p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: false,
    tags: ['PREMIUM', 'AUDIO'],
  },
  'sora-2': {
    id: 'sora-2',
    apiModelId: 'openai/sora-2-image-to-video',
    name: 'Sora 2',
    description: 'Image-to-video de OpenAI',
    company: 'openai',
    companyName: 'OpenAI',
    priceRange: '$0.15',
    durationRange: '10s',
    resolutions: ['720p'],
    defaultResolution: '720p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: false,
    tags: ['AUDIO', 'IMG2VID', 'RECOMENDADO'],
    recommended: true,
  },

  // ============ MINIMAX HAILUO ============
  'hailuo-2.3': {
    id: 'hailuo-2.3',
    apiModelId: 'minimax/hailuo-2.3',
    name: 'Hailuo 2.3',
    description: 'Buena calidad, precio competitivo',
    company: 'minimax',
    companyName: 'MiniMax',
    priceRange: '$0.15-0.45',
    durationRange: '6-10s',
    resolutions: ['768p', '1080p'],
    defaultResolution: '768p',
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
    description: 'Rápido y muy económico',
    company: 'minimax',
    companyName: 'MiniMax',
    priceRange: '$0.15-0.26',
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
    priceRange: '$1.25',
    durationRange: '4-12s',
    resolutions: ['1080p'],
    defaultResolution: '1080p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMultiShots: true,
    tags: ['AUDIO', 'MULTI_SHOTS'],
  },
  'seedance-1.0-fast': {
    id: 'seedance-1.0-fast',
    apiModelId: 'seedance/1.0-fast',
    name: 'Seedance 1.0 Fast',
    description: 'Muy económico',
    company: 'seedance',
    companyName: 'Seedance',
    priceRange: '$0.30',
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
    priceRange: '$0.35-1.58',
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
    description: '$0.06/s en 720p, $0.10/s en 1080p',
    company: 'wan',
    companyName: 'Wan',
    priceRange: '$0.30-1.00',
    durationRange: '5-10s',
    resolutions: ['720p', '1080p'],
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
      VIDEO_MODELS['kling-v25-turbo'],
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: 'Cpu',
    color: 'from-emerald-500 to-emerald-600',
    models: [
      VIDEO_MODELS['sora-2'],
      VIDEO_MODELS['sora-2-pro'],
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
