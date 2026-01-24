import { ImageProvider, GenerateImageRequest, GenerateImageResult, getApiModelId } from './types'

function buildPricingSection(request: GenerateImageRequest): string {
  const { creativeControls } = request
  const currencySymbol = creativeControls?.currencySymbol || '$'
  const priceAfter = creativeControls?.priceAfter
  const priceBefore = creativeControls?.priceBefore
  const priceCombo2 = creativeControls?.priceCombo2
  const priceCombo3 = creativeControls?.priceCombo3

  const hasPricing = priceAfter || priceBefore || priceCombo2 || priceCombo3

  if (!hasPricing) {
    return 'No prices - branding banner only.'
  }

  const lines: string[] = []
  if (priceAfter) lines.push(`Price displayed prominently: ${currencySymbol}${priceAfter}`)
  if (priceBefore) lines.push(`Original price crossed out: ${currencySymbol}${priceBefore}`)
  if (priceCombo2) lines.push(`2 units price: ${currencySymbol}${priceCombo2}`)
  if (priceCombo3) lines.push(`3 units price: ${currencySymbol}${priceCombo3}`)

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

  return `Professional e-commerce marketing banner for "${productName}" in Spanish.

STYLE:
- Modern, clean e-commerce banner design
- Vibrant colors with professional gradients
- Product as the hero element
- Dynamic composition with splashes and decorative elements

CONTENT:
- Product: ${productName}
- Target country: ${countryName}
${pricingSection}
${creativeControls?.productDetails ? `- Product features: ${creativeControls.productDetails}` : ''}

TEXT:
- All text in SPANISH
- Bold, impactful headlines
- Trust badges at bottom (Envio Gratis, Pago Contraentrega, Garantia)

${creativeControls?.salesAngle ? `Marketing angle: ${creativeControls.salesAngle}` : ''}
${creativeControls?.targetAvatar ? `Target audience: ${creativeControls.targetAvatar}` : ''}
${creativeControls?.additionalInstructions ? `Special: ${creativeControls.additionalInstructions}` : ''}

Create a stunning, professional banner ready for social media advertising.`
}

// Map our model IDs to BFL API endpoints
function getFluxEndpoint(apiModelId: string): string {
  // The apiModelId maps directly to the endpoint path
  // e.g., 'flux-2-pro' -> '/v1/flux-2-pro'
  return `https://api.bfl.ai/v1/${apiModelId}`
}

// Check which parameter to use for image input based on model
function getImageInputConfig(apiModelId: string): { 
  paramName: string; 
  strengthParam?: string;
  supportsInput: boolean;
} {
  // FLUX 2 models use different parameters
  if (apiModelId === 'flux-2-max' || apiModelId === 'flux-2-pro') {
    // FLUX 2 Max/Pro use control_image for image conditioning
    return { paramName: 'control_image', strengthParam: 'control_strength', supportsInput: true }
  }
  
  if (apiModelId === 'flux-2-flex') {
    // FLUX 2 Flex uses input_image for reference
    return { paramName: 'input_image', strengthParam: 'strength', supportsInput: true }
  }
  
  // FLUX 1 Kontext models use image_prompt
  if (apiModelId.includes('kontext')) {
    return { paramName: 'image_prompt', strengthParam: 'image_prompt_strength', supportsInput: true }
  }
  
  // Models without image input support
  if (apiModelId === 'flux-2-klein-4b' || apiModelId === 'flux-dev' || apiModelId === 'flux-schnell') {
    return { paramName: '', supportsInput: false }
  }
  
  // Default - try control_image
  return { paramName: 'control_image', strengthParam: 'control_strength', supportsInput: true }
}

export const fluxProvider: ImageProvider = {
  id: 'flux',

  async generate(request: GenerateImageRequest, apiKey: string): Promise<GenerateImageResult> {
    try {
      // Use direct prompt if provided (Studio IA), otherwise build landing prompt
      const prompt = request.prompt && request.prompt.trim()
        ? request.prompt
        : buildPrompt(request)

      // Get the API model ID from the selected model (default to flux-2-pro)
      const apiModelId = request.modelId ? getApiModelId(request.modelId) : 'flux-2-pro'
      const endpoint = getFluxEndpoint(apiModelId)

      // Get image input configuration for this model
      const imageConfig = getImageInputConfig(apiModelId)

      // Build request body based on model capabilities
      const requestBody: Record<string, any> = {
        prompt: prompt,
        aspect_ratio: request.aspectRatio || '9:16',
      }

      // Get image from template or product images
      let imageBase64: string | null = null
      if (request.templateBase64) {
        imageBase64 = request.templateBase64
      } else if (request.productImagesBase64 && request.productImagesBase64.length > 0) {
        imageBase64 = request.productImagesBase64[0].data
      }

      // Add image input with correct parameter name for this model
      if (imageConfig.supportsInput && imageBase64) {
        // Format: data:image/jpeg;base64,{data} or just base64 depending on API
        // BFL API expects base64 string without data URL prefix
        const cleanBase64 = imageBase64.includes(',') 
          ? imageBase64.split(',')[1] 
          : imageBase64
        
        requestBody[imageConfig.paramName] = cleanBase64
        
        if (imageConfig.strengthParam) {
          // Use higher strength (0.7) to better preserve the reference
          requestBody[imageConfig.strengthParam] = 0.7
        }

        console.log(`[FLUX] Adding image input with param: ${imageConfig.paramName}, strength: ${imageConfig.strengthParam || 'N/A'}`)
      }

      console.log(`[FLUX] Endpoint: ${endpoint}`)
      console.log(`[FLUX] Request params:`, Object.keys(requestBody))

      const createResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'x-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}))
        console.error(`[FLUX] API error response:`, errorData)
        throw new Error(
          `FLUX API error: ${createResponse.status} - ${JSON.stringify(errorData)}`
        )
      }

      const createData = await createResponse.json()
      const requestId = createData.id
      const pollingUrl = createData.polling_url

      if (!requestId && !pollingUrl) {
        throw new Error('No request ID or polling URL returned from FLUX')
      }

      console.log(`[FLUX] Task created: ${requestId || pollingUrl}`)

      // Return pending status with polling URL
      return {
        success: true,
        provider: 'flux',
        taskId: pollingUrl || requestId, // Use polling URL as taskId for easier polling
        status: 'processing',
      }
    } catch (error: any) {
      console.error(`[FLUX] Generation error:`, error)
      return {
        success: false,
        error: error.message || 'FLUX generation failed',
        provider: 'flux',
      }
    }
  },

  async checkStatus(pollingUrl: string, apiKey: string): Promise<GenerateImageResult> {
    try {
      // If pollingUrl is not a full URL, construct it
      const url = pollingUrl.startsWith('http')
        ? pollingUrl
        : `https://api.bfl.ai/v1/get_result?id=${pollingUrl}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-key': apiKey,
        },
      })

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`)
      }

      const data = await response.json()

      // Check status
      if (data.status === 'Pending' || data.status === 'Processing' || data.status === 'Queued') {
        return {
          success: true,
          provider: 'flux',
          taskId: pollingUrl,
          status: 'processing',
        }
      }

      if (data.status === 'Error' || data.status === 'Failed') {
        return {
          success: false,
          error: data.error || 'FLUX generation failed',
          provider: 'flux',
        }
      }

      // Ready - get the image
      if (data.status === 'Ready' && data.result?.sample) {
        const imageUrl = data.result.sample

        // Fetch the image and convert to base64
        const imageResponse = await fetch(imageUrl)
        const imageBuffer = await imageResponse.arrayBuffer()
        const imageBase64 = Buffer.from(imageBuffer).toString('base64')
        const mimeType = imageResponse.headers.get('content-type') || 'image/png'

        return {
          success: true,
          imageBase64: imageBase64,
          mimeType: mimeType,
          provider: 'flux',
          status: 'completed',
        }
      }

      return {
        success: true,
        provider: 'flux',
        taskId: pollingUrl,
        status: 'processing',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Status check failed',
        provider: 'flux',
      }
    }
  },
}

// FLUX Kontext Pro - supports image input for contextual editing
export async function generateWithFluxKontext(
  apiKey: string,
  prompt: string,
  modelId: string = 'flux-kontext-pro',
  aspectRatio: string = '1:1',
  imageBase64?: string
): Promise<GenerateImageResult> {
  try {
    const requestBody: Record<string, any> = {
      prompt: prompt,
      aspect_ratio: aspectRatio,
    }

    if (imageBase64) {
      requestBody.image_prompt = imageBase64
      requestBody.image_prompt_strength = 0.5
    }

    const createResponse = await fetch(`https://api.bfl.ai/v1/${modelId}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'x-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}))
      throw new Error(`FLUX Kontext API error: ${createResponse.status} - ${JSON.stringify(errorData)}`)
    }

    const createData = await createResponse.json()

    return {
      success: true,
      provider: 'flux',
      taskId: createData.polling_url || createData.id,
      status: 'processing',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'FLUX Kontext generation failed',
      provider: 'flux',
    }
  }
}
