// KIE.ai Video Provider - All video models go through KIE.ai API

import {
  VideoModelId,
  GenerateVideoRequest,
  GenerateVideoResult,
  VIDEO_MODELS,
  getVideoApiModelId,
} from './types'

/**
 * Generate video using KIE.ai API
 * All video models (Veo, Kling, Sora, Hailuo, Runway) are accessed through KIE.ai
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

    const apiModelId = getVideoApiModelId(request.modelId)
    
    // Build input based on model capabilities
    const input: Record<string, any> = {
      prompt: request.prompt,
    }

    // Duration
    if (request.duration) {
      input.duration = request.duration
    }

    // Resolution
    if (request.resolution) {
      input.resolution = request.resolution
    } else {
      input.resolution = modelConfig.defaultResolution
    }

    // Aspect ratio
    if (request.aspectRatio) {
      input.aspect_ratio = request.aspectRatio
    }

    // Start frame (image-to-video)
    if (request.startImageBase64 && modelConfig.supportsStartEndFrames) {
      input.start_image = request.startImageBase64
    }

    // End frame
    if (request.endImageBase64 && modelConfig.supportsStartEndFrames) {
      input.end_image = request.endImageBase64
    }

    // Reference image for style
    if (request.referenceImageBase64 && modelConfig.supportsReferences) {
      input.reference_image = request.referenceImageBase64
    }

    // Audio generation
    if (request.enableAudio !== undefined && modelConfig.supportsAudio) {
      input.enable_audio = request.enableAudio
    }

    console.log(`[Video] Creating task with model: ${apiModelId}`)
    console.log(`[Video] Input:`, JSON.stringify({
      ...input,
      prompt: input.prompt?.substring(0, 50) + '...',
      start_image: input.start_image ? '[base64]' : undefined,
      end_image: input.end_image ? '[base64]' : undefined,
      reference_image: input.reference_image ? '[base64]' : undefined,
    }))

    // Create task via KIE.ai API
    const createResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: apiModelId,
        input: input,
      }),
    })

    const responseText = await createResponse.text()
    console.log('[Video] Response status:', createResponse.status)
    console.log('[Video] Response body:', responseText.substring(0, 500))

    let createData: any
    try {
      createData = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`KIE API returned invalid JSON: ${responseText.substring(0, 200)}`)
    }

    if (!createResponse.ok) {
      const errorMsg = createData.message || createData.msg || createData.error || JSON.stringify(createData)
      throw new Error(`KIE API error (${createResponse.status}): ${errorMsg}`)
    }

    // KIE.ai response structure: { code: 0/200, data: { taskId: "..." } }
    if (createData.code !== 200 && createData.code !== 0) {
      throw new Error(`KIE API error: ${createData.msg || JSON.stringify(createData)}`)
    }

    const taskId = createData.data?.taskId || createData.taskId || createData.data?.task_id

    if (!taskId) {
      throw new Error(`No taskId in response: ${JSON.stringify(createData).substring(0, 300)}`)
    }

    console.log('[Video] Task created:', taskId)

    return {
      success: true,
      taskId: taskId,
      status: 'processing',
      provider: 'kie',
    }
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
 * Check video generation status
 */
export async function checkVideoStatus(
  taskId: string,
  apiKey: string
): Promise<GenerateVideoResult> {
  try {
    const response = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
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

    if (state === 'waiting' || state === 'queuing' || state === 'generating') {
      return {
        success: true,
        taskId: taskId,
        status: 'processing',
        provider: 'kie',
      }
    }

    if (state === 'fail') {
      return {
        success: false,
        error: taskData.failMsg || taskData.failCode || 'Video generation failed',
        provider: 'kie',
      }
    }

    if (state === 'success') {
      let videoUrl: string | undefined
      
      if (taskData.resultJson) {
        try {
          const resultData = typeof taskData.resultJson === 'string' 
            ? JSON.parse(taskData.resultJson) 
            : taskData.resultJson
          
          // Video URL can be in different fields
          videoUrl = resultData.videoUrl || 
                     resultData.video_url || 
                     resultData.resultUrls?.[0] ||
                     resultData.videos?.[0]
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
      error: `Unknown status: ${JSON.stringify(taskData).substring(0, 200)}`,
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
  const maxAttempts = options.maxAttempts || 300 // 5 minutes default
  const intervalMs = options.intervalMs || 2000 // 2 seconds
  const timeoutMs = options.timeoutMs || 600000 // 10 minutes max

  const startTime = Date.now()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check timeout
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

    // Still processing, wait and retry
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  return {
    success: false,
    error: 'Max polling attempts reached',
    provider: 'kie',
  }
}
