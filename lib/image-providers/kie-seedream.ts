import { ImageProvider, GenerateImageRequest, GenerateImageResult, getApiModelId } from './types'

// Helper function to convert image to PNG format for API compatibility
// KIE.ai Seedream API does not support webp format
async function convertToPngDataUrl(base64Data: string, mimeType: string): Promise<string> {
  // If already png or jpg, return as-is
  if (mimeType === 'image/png' || mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return `data:${mimeType};base64,${base64Data}`
  }

  // For webp and other formats, convert to PNG using sharp
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp')
    const inputBuffer = Buffer.from(base64Data, 'base64')
    const pngBuffer = await sharp(inputBuffer).png().toBuffer()
    console.log('[Seedream] Successfully converted image to PNG')
    return `data:image/png;base64,${pngBuffer.toString('base64')}`
  } catch (e: any) {
    // If conversion fails, try sending with png mime type anyway
    console.warn('[Seedream] Could not convert image:', e.message)
    return `data:image/png;base64,${base64Data}`
  }
}

// Helper to download URL and convert to PNG data URL if needed
async function urlToPngDataUrl(url: string): Promise<string> {
  console.log('[Seedream] Downloading image from URL:', url)
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`)
  }
  
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  
  console.log('[Seedream] Downloaded image, content-type:', contentType, 'size:', buffer.byteLength)
  
  // Check if it's webp (by content-type or URL extension)
  const isWebp = contentType.includes('webp') || url.toLowerCase().includes('.webp')
  
  if (isWebp) {
    console.log('[Seedream] Image is webp, converting to PNG...')
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require('sharp')
      const inputBuffer = Buffer.from(buffer)
      const pngBuffer = await sharp(inputBuffer).png().toBuffer()
      console.log('[Seedream] Successfully converted webp to PNG, new size:', pngBuffer.length)
      return `data:image/png;base64,${pngBuffer.toString('base64')}`
    } catch (e: any) {
      console.error('[Seedream] Failed to convert webp:', e.message)
      throw new Error(`Cannot convert webp image: ${e.message}. Please use PNG or JPG templates.`)
    }
  }
  
  // Not webp, return as-is
  return `data:${contentType};base64,${base64}`
}

function buildPricingSection(request: GenerateImageRequest): string {
  const { creativeControls } = request
  const currencySymbol = creativeControls?.currencySymbol || '$'
  const priceAfter = creativeControls?.priceAfter
  const priceBefore = creativeControls?.priceBefore
  const priceCombo2 = creativeControls?.priceCombo2
  const priceCombo3 = creativeControls?.priceCombo3

  const hasPricing = priceAfter || priceBefore || priceCombo2 || priceCombo3

  if (!hasPricing) {
    return 'NO prices in this banner - branding only.'
  }

  const lines: string[] = ['EXACT PRICES:']
  if (priceAfter) lines.push(`- OFFER: ${currencySymbol}${priceAfter} (main, large)`)
  if (priceBefore) lines.push(`- BEFORE: ${currencySymbol}${priceBefore} (crossed out)`)
  if (priceCombo2) lines.push(`- 2 UNITS: ${currencySymbol}${priceCombo2}`)
  if (priceCombo3) lines.push(`- 3 UNITS: ${currencySymbol}${priceCombo3}`)

  return lines.join('\n')
}

function buildPrompt(request: GenerateImageRequest): string {
  const { productName, creativeControls } = request
  const targetCountry = creativeControls?.targetCountry || 'CO'

  const countryNames: Record<string, string> = {
    CO: 'Colombia', MX: 'Mexico', PA: 'Panama', EC: 'Ecuador', PE: 'Peru',
    CL: 'Chile', PY: 'Paraguay', AR: 'Argentina', GT: 'Guatemala', ES: 'Espana',
  }
  const countryName = countryNames[targetCountry] || 'Colombia'

  const pricingSection = buildPricingSection(request)

  return `Create a professional e-commerce banner in SPANISH.

COMPOSITION (copy EXACTLY from the reference template):
- Keep the SAME layout, positions, and structure
- Keep ALL decorative elements (splashes, fruits, effects)
- Keep price badges and offer sections in same positions
- Keep footer with trust badges

PRODUCT REPLACEMENT:
- Replace the template product with the user's product
- Preserve the user's product packaging, labels, and branding EXACTLY

EXACT DATA FOR BANNER:
- Product: ${productName}
- Country: ${countryName}
${pricingSection}
${creativeControls?.productDetails ? `- Details: ${creativeControls.productDetails}` : ''}

TEXT:
- ALL text in PERFECT SPANISH
- Use EXACT prices provided
- LARGE, BOLD, READABLE fonts
- No spelling errors

${creativeControls?.salesAngle ? `SALES ANGLE: ${creativeControls.salesAngle}` : ''}
${creativeControls?.targetAvatar ? `TARGET: ${creativeControls.targetAvatar}` : ''}
${creativeControls?.additionalInstructions ? `EXTRA: ${creativeControls.additionalInstructions}` : ''}

Create a banner IDENTICAL to the template, with only product and prices changed.`
}

export const seedreamProvider: ImageProvider = {
  id: 'seedream',

  async generate(request: GenerateImageRequest, apiKey: string): Promise<GenerateImageResult> {
    try {
      // Use direct prompt if provided (Studio IA), otherwise build landing prompt
      const prompt = request.prompt && request.prompt.trim()
        ? request.prompt
        : buildPrompt(request)

      // Detect if there are reference images (URL or base64)
      const hasReferenceImages = (request.productImagesBase64 && request.productImagesBase64.length > 0) ||
                                  (request.templateBase64 && request.templateMimeType) ||
                                  request.templateUrl

      // Get the API model ID from the selected model
      let apiModelId = request.modelId ? getApiModelId(request.modelId) : 'seedream/4.5-text-to-image'

      // If there are reference images, use the "edit" model variant
      if (hasReferenceImages) {
        if (apiModelId === 'seedream/4.5-text-to-image') {
          apiModelId = 'seedream/4.5-edit'
        } else if (apiModelId === 'bytedance/seedream-v4-text-to-image') {
          apiModelId = 'bytedance/seedream-v4-edit'
        }
        // Note: Seedream 3.0 (bytedance/seedream) doesn't support image input
      }

      console.log('[Seedream] Creating task with model:', apiModelId)
      console.log('[Seedream] Has reference images:', hasReferenceImages)
      console.log('[Seedream] Template URL:', request.templateUrl || 'N/A')
      console.log('[Seedream] Template mime type:', request.templateMimeType || 'N/A')

      // Determine model version based on model ID
      const is45 = apiModelId.startsWith('seedream/')
      const is40 = apiModelId.includes('seedream-v4')
      const is30 = apiModelId === 'bytedance/seedream'
      const is4K = request.modelId === 'seedream-4-4k'

      // Build the input object based on model version
      let input: any

      if (is45) {
        // Seedream 4.5 uses: aspect_ratio and quality (basic/high)
        input = {
          prompt: prompt,
          aspect_ratio: request.aspectRatio || '9:16',
          quality: is4K ? 'high' : 'basic',
        }
        // Add image_urls for edit mode
        if (hasReferenceImages) {
          const imageUrls: string[] = []

          // Template image - ALWAYS convert to PNG data URL to avoid webp issues
          if (request.templateUrl) {
            // Download and convert URL to PNG data URL
            const pngDataUrl = await urlToPngDataUrl(request.templateUrl)
            imageUrls.push(pngDataUrl)
          } else if (request.templateBase64 && request.templateMimeType) {
            const convertedUrl = await convertToPngDataUrl(request.templateBase64, request.templateMimeType)
            imageUrls.push(convertedUrl)
          }

          // Product images (usually jpg/png from user uploads)
          if (request.productImagesBase64) {
            for (const img of request.productImagesBase64) {
              const convertedUrl = await convertToPngDataUrl(img.data, img.mimeType)
              imageUrls.push(convertedUrl)
            }
          }

          if (imageUrls.length > 0) {
            input.image_urls = imageUrls
            console.log('[Seedream] Sending', imageUrls.length, 'images to API')
          }
        }
      } else if (is30) {
        // Seedream 3.0 uses: image_size (different params than 4.0)
        const imageSizeMap: Record<string, string> = {
          '1:1': 'square',
          '4:3': 'landscape_4_3',
          '3:4': 'portrait_4_3',
          '16:9': 'landscape_16_9',
          '9:16': 'portrait_16_9',
          '3:2': 'square_hd',
          '2:3': 'square_hd',
        }
        const imageSize = imageSizeMap[request.aspectRatio || '9:16'] || 'portrait_16_9'

        input = {
          prompt: prompt,
          image_size: imageSize,
          guidance_scale: 2.5,
          enable_safety_checker: true,
        }
      } else {
        // Seedream 4.0 uses: image_size, image_resolution, max_images
        const imageSizeMap: Record<string, string> = {
          '1:1': 'square_hd',
          '4:3': 'landscape_4_3',
          '3:4': 'portrait_4_3',
          '16:9': 'landscape_16_9',
          '9:16': 'portrait_16_9',
          '3:2': 'landscape_3_2',
          '2:3': 'portrait_3_2',
        }
        const imageSize = imageSizeMap[request.aspectRatio || '9:16'] || 'portrait_16_9'
        const resolution = is4K ? '4K' : (request.quality === '4k' ? '4K' : request.quality === 'hd' ? '2K' : '1K')

        input = {
          prompt: prompt,
          image_size: imageSize,
          image_resolution: resolution,
          max_images: 1,
        }
        // Add image_urls for edit mode
        if (hasReferenceImages) {
          const imageUrls: string[] = []

          // Template image - ALWAYS convert to PNG data URL to avoid webp issues
          if (request.templateUrl) {
            // Download and convert URL to PNG data URL
            const pngDataUrl = await urlToPngDataUrl(request.templateUrl)
            imageUrls.push(pngDataUrl)
          } else if (request.templateBase64 && request.templateMimeType) {
            const convertedUrl = await convertToPngDataUrl(request.templateBase64, request.templateMimeType)
            imageUrls.push(convertedUrl)
          }

          // Product images (usually jpg/png from user uploads)
          if (request.productImagesBase64) {
            for (const img of request.productImagesBase64) {
              const convertedUrl = await convertToPngDataUrl(img.data, img.mimeType)
              imageUrls.push(convertedUrl)
            }
          }

          if (imageUrls.length > 0) {
            input.image_urls = imageUrls
            console.log('[Seedream] Sending', imageUrls.length, 'images to API')
          }
        }
      }

      console.log('[Seedream] Input keys:', Object.keys(input))
      console.log('[Seedream] Image URLs count:', input.image_urls?.length || 0)

      // Create task via KIE.ai API
      const requestBody = {
        model: apiModelId,
        input: input,
      }

      const createResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })

      const responseText = await createResponse.text()
      console.log('[Seedream] Response status:', createResponse.status)
      console.log('[Seedream] Response body:', responseText.substring(0, 500))

      let createData: any
      try {
        createData = JSON.parse(responseText)
      } catch (e) {
        throw new Error(`Seedream API returned invalid JSON: ${responseText.substring(0, 200)}`)
      }

      if (!createResponse.ok) {
        // Extract error message from response
        const errorMsg = createData.message || createData.msg || createData.error || createData.detail || JSON.stringify(createData)
        throw new Error(`Seedream API error (${createResponse.status}): ${errorMsg}`)
      }

      // KIE.ai response structure: { code: 0/200, data: { taskId: "..." } }
      if (createData.code !== 200 && createData.code !== 0) {
        throw new Error(`Seedream API error: ${createData.msg || JSON.stringify(createData)}`)
      }

      const taskId = createData.data?.taskId || createData.taskId || createData.data?.task_id

      if (!taskId) {
        // Log the full response to understand the structure
        console.error('[Seedream] No taskId in response:', JSON.stringify(createData, null, 2))
        throw new Error(`No taskId in Seedream response. Got: ${JSON.stringify(createData).substring(0, 300)}`)
      }

      console.log('[Seedream] Task created:', taskId)

      // Return pending status - caller must poll for result
      return {
        success: true,
        provider: 'seedream',
        taskId: taskId,
        status: 'processing',
      }
    } catch (error: any) {
      console.error('[Seedream] Error:', error.message)
      return {
        success: false,
        error: error.message || 'Seedream generation failed',
        provider: 'seedream',
      }
    }
  },

  async checkStatus(taskId: string, apiKey: string): Promise<GenerateImageResult> {
    try {
      // Use the correct endpoint for KIE.ai
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
      console.log('[Seedream] Status response:', JSON.stringify(data, null, 2))

      const taskData = data.data || data

      // KIE.ai states: waiting, queuing, generating, success, fail
      const state = taskData.state

      if (state === 'waiting' || state === 'queuing' || state === 'generating') {
        return {
          success: true,
          provider: 'seedream',
          taskId: taskId,
          status: 'processing',
        }
      }

      if (state === 'fail') {
        return {
          success: false,
          error: taskData.failMsg || taskData.failCode || 'Generation failed',
          provider: 'seedream',
        }
      }

      // Success - get the image
      if (state === 'success') {
        let resultUrls: string[] = []
        
        // Parse resultJson if it exists
        if (taskData.resultJson) {
          try {
            const resultData = typeof taskData.resultJson === 'string' 
              ? JSON.parse(taskData.resultJson) 
              : taskData.resultJson
            resultUrls = resultData.resultUrls || resultData.images || []
          } catch (e) {
            console.error('[Seedream] Failed to parse resultJson:', e)
          }
        }
        
        if (resultUrls.length > 0) {
          const imageUrl = resultUrls[0]

          // Fetch the image and convert to base64
          const imageResponse = await fetch(imageUrl)
          const imageBuffer = await imageResponse.arrayBuffer()
          const imageBase64 = Buffer.from(imageBuffer).toString('base64')
          const mimeType = imageResponse.headers.get('content-type') || 'image/png'

          return {
            success: true,
            imageBase64: imageBase64,
            mimeType: mimeType,
            provider: 'seedream',
            status: 'completed',
          }
        }
      }

      return {
        success: false,
        error: `Unknown status from Seedream: ${JSON.stringify(taskData).substring(0, 200)}`,
        provider: 'seedream',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Status check failed',
        provider: 'seedream',
      }
    }
  },
}

// Text-to-image variant (no reference image needed)
export async function generateWithSeedreamText(
  apiKey: string,
  prompt: string,
  modelId?: string,
  options: {
    aspectRatio?: string
    quality?: 'basic' | 'high'
  } = {}
): Promise<GenerateImageResult> {
  try {
    const apiModelId = modelId || 'seedream/4.5-text-to-image'

    const createResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: apiModelId,
        input: {
          prompt: prompt,
          aspect_ratio: options.aspectRatio || '1:1',
          quality: options.quality || 'basic',
        },
      }),
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}))
      throw new Error(`Seedream Text API error: ${createResponse.status} - ${JSON.stringify(errorData)}`)
    }

    const createData = await createResponse.json()
    
    if (createData.code !== 200 && createData.code !== 0) {
      throw new Error(`Seedream API error: ${createData.msg || JSON.stringify(createData)}`)
    }

    const taskId = createData.data?.taskId || createData.taskId

    return {
      success: true,
      provider: 'seedream',
      taskId: taskId,
      status: 'processing',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Seedream text generation failed',
      provider: 'seedream',
    }
  }
}
