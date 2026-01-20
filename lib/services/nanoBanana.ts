// Nano Banana API Service
// Documentation: https://nanobanana.com/docs

export interface GenerateImageParams {
  prompt: string
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:3' | '3:4'
  style?: string
  negativePrompt?: string
}

export interface GenerateImageResponse {
  success: boolean
  imageUrl?: string
  error?: string
  taskId?: string
}

const NANO_BANANA_API_URL = 'https://api.nanobanana.com/v1'

export async function generateImage(
  apiKey: string,
  params: GenerateImageParams
): Promise<GenerateImageResponse> {
  try {
    const response = await fetch(`${NANO_BANANA_API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: params.prompt,
        aspect_ratio: params.aspectRatio || '9:16',
        style: params.style || 'product_photography',
        negative_prompt: params.negativePrompt || 'blurry, low quality, distorted, watermark, text',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || `API error: ${response.status}`,
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      imageUrl: data.image_url || data.url || data.result,
      taskId: data.task_id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function checkTaskStatus(
  apiKey: string,
  taskId: string
): Promise<GenerateImageResponse> {
  try {
    const response = await fetch(`${NANO_BANANA_API_URL}/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Status check failed: ${response.status}`,
      }
    }

    const data = await response.json()
    
    if (data.status === 'completed') {
      return {
        success: true,
        imageUrl: data.image_url || data.result,
      }
    } else if (data.status === 'failed') {
      return {
        success: false,
        error: data.error || 'Generation failed',
      }
    }
    
    // Still processing
    return {
      success: false,
      error: 'Still processing',
      taskId: taskId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}