// Video Provider Types for Estudio IA

export type VideoProviderCompany = 'google' | 'kuaishou' | 'openai' | 'minimax' | 'runway'

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
  // Runway
  | 'runway-gen4'
  | 'runway-act-two'

export type VideoModelTag = 'NEW' | 'FAST' | 'PREMIUM' | 'AUDIO' | 'REFERENCES' | 'MOTION_CONTROL' | 'RECOMENDADO'

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
  supportsMotionControl: boolean
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
    description: 'Flagship video model with references and 4K support',
    company: 'google',
    companyName: 'Google',
    priceRange: '800-2400 credits',
    durationRange: '4-8s',
    resolutions: ['720p', '1080p', '4K'],
    defaultResolution: '1080p',
    supportsAudio: true,
    supportsReferences: true,
    supportsStartEndFrames: true,
    supportsMotionControl: false,
    tags: ['PREMIUM', 'AUDIO', 'REFERENCES'],
    recommended: true,
  },
  'veo-3-fast': {
    id: 'veo-3-fast',
    apiModelId: 'google/veo-3-fast',
    name: 'Google Veo 3 Fast',
    description: 'Fast generation with audio support',
    company: 'google',
    companyName: 'Google',
    priceRange: '400-960 credits',
    durationRange: '4-8s',
    resolutions: ['720p', '1080p'],
    defaultResolution: '720p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: true,
    supportsMotionControl: false,
    tags: ['FAST', 'AUDIO'],
  },

  // ============ KLING (KUAISHOU) ============
  'kling-2.6': {
    id: 'kling-2.6',
    apiModelId: 'kling/2.6',
    name: 'Kling 2.6',
    description: 'Latest Kling with audio generation',
    company: 'kuaishou',
    companyName: 'Kuaishou',
    priceRange: '225-800 credits',
    durationRange: '5-10s',
    resolutions: ['1080p'],
    defaultResolution: '1080p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: false,
    supportsMotionControl: false,
    tags: ['NEW', 'AUDIO'],
    recommended: true,
  },
  'kling-o1': {
    id: 'kling-o1',
    apiModelId: 'kling/o1',
    name: 'Kling O1',
    description: 'Reference-based video generation',
    company: 'kuaishou',
    companyName: 'Kuaishou',
    priceRange: '225-1500 credits',
    durationRange: '3-10s',
    resolutions: ['720p', '1080p'],
    defaultResolution: '1080p',
    supportsAudio: false,
    supportsReferences: true,
    supportsStartEndFrames: true,
    supportsMotionControl: false,
    tags: ['NEW', 'REFERENCES'],
  },

  // ============ OPENAI SORA ============
  'sora-2': {
    id: 'sora-2',
    apiModelId: 'openai/sora-2',
    name: 'OpenAI Sora 2',
    description: 'OpenAI\'s flagship video generation',
    company: 'openai',
    companyName: 'OpenAI',
    priceRange: '800-2400 credits',
    durationRange: '4-12s',
    resolutions: ['720p'],
    defaultResolution: '720p',
    supportsAudio: true,
    supportsReferences: false,
    supportsStartEndFrames: false,
    supportsMotionControl: false,
    tags: ['PREMIUM', 'AUDIO'],
    recommended: true,
  },

  // ============ MINIMAX HAILUO ============
  'hailuo-2.3': {
    id: 'hailuo-2.3',
    apiModelId: 'minimax/hailuo-2.3',
    name: 'MiniMax Hailuo 2.3',
    description: 'High quality video at competitive price',
    company: 'minimax',
    companyName: 'MiniMax',
    priceRange: '360-600 credits',
    durationRange: '6-10s',
    resolutions: ['768p', '1080p'],
    defaultResolution: '1080p',
    supportsAudio: false,
    supportsReferences: false,
    supportsStartEndFrames: false,
    supportsMotionControl: false,
    tags: ['RECOMENDADO'],
    recommended: true,
  },
  'hailuo-2.3-fast': {
    id: 'hailuo-2.3-fast',
    apiModelId: 'minimax/hailuo-2.3-fast',
    name: 'MiniMax Hailuo 2.3 Fast',
    description: 'Fast generation, great for testing',
    company: 'minimax',
    companyName: 'MiniMax',
    priceRange: '150-430 credits',
    durationRange: '6-10s',
    resolutions: ['768p', '1080p'],
    defaultResolution: '768p',
    supportsAudio: false,
    supportsReferences: false,
    supportsStartEndFrames: false,
    supportsMotionControl: false,
    tags: ['FAST'],
  },

  // ============ RUNWAY ============
  'runway-gen4': {
    id: 'runway-gen4',
    apiModelId: 'runway/gen-4',
    name: 'Runway Gen 4',
    description: 'Industry standard video generation',
    company: 'runway',
    companyName: 'Runway',
    priceRange: '500-1000 credits',
    durationRange: '5-10s',
    resolutions: ['720p'],
    defaultResolution: '720p',
    supportsAudio: false,
    supportsReferences: false,
    supportsStartEndFrames: false,
    supportsMotionControl: false,
    tags: ['PREMIUM'],
  },
  'runway-act-two': {
    id: 'runway-act-two',
    apiModelId: 'runway/act-two',
    name: 'Runway Act Two',
    description: 'Motion control for precise animation',
    company: 'runway',
    companyName: 'Runway',
    priceRange: '300-3000 credits',
    durationRange: '3-30s',
    resolutions: ['720p'],
    defaultResolution: '720p',
    supportsAudio: false,
    supportsReferences: false,
    supportsStartEndFrames: false,
    supportsMotionControl: true,
    tags: ['MOTION_CONTROL'],
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
    icon: 'Image',
    color: 'from-orange-500 to-orange-600',
    models: [
      VIDEO_MODELS['hailuo-2.3'],
      VIDEO_MODELS['hailuo-2.3-fast'],
    ],
  },
  {
    id: 'runway',
    name: 'Runway',
    icon: 'Film',
    color: 'from-pink-500 to-pink-600',
    models: [
      VIDEO_MODELS['runway-gen4'],
      VIDEO_MODELS['runway-act-two'],
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
