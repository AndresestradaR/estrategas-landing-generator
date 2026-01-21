import { ImageProvider, GenerateImageRequest, GenerateImageResult, mapAspectRatioForProvider } from './types'

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
    CO: 'Colombia', MX: 'México', PA: 'Panamá', EC: 'Ecuador', PE: 'Perú',
    CL: 'Chile', PY: 'Paraguay', AR: 'Argentina', GT: 'Guatemala', ES: 'España',
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

// Helper to upload image to a temporary URL (for Kie.ai which requires URLs)
async function uploadImageToTemp(base64: string, mimeType: string): Promise<string> {
  // In production, you'd upload to your storage (S3, Supabase, etc.)
  // For now, we'll use a data URL approach or require pre-uploaded URLs
  return `data:${mimeType};base64,${base64}`
}

export const seedreamProvider: ImageProvider = {
  id: 'seedream',

  async generate(request: GenerateImageRequest, apiKey: string): Promise<GenerateImageResult> {
    try {
      const prompt = buildPrompt(request)

      // Prepare image URLs - Seedream requires URLs, not base64
      const imageUrls: string[] = []

      // Add template
      if (request.templateBase64 && request.templateMimeType) {
        const templateUrl = await uploadImageToTemp(request.templateBase64, request.templateMimeType)
        imageUrls.push(templateUrl)
      }

      // Add product images
      if (request.productImagesBase64) {
        for (const img of request.productImagesBase64) {
          const url = await uploadImageToTemp(img.data, img.mimeType)
          imageUrls.push(url)
        }
      }

      // Map aspect ratio to Seedream format
      const imageSize = mapAspectRatioForProvider(request.aspectRatio || '9:16', 'seedream')

      // Create task
      const createResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'seedream/4.5-edit',
          input: {
            prompt: prompt,
            image_urls: imageUrls,
            aspect_ratio: request.aspectRatio || '1:1',
            quality: request.quality === '4k' ? 'high' : 'basic',
          },
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}))
        throw new Error(
          `Seedream API error: ${createResponse.status} - ${JSON.stringify(errorData)}`
        )
      }

      const createData = await createResponse.json()
      const taskId = createData.data?.taskId || createData.taskId

      if (!taskId) {
        throw new Error('No taskId returned from Seedream')
      }

      // Return pending status - caller must poll for result
      return {
        success: true,
        provider: 'seedream',
        taskId: taskId,
        status: 'processing',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Seedream generation failed',
        provider: 'seedream',
      }
    }
  },

  async checkStatus(taskId: string, apiKey: string): Promise<GenerateImageResult> {
    try {
      const response = await fetch(`https://api.kie.ai/api/task/status/${taskId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`)
      }

      const data = await response.json()
      const taskData = data.data

      // Check status: 0 = Generating, 1 = Success, 2 = Failed
      if (taskData.successFlag === 0) {
        return {
          success: true,
          provider: 'seedream',
          taskId: taskId,
          status: 'processing',
        }
      }

      if (taskData.successFlag === 2) {
        return {
          success: false,
          error: taskData.errorMessage || 'Generation failed',
          provider: 'seedream',
        }
      }

      // Success - get the image
      if (taskData.successFlag === 1 && taskData.response?.result_urls?.length > 0) {
        const imageUrl = taskData.response.result_urls[0]

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

      return {
        success: false,
        error: 'Unknown status from Seedream',
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
  options: {
    imageSize?: string
    resolution?: '1K' | '2K' | '4K'
    maxImages?: number
  } = {}
): Promise<GenerateImageResult> {
  try {
    const createResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'bytedance/seedream-v4-text-to-image',
        input: {
          prompt: prompt,
          image_size: options.imageSize || 'square_hd',
          image_resolution: options.resolution || '2K',
          max_images: options.maxImages || 1,
        },
      }),
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}))
      throw new Error(`Seedream Text API error: ${createResponse.status} - ${JSON.stringify(errorData)}`)
    }

    const createData = await createResponse.json()
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
