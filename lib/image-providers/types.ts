// Types for multi-model image generation system

// Provider types (companies)
export type ImageProviderCompany = 'google' | 'openai' | 'bytedance' | 'bfl'

// Specific model IDs
export type ImageModelId =
  // Google (2 models only)
  | 'gemini-3-pro-image'
  | 'gemini-2.5-flash'
  // OpenAI (1 model only - GPT Image 1.5)
  | 'gpt-image-1.5'
  // ByteDance via KIE.ai (4 models)
  | 'seedream-4.5'
  | 'seedream-4'
  | 'seedream-4-4k'
  | 'seedream-3'
  // Black Forest Labs FLUX (10 models)
  | 'flux-2-max'
  | 'flux-2-klein'
  | 'flux-2-pro'
  | 'flux-2-flex'
  | 'flux-1-kontext-max'
  | 'flux-1-kontext-pro'
  | 'flux-1'
  | 'flux-1-fast'
  | 'flux-1-realism'
  | 'flux-1.1'

// Legacy type for backward compatibility
export type ImageProviderType = 'gemini' | 'openai' | 'seedream' | 'flux'

export type ModelTag = 'NEW' | 'TRENDING' | 'FAST' | 'PREMIUM' | 'BEST_TEXT' | 'HD' | '4K' | 'RECOMENDADO'

export interface ImageModelConfig {
  id: ImageModelId
  name: string
  description: string
  company: ImageProviderCompany
  companyName: string
  supportsImageInput: boolean
  supportsAspectRatio: boolean
  maxImages: number
  requiresPolling: boolean
  pricePerImage: string
  recommended?: boolean
  tags?: ModelTag[]
  // The actual API model ID to use when calling the provider
  apiModelId: string
}

export interface ImageCompanyGroup {
  id: ImageProviderCompany
  name: string
  icon: string
  color: string
  models: ImageModelConfig[]
}

// All available models with full configuration
export const IMAGE_MODELS: Record<ImageModelId, ImageModelConfig> = {
  // ============================================
  // GOOGLE (2 models only)
  // ============================================
  'gemini-3-pro-image': {
    id: 'gemini-3-pro-image',
    name: 'Gemini 3 Pro Image',
    description: 'Mejor calidad, texto perfecto, resolucion 4K',
    company: 'google',
    companyName: 'Google',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: false,
    pricePerImage: '~$0.04',
    recommended: true,
    tags: ['RECOMENDADO', 'BEST_TEXT', 'PREMIUM', 'NEW'],
    apiModelId: 'gemini-3-pro-image-preview',
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash Image',
    description: 'Rapido y economico - $0.039/imagen',
    company: 'google',
    companyName: 'Google',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: false,
    pricePerImage: '~$0.039',
    recommended: false,
    tags: ['FAST'],
    apiModelId: 'gemini-2.5-flash-image',
  },

  // ============================================
  // OPENAI (1 model only - GPT Image 1.5)
  // ============================================
  'gpt-image-1.5': {
    id: 'gpt-image-1.5',
    name: 'GPT Image 1.5',
    description: 'Ultima version - Mejor calidad general',
    company: 'openai',
    companyName: 'OpenAI',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: false,
    pricePerImage: '~$0.04',
    recommended: true,
    tags: ['RECOMENDADO', 'NEW', 'TRENDING'],
    apiModelId: 'gpt-image-1.5',
  },

  // ============================================
  // BYTEDANCE via KIE.ai (4 models)
  // KIE.ai model names: https://docs.kie.ai/market/seedream/
  // ============================================
  'seedream-4.5': {
    id: 'seedream-4.5',
    name: 'Seedream 4.5',
    description: 'Highly aesthetic multi-image',
    company: 'bytedance',
    companyName: 'ByteDance',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 6,
    requiresPolling: true,
    pricePerImage: '~$0.032',
    recommended: true,
    tags: ['RECOMENDADO', 'TRENDING'],
    // KIE.ai uses: seedream/4.5-text-to-image or seedream/4.5-edit
    apiModelId: 'seedream/4.5-text-to-image',
  },
  'seedream-4': {
    id: 'seedream-4',
    name: 'Seedream 4',
    description: 'Multi-image generation and editing',
    company: 'bytedance',
    companyName: 'ByteDance',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 6,
    requiresPolling: true,
    pricePerImage: '~$0.03',
    tags: [],
    // KIE.ai uses: bytedance/seedream-v4-text-to-image or bytedance/seedream-v4-edit
    apiModelId: 'bytedance/seedream-v4-text-to-image',
  },
  'seedream-4-4k': {
    id: 'seedream-4-4k',
    name: 'Seedream 4 4K',
    description: '4K with reference images',
    company: 'bytedance',
    companyName: 'ByteDance',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 4,
    requiresPolling: true,
    pricePerImage: '~$0.04',
    tags: ['4K'],
    // Same as seedream-4 but with 4K resolution
    apiModelId: 'bytedance/seedream-v4-text-to-image',
  },
  'seedream-3': {
    id: 'seedream-3',
    name: 'Seedream 3',
    description: 'Exceptional creativity',
    company: 'bytedance',
    companyName: 'ByteDance',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 6,
    requiresPolling: true,
    pricePerImage: '~$0.02',
    tags: [],
    // KIE.ai uses: bytedance/seedream-3.0
    apiModelId: 'bytedance/seedream-3.0',
  },

  // ============================================
  // BLACK FOREST LABS FLUX (10 models)
  // ============================================
  'flux-2-max': {
    id: 'flux-2-max',
    name: 'Flux.2 Max',
    description: 'Advanced editing, maximum quality',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.08',
    tags: ['PREMIUM'],
    apiModelId: 'flux-2-max',
  },
  'flux-2-klein': {
    id: 'flux-2-klein',
    name: 'Flux 2 Klein',
    description: 'Fast with high quality',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: false,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.02',
    tags: ['NEW', 'FAST'],
    apiModelId: 'flux-2-klein',
  },
  'flux-2-pro': {
    id: 'flux-2-pro',
    name: 'Flux.2 Pro',
    description: 'Next-gen editing and generation',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.05',
    recommended: true,
    tags: ['RECOMENDADO', 'NEW'],
    apiModelId: 'flux-2-pro',
  },
  'flux-2-flex': {
    id: 'flux-2-flex',
    name: 'Flux.2 Flex',
    description: 'Typography support',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.05',
    tags: ['NEW'],
    apiModelId: 'flux-2-flex',
  },
  'flux-1-kontext-max': {
    id: 'flux-1-kontext-max',
    name: 'Flux.1 Kontext Max',
    description: 'Best for pros with reference images',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.05',
    tags: [],
    apiModelId: 'flux-kontext-max',
  },
  'flux-1-kontext-pro': {
    id: 'flux-1-kontext-pro',
    name: 'Flux.1 Kontext Pro',
    description: 'Daily use, reference images',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.04',
    tags: [],
    apiModelId: 'flux-kontext-pro',
  },
  'flux-1': {
    id: 'flux-1',
    name: 'Flux.1',
    description: 'Base model',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: false,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.01',
    tags: [],
    apiModelId: 'flux-dev',
  },
  'flux-1-fast': {
    id: 'flux-1-fast',
    name: 'Flux.1 Fast',
    description: '<1s generations',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: false,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.01',
    tags: ['FAST'],
    apiModelId: 'flux-schnell',
  },
  'flux-1-realism': {
    id: 'flux-1-realism',
    name: 'Flux.1 Realism',
    description: 'Photorealism only',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: false,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.03',
    tags: [],
    apiModelId: 'flux-realism',
  },
  'flux-1.1': {
    id: 'flux-1.1',
    name: 'Flux.1.1',
    description: 'Improved base',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: false,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.02',
    tags: [],
    apiModelId: 'flux-pro-1.1',
  },
}

// Grouped by company for hierarchical selector
export const IMAGE_COMPANY_GROUPS: ImageCompanyGroup[] = [
  {
    id: 'google',
    name: 'Google',
    icon: 'Sparkles',
    color: 'from-blue-500 to-purple-500',
    models: [
      IMAGE_MODELS['gemini-3-pro-image'],
      IMAGE_MODELS['gemini-2.5-flash'],
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: 'Zap',
    color: 'from-green-500 to-emerald-500',
    models: [
      IMAGE_MODELS['gpt-image-1.5'],
    ],
  },
  {
    id: 'bytedance',
    name: 'ByteDance',
    icon: 'Image',
    color: 'from-orange-500 to-red-500',
    models: [
      IMAGE_MODELS['seedream-4.5'],
      IMAGE_MODELS['seedream-4'],
      IMAGE_MODELS['seedream-4-4k'],
      IMAGE_MODELS['seedream-3'],
    ],
  },
  {
    id: 'bfl',
    name: 'Black Forest Labs',
    icon: 'Cpu',
    color: 'from-pink-500 to-rose-500',
    models: [
      IMAGE_MODELS['flux-2-max'],
      IMAGE_MODELS['flux-2-klein'],
      IMAGE_MODELS['flux-2-pro'],
      IMAGE_MODELS['flux-2-flex'],
      IMAGE_MODELS['flux-1-kontext-max'],
      IMAGE_MODELS['flux-1-kontext-pro'],
      IMAGE_MODELS['flux-1'],
      IMAGE_MODELS['flux-1-fast'],
      IMAGE_MODELS['flux-1-realism'],
      IMAGE_MODELS['flux-1.1'],
    ],
  },
]

// Legacy providers for backward compatibility
export interface ImageProviderConfig {
  id: ImageProviderType
  name: string
  description: string
  supportsImageInput: boolean
  supportsAspectRatio: boolean
  maxImages: number
  requiresPolling: boolean
}

export const IMAGE_PROVIDERS: Record<ImageProviderType, ImageProviderConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Gemini 3 Pro Image',
    description: 'Google Gemini - Mejor calidad y texto perfecto',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: false,
  },
  openai: {
    id: 'openai',
    name: 'GPT Image 1.5',
    description: 'OpenAI GPT Image - Alta calidad general',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: false,
  },
  seedream: {
    id: 'seedream',
    name: 'Seedream 4.5',
    description: 'ByteDance Seedream - Excelente para edicion',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 6,
    requiresPolling: true,
  },
  flux: {
    id: 'flux',
    name: 'FLUX 2 Pro',
    description: 'Black Forest Labs - Next-gen generation',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
  },
}

// Map model ID to legacy provider type
export function modelIdToProviderType(modelId: ImageModelId): ImageProviderType {
  const model = IMAGE_MODELS[modelId]
  switch (model.company) {
    case 'google':
      return 'gemini'
    case 'openai':
      return 'openai'
    case 'bytedance':
      return 'seedream'
    case 'bfl':
      return 'flux'
  }
}

// Get API key field name for a model
export function getApiKeyField(modelId: ImageModelId): string {
  const model = IMAGE_MODELS[modelId]
  switch (model.company) {
    case 'google':
      return 'google_api_key'
    case 'openai':
      return 'openai_api_key'
    case 'bytedance':
      return 'kie_api_key'
    case 'bfl':
      return 'bfl_api_key'
  }
}

// Get the API model ID for a given model
export function getApiModelId(modelId: ImageModelId): string {
  return IMAGE_MODELS[modelId].apiModelId
}

export interface GenerateImageRequest {
  provider: ImageProviderType
  // The specific model ID selected by user
  modelId: ImageModelId
  prompt: string
  // Template and product images as base64
  templateBase64?: string
  templateMimeType?: string
  productImagesBase64?: { data: string; mimeType: string }[]
  // Aspect ratio
  aspectRatio?: '9:16' | '1:1' | '16:9' | '4:5' | '4:3' | '3:4' | '3:2' | '2:3'
  // Quality settings
  quality?: 'standard' | 'hd' | '2k' | '4k'
  // Product info for prompt building
  productName?: string
  creativeControls?: {
    productDetails?: string
    salesAngle?: string
    targetAvatar?: string
    additionalInstructions?: string
    // Pricing (all optional)
    priceAfter?: string
    priceBefore?: string
    priceCombo2?: string
    priceCombo3?: string
    currencySymbol?: string
    // Country
    targetCountry?: string
  }
}

export interface GenerateImageResult {
  success: boolean
  imageBase64?: string
  mimeType?: string
  error?: string
  provider: ImageProviderType
  // For async providers
  taskId?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface ImageProvider {
  id: ImageProviderType
  generate(request: GenerateImageRequest, apiKey: string): Promise<GenerateImageResult>
  // For providers that require polling
  checkStatus?(taskId: string, apiKey: string): Promise<GenerateImageResult>
}

// Helper to convert aspect ratio string to dimensions
export function aspectRatioToDimensions(ratio: string): { width: number; height: number } {
  const dimensions: Record<string, { width: number; height: number }> = {
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1024, height: 1024 },
    '16:9': { width: 1920, height: 1080 },
    '4:5': { width: 1080, height: 1350 },
    '4:3': { width: 1024, height: 768 },
    '3:4': { width: 768, height: 1024 },
    '3:2': { width: 1024, height: 683 },
    '2:3': { width: 683, height: 1024 },
  }
  return dimensions[ratio] || dimensions['1:1']
}

// Helper to map aspect ratio to provider-specific formats
export function mapAspectRatioForProvider(ratio: string, provider: ImageProviderType): string {
  // Most providers use the same format
  if (provider === 'seedream') {
    // Seedream 4.5 uses direct aspect_ratio like "1:1", "9:16", etc.
    // Seedream 4.0 uses image_size enum
    // We'll return the direct ratio and let the provider handle it
    return ratio
  }
  return ratio
}
