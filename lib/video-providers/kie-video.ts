// KIE.ai Video Provider - All video models go through KIE.ai API
// Docs: https://docs.kie.ai

import {
  VideoModelId,
  GenerateVideoRequest,
  GenerateVideoResult,
  VIDEO_MODELS,
  getVideoApiModelId,
} from './types'

const KIE_API_BASE = 'https://api.kie.ai/api/v1'

/**
 * Convert standard aspect ratio to Sora format
 * Sora uses "landscape" / "portrait" instead of "16:9" / "9:16"
 */
function convertAspectRatioForSora(aspectRatio: string | undefined): string {
  switch (aspectRatio) {
    case '9:16':
      return 'portrait'
    case '1:1':
      return 'landscape' // Sora doesn't have 1:1, default to landscape
    case '16:9':
    default:
      return 'landscape'
  }
}

/**
 * Convert resolution for Hailuo format
 * Hailuo uses "768P" / "1080P" (uppercase P)
 */
function convertResolutionForHailuo(resolution: string | undefined): string {
  switch (resolution) {
    case '1080p':
    case '1080P':
      return '1080P'
    case '768p':
    case '768P':
    default:
      return '768P'
  }
}

/**
 * Generate video using KIE.ai API
 * 
 * Important:
 * - Veo models use different endpoint: /api/v1/veo/generate
 * - Other models use: /api/v1/jobs/createTask
 * - Images must be public URLs (not base64)
 */
export async function generateVideo(
  request: GenerateVideoRequest,
  apiKey: string
): Promise<GenerateVideoResult> {
  try {
    const modelConfig = VIDEO_MODELS[request.modelId]
    if (!modelConfig) {
      throw new Error(`Unknown video model: ${request.modelId}`)
    }

    const hasImage = !!(request.imageUrls && request.imageUrls.length > 0)
    const apiModelId = getVideoApiModelId(request.modelId, hasImage)

    console.log(`[Video] Model: ${request.modelId} -> API model: ${apiModelId}`)
    console.log(`[Video] Has image: ${hasImage}`)

    // Veo models use different endpoint
    if (modelConfig.useVeoEndpoint) {
      return await generateVeoVideo(request, apiKey, apiModelId)
    }

    // Standard models use createTask endpoint
    return await generateStandardVideo(request, apiKey, apiModelId, modelConfig)

  } catch (error: any) {
    console.error('[Video] Error:', error.message)
    return {
      success: false,
      error: error.message || 'Video generation failed',
      provider: 'kie',
    }
  }
}

/**
 * Generate video with Veo 3.1 (special endpoint)
 * Endpoint: POST /api/v1/veo/generate
 * 
 * From docs:
 * - model: "veo3" or "veo3_fast"
 * - aspect_ratio: "16:9", "9:16", or "Auto"
 * - generationType: TEXT_2_VIDEO, FIRST_AND_LAST_FRAMES_2_VIDEO, REFERENCE_2_VIDEO
 * - imageUrls: array of public URLs
 */
async function generateVeoVideo(
  request: GenerateVideoRequest,
  apiKey: string,
  model: string
): Promise<GenerateVideoResult> {
  const body: Record<string, any> = {
    model: model, // veo3 or veo3_fast
    prompt: request.prompt,
    aspect_ratio: request.aspectRatio || '16:9', // Veo uses "16:9", "9:16", "Auto"
    enableTranslation: true,
  }

  // Determine generation type based on images
  if (request.imageUrls && request.imageUrls.length > 0) {
    body.imageUrls = request.imageUrls
    // 1 or 2 images: first/last frame mode
    body.generationType = 'FIRST_AND_LAST_FRAMES_2_VIDEO'
  } else {
    body.generationType = 'TEXT_2_VIDEO'
  }

  console.log('[Video/Veo] Request:', JSON.stringify({
    ...body,
    prompt: body.prompt?.substring(0, 50) + '...',
    imageUrls: body.imageUrls ? `[${body.imageUrls.length} URLs]` : undefined,
  }))

  const response = await fetch(`${KIE_API_BASE}/veo/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const responseText = await response.text()
  console.log('[Video/Veo] Response:', response.status, responseText.substring(0, 500))

  let data: any
  try {
    data = JSON.parse(responseText)
  } catch (e) {
    throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`)
  }

  if (data.code !== 200) {
    throw new Error(`Veo API error: ${data.msg || data.message || JSON.stringify(data)}`)
  }

  const taskId = data.data?.taskId
  if (!taskId) {
    throw new Error(`No taskId in Veo response`)
  }

  return {
    success: true,
    taskId: taskId,
    status: 'processing',
    provider: 'kie-veo',
  }
}

/**
 * Generate video with standard models (Sora, Kling, Hailuo, Wan, Seedance)
 * Endpoint: POST /api/v1/jobs/createTask
 * 
 * IMPORTANT: Different models have different parameter requirements:
 * 
 * IMAGE FIELD NAMES:
 * - Kling 2.6: image_urls (array)
 * - Sora 2: image_urls (array)
 * - Kling v2.5 Turbo: image_url (singular string)
 * - Hailuo: image_url (singular string)
 * - Wan: image_url (singular)
 * - Seedance: image_url (singular)
 * 
 * ASPECT RATIO:
 * - Sora 2: "landscape" / "portrait" (NOT "16:9" / "9:16"!)
 * - Others: "16:9", "9:16", "1:1"
 * 
 * DURATION:
 * - Kling: duration as STRING ("5" or "10")
 * - Sora: n_frames as STRING ("10" or "15")
 * - Hailuo: duration as STRING ("6" or "10")
 * - Others: duration as number
 * 
 * RESOLUTION:
 * - Hailuo: "768P" / "1080P" (uppercase P)
 * - Others: "720p", "1080p"
 * 
 * AUDIO:
 * - Kling 2.6: sound (boolean) - REQUIRED
 * - Wan/Seedance: enable_audio (boolean)
 * - Kling v2.5/Hailuo: no audio support
 */
async function generateStandardVideo(
  request: GenerateVideoRequest,
  apiKey: string,
  model: string,
  modelConfig: any
): Promise<GenerateVideoResult> {
  // Build input object
  const input: Record<string, any> = {
    prompt: request.prompt,
  }

  // Model type detection
  const isKling26 = request.modelId === 'kling-2.6'
  const isKlingV25 = request.modelId === 'kling-v25-turbo'
  const isKling = request.modelId.startsWith('kling')
  const isSora = request.modelId === 'sora-2'
  const isWan = request.modelId.startsWith('wan')
  const isHailuo = request.modelId.startsWith('hailuo')
  const isSeedance = request.modelId.startsWith('seedance')

  // Image URLs - DIFFERENT MODELS USE DIFFERENT FIELD NAMES!
  if (request.imageUrls && request.imageUrls.length > 0) {
    if (isKling26 || isSora) {
      // Kling 2.6 and Sora 2 use image_urls (plural array)
      input.image_urls = request.imageUrls
    } else if (isKlingV25) {
      // Kling v2.5 Turbo uses image_url (SINGULAR string!)
      input.image_url = request.imageUrls[0]
      // Also supports tail_image_url for end frame
      if (request.imageUrls.length > 1) {
        input.tail_image_url = request.imageUrls[1]
      }
    } else if (isHailuo) {
      // Hailuo uses image_url (singular)
      input.image_url = request.imageUrls[0]
    } else {
      // Wan, Seedance, others - use singular image_url
      input.image_url = request.imageUrls[0]
    }
  }

  // Aspect ratio - SORA USES DIFFERENT FORMAT!
  if (request.aspectRatio) {
    if (isSora) {
      // Sora uses "landscape" / "portrait" instead of "16:9" / "9:16"
      input.aspect_ratio = convertAspectRatioForSora(request.aspectRatio)
    } else {
      input.aspect_ratio = request.aspectRatio
    }
  }

  // Duration - model specific handling
  if (request.duration) {
    if (isSora) {
      // Sora uses n_frames as string ("10" or "15")
      input.n_frames = request.duration.toString()
    } else if (isKling || isHailuo) {
      // Kling and Hailuo REQUIRE duration as STRING
      input.duration = request.duration.toString()
    } else {
      // Other models use duration as number or string
      input.duration = request.duration
    }
  }

  // Audio parameter - different names for different models
  if (isKling26) {
    // Kling 2.6 uses "sound" (boolean) - THIS IS REQUIRED!
    input.sound = request.enableAudio ?? false
  } else if (isWan || isSeedance) {
    // Wan and Seedance may use different audio params
    if (modelConfig.supportsAudio) {
      input.enable_audio = request.enableAudio ?? false
    }
  }
  // Note: Kling v2.5, Hailuo, and Sora don't need audio param (or handle it differently)

  // Resolution - ONLY if model accepts it
  // Some models like Kling v2.5 Turbo don't accept resolution parameter
  if (request.resolution && !modelConfig.noResolutionParam) {
    if (isHailuo) {
      // Hailuo uses "768P" / "1080P" (uppercase P)
      input.resolution = convertResolutionForHailuo(request.resolution)
    } else {
      input.resolution = request.resolution
    }
  }

  // Kling v2.5 specific params
  if (isKlingV25) {
    // Default cfg_scale for better results
    input.cfg_scale = 0.5
    // Optional: negative prompt for quality
    input.negative_prompt = 'blur, distort, low quality'
  }

  // Watermark removal (if available)
  input.remove_watermark = true

  console.log('[Video] Request:', JSON.stringify({
    model,
    input: {
      ...input,
      prompt: input.prompt?.substring(0, 50) + '...',
      image_url: input.image_url ? '[URL present]' : undefined,
      image_urls: input.image_urls ? `[${input.image_urls.length} URLs]` : undefined,
    },
  }))

  const response = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      input: input,
    }),
  })

  const responseText = await response.text()
  console.log('[Video] Response:', response.status, responseText.substring(0, 500))

  let data: any
  try {
    data = JSON.parse(responseText)
  } catch (e) {
    throw new Error(`Invalid JSON: ${responseText.substring(0, 200)}`)
  }

  if (data.code !== 200 && data.code !== 0) {
    throw new Error(`KIE API error: ${data.msg || data.message || JSON.stringify(data)}`)
  }

  const taskId = data.data?.taskId || data.taskId
  if (!taskId) {
    throw new Error(`No taskId in response`)
  }

  return {
    success: true,
    taskId: taskId,
    status: 'processing',
    provider: 'kie',
  }
}

/**
 * Check video generation status
 */
export async function checkVideoStatus(
  taskId: string,
  apiKey: string
): Promise<GenerateVideoResult> {
  try {
    const response = await fetch(`${KIE_API_BASE}/jobs/recordInfo?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`)
    }

    const data = await response.json()
    const taskData = data.data || data
    const state = taskData.state || ''

    console.log('[Video] Status:', state, '| Data:', JSON.stringify(taskData).substring(0, 200))

    // Processing states
    if (['waiting', 'queuing', 'generating', 'processing', 'running', 'pending'].includes(state)) {
      return {
        success: true,
        taskId: taskId,
        status: 'processing',
        provider: 'kie',
      }
    }

    // Failed states
    if (['fail', 'failed', 'error'].includes(state)) {
      return {
        success: false,
        error: taskData.failMsg || taskData.failCode || 'Video generation failed',
        provider: 'kie',
      }
    }

    // Success - extract video URL
    if (state === 'success' || state === 'completed') {
      let videoUrl: string | undefined

      // Try to get video URL from various fields
      if (taskData.resultJson) {
        try {
          const result = typeof taskData.resultJson === 'string'
            ? JSON.parse(taskData.resultJson)
            : taskData.resultJson

          // Different models return URL in different fields
          videoUrl = result.videoUrl ||
                     result.video_url ||
                     result.resultUrls?.[0] ||
                     result.videos?.[0] ||
                     result.url ||
                     result.output?.url
        } catch (e) {
          console.error('[Video] Failed to parse resultJson:', e)
        }
      }

      // Also check direct fields on taskData
      if (!videoUrl) {
        videoUrl = taskData.videoUrl || taskData.video_url || taskData.resultUrl
      }

      if (videoUrl) {
        return {
          success: true,
          videoUrl: videoUrl,
          status: 'completed',
          provider: 'kie',
        }
      }

      // Have success state but no URL - might still be processing
      console.log('[Video] Success state but no URL found, returning as completed without URL')
      return {
        success: false,
        error: 'Video completed but URL not found',
        provider: 'kie',
      }
    }

    // If state is empty or undefined, task might still be initializing
    if (!state) {
      return {
        success: true,
        taskId: taskId,
        status: 'processing',
        provider: 'kie',
      }
    }

    return {
      success: false,
      error: `Unknown status: ${state}`,
      provider: 'kie',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Status check failed',
      provider: 'kie',
    }
  }
}

/**
 * Poll for video result with timeout
 */
export async function pollForVideoResult(
  taskId: string,
  apiKey: string,
  options: {
    maxAttempts?: number
    intervalMs?: number
    timeoutMs?: number
  } = {}
): Promise<GenerateVideoResult> {
  const maxAttempts = options.maxAttempts || 300
  const intervalMs = options.intervalMs || 3000 // 3 seconds
  const timeoutMs = options.timeoutMs || 600000 // 10 minutes

  const startTime = Date.now()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (Date.now() - startTime > timeoutMs) {
      return {
        success: false,
        error: 'Video generation timed out',
        provider: 'kie',
      }
    }

    const result = await checkVideoStatus(taskId, apiKey)

    if (result.status === 'completed' || !result.success) {
      return result
    }

    // Still processing
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  return {
    success: false,
    error: 'Max polling attempts reached',
    provider: 'kie',
  }
}
