// Types for multi-model image generation system

export type ImageProviderType = 'gemini' | 'openai' | 'seedream' | 'flux'

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
    name: 'GPT Image 1',
    description: 'OpenAI GPT Image - Alta calidad fotorealista',
    supportsImageInput: true,
    supportsAspectRatio: false,
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
    priceAfter?: string
    priceBefore?: string
    currencySymbol?: string
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
