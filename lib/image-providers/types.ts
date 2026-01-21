// Types for multi-model image generation system

// Provider types (companies)
export type ImageProviderCompany = 'google' | 'openai' | 'bytedance' | 'bfl'

// Specific model IDs (verified via Context7)
export type ImageModelId =
  // Google
  | 'gemini-2.5-flash-image'
  // OpenAI
  | 'gpt-image-1.5'
  | 'gpt-image-1'
  | 'gpt-image-1-mini'
  // ByteDance (via KIE.ai)
  | 'seedream-4.5'
  // Black Forest Labs
  | 'flux-pro-1.1'
  | 'flux-pro-1.1-ultra'
  | 'flux-2-pro'

// Legacy type for backward compatibility
export type ImageProviderType = 'gemini' | 'openai' | 'seedream' | 'flux'

export type ModelTag = 'NEW' | 'TRENDING' | 'FAST' | 'PREMIUM' | 'BEST_TEXT'

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
  // Google
  'gemini-2.5-flash-image': {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash',
    description: 'Mejor para texto legible en banners',
    company: 'google',
    companyName: 'Google',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: false,
    pricePerImage: '~$0.02',
    recommended: true,
    tags: ['BEST_TEXT', 'FAST'],
  },
  // OpenAI
  'gpt-image-1.5': {
    id: 'gpt-image-1.5',
    name: 'GPT Image 1.5',
    description: 'Última versión - Mejor calidad general',
    company: 'openai',
    companyName: 'OpenAI',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: false,
    pricePerImage: '~$0.04',
    recommended: true,
    tags: ['NEW', 'TRENDING'],
  },
  'gpt-image-1': {
    id: 'gpt-image-1',
    name: 'GPT Image 1',
    description: 'Alta calidad fotorealista',
    company: 'openai',
    companyName: 'OpenAI',
    supportsImageInput: true,
    supportsAspectRatio: false,
    maxImages: 1,
    requiresPolling: false,
    pricePerImage: '~$0.04',
  },
  'gpt-image-1-mini': {
    id: 'gpt-image-1-mini',
    name: 'GPT Image 1 Mini',
    description: 'Más rápido y económico',
    company: 'openai',
    companyName: 'OpenAI',
    supportsImageInput: true,
    supportsAspectRatio: false,
    maxImages: 1,
    requiresPolling: false,
    pricePerImage: '~$0.02',
    tags: ['FAST'],
  },
  // ByteDance (KIE.ai)
  'seedream-4.5': {
    id: 'seedream-4.5',
    name: 'Seedream 4.5',
    description: 'Excelente para edición de imágenes',
    company: 'bytedance',
    companyName: 'ByteDance',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 6,
    requiresPolling: true,
    pricePerImage: '~$0.032',
    tags: ['TRENDING'],
  },
  // Black Forest Labs
  'flux-pro-1.1': {
    id: 'flux-pro-1.1',
    name: 'FLUX Pro 1.1',
    description: 'Generación ultra rápida',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: false,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.04',
    tags: ['FAST'],
  },
  'flux-pro-1.1-ultra': {
    id: 'flux-pro-1.1-ultra',
    name: 'FLUX Pro 1.1 Ultra',
    description: 'Máxima calidad FLUX',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: false,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.06',
    tags: ['PREMIUM'],
  },
  'flux-2-pro': {
    id: 'flux-2-pro',
    name: 'FLUX 2 Pro',
    description: 'Nueva generación FLUX',
    company: 'bfl',
    companyName: 'Black Forest Labs',
    supportsImageInput: false,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: true,
    pricePerImage: '~$0.05',
    recommended: true,
    tags: ['NEW'],
  },
}

// Grouped by company for hierarchical selector
export const IMAGE_COMPANY_GROUPS: ImageCompanyGroup[] = [
  {
    id: 'google',
    name: 'Google',
    icon: 'Sparkles',
    color: 'from-blue-500 to-purple-500',
    models: [IMAGE_MODELS['gemini-2.5-flash-image']],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: 'Zap',
    color: 'from-green-500 to-emerald-500',
    models: [
      IMAGE_MODELS['gpt-image-1.5'],
      IMAGE_MODELS['gpt-image-1'],
      IMAGE_MODELS['gpt-image-1-mini'],
    ],
  },
  {
    id: 'bytedance',
    name: 'ByteDance',
    icon: 'Image',
    color: 'from-orange-500 to-red-500',
    models: [IMAGE_MODELS['seedream-4.5']],
  },
  {
    id: 'bfl',
    name: 'Black Forest Labs',
    icon: 'Cpu',
    color: 'from-pink-500 to-rose-500',
    models: [
      IMAGE_MODELS['flux-2-pro'],
      IMAGE_MODELS['flux-pro-1.1'],
      IMAGE_MODELS['flux-pro-1.1-ultra'],
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
    name: 'Gemini 2.5 Flash',
    description: 'Google Gemini - Mejor para texto en imágenes',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: false,
  },
  openai: {
    id: 'openai',
    name: 'GPT Image 1.5',
    description: 'OpenAI GPT Image - Alta calidad fotorealista',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 1,
    requiresPolling: false,
  },
  seedream: {
    id: 'seedream',
    name: 'Seedream 4.5',
    description: 'ByteDance Seedream - Excelente para edición',
    supportsImageInput: true,
    supportsAspectRatio: true,
    maxImages: 6,
    requiresPolling: true,
  },
  flux: {
    id: 'flux',
    name: 'FLUX Pro 1.1',
    description: 'Black Forest Labs - Generación ultra rápida',
    supportsImageInput: false,
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

export interface GenerateImageRequest {
  provider: ImageProviderType
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
    // Seedream uses image_size enum
    const sizeMap: Record<string, string> = {
      '1:1': 'square_hd',
      '4:3': 'landscape_4_3',
      '3:4': 'portrait_4_3',
      '16:9': 'landscape_16_9',
      '9:16': 'portrait_16_9',
      '3:2': 'landscape_3_2',
      '2:3': 'portrait_3_2',
    }
    return sizeMap[ratio] || 'square_hd'
  }
  return ratio
}
