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

    const hasImage = request.imageUrls && request.imageUrls.length > 0
    const apiModelId = getVideoApiModelId(request.modelId, hasImage)

    console.log(`[Video] Model: ${request.modelId} -> API model: ${apiModelId}`)
    console.log(`[Video] Has image: ${hasImage}`)

    // Veo models use different endpoint
    if (modelConfig.useVeoEndpoint) {
      return await generateVeoVideo(request, apiKey, apiModelId)
    }

    // Standard models use createTask endpoint
    return await generateStandardVideo(request, apiKey, apiModelId)

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
 */
async function generateVeoVideo(
  request: GenerateVideoRequest,
  apiKey: string,
  model: string
): Promise<GenerateVideoResult> {
  const body: Record<string, any> = {
    model: model, // veo3 or veo3_fast
    prompt: request.prompt,
    aspect_ratio: request.aspectRatio || '16:9',
    enableTranslation: true,
  }

  // Image-to-video
  if (request.imageUrls && request.imageUrls.length > 0) {
    body.imageUrls = request.imageUrls
    // If 2 images: first frame and last frame
    if (request.imageUrls.length === 2) {
      body.generationType = 'FIRST_AND_LAST_FRAMES_2_VIDEO'
    }
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
 */
async function generateStandardVideo(
  request: GenerateVideoRequest,
  apiKey: string,
  model: string
): Promise<GenerateVideoResult> {
  const modelConfig = VIDEO_MODELS[request.modelId]

  // Build input object
  const input: Record<string, any> = {
    prompt: request.prompt,
  }

  // Image URLs (must be public)
  if (request.imageUrls && request.imageUrls.length > 0) {
    input.image_urls = request.imageUrls
  }

  // Aspect ratio
  if (request.aspectRatio) {
    input.aspect_ratio = request.aspectRatio === '9:16' ? 'portrait' : 'landscape'
  }

  // Duration - model specific
  if (request.duration) {
    // Sora uses n_frames
    if (request.modelId === 'sora-2') {
      input.n_frames = request.duration.toString()
    } else {
      input.duration = request.duration
    }
  }

  // Resolution
  if (request.resolution) {
    input.resolution = request.resolution
  }

  // Watermark removal (if available)
  input.remove_watermark = true

  console.log('[Video] Request:', JSON.stringify({
    model,
    input: {
      ...input,
      prompt: input.prompt?.substring(0, 50) + '...',
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
    const state = taskData.state

    console.log('[Video] Status:', state)

    // Processing states
    if (['waiting', 'queuing', 'generating', 'processing'].includes(state)) {
      return {
        success: true,
        taskId: taskId,
        status: 'processing',
        provider: 'kie',
      }
    }

    // Failed
    if (state === 'fail' || state === 'failed') {
      return {
        success: false,
        error: taskData.failMsg || taskData.failCode || 'Video generation failed',
        provider: 'kie',
      }
    }

    // Success - extract video URL
    if (state === 'success') {
      let videoUrl: string | undefined

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
                     result.url
        } catch (e) {
          console.error('[Video] Failed to parse resultJson:', e)
        }
      }

      if (videoUrl) {
        return {
          success: true,
          videoUrl: videoUrl,
          status: 'completed',
          provider: 'kie',
        }
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
