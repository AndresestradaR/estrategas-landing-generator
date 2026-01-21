import { ImageProvider, GenerateImageRequest, GenerateImageResult } from './types'

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
    CO: 'Colombia', MX: 'México', PA: 'Panamá', EC: 'Ecuador', PE: 'Perú',
    CL: 'Chile', PY: 'Paraguay', AR: 'Argentina', GT: 'Guatemala', ES: 'España',
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
- Trust badges at bottom (Envío Gratis, Pago Contraentrega, Garantía)

${creativeControls?.salesAngle ? `Marketing angle: ${creativeControls.salesAngle}` : ''}
${creativeControls?.targetAvatar ? `Target audience: ${creativeControls.targetAvatar}` : ''}
${creativeControls?.additionalInstructions ? `Special: ${creativeControls.additionalInstructions}` : ''}

Create a stunning, professional banner ready for social media advertising.`
}

export const fluxProvider: ImageProvider = {
  id: 'flux',

  async generate(request: GenerateImageRequest, apiKey: string): Promise<GenerateImageResult> {
    try {
      const prompt = buildPrompt(request)

      // Use FLUX Pro 1.1 for best quality
      const createResponse = await fetch('https://api.bfl.ai/v1/flux-pro-1.1', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'x-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          aspect_ratio: request.aspectRatio || '9:16',
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}))
        throw new Error(
          `FLUX API error: ${createResponse.status} - ${JSON.stringify(errorData)}`
        )
      }

      const createData = await createResponse.json()
      const requestId = createData.id
      const pollingUrl = createData.polling_url

      if (!requestId) {
        throw new Error('No request ID returned from FLUX')
      }

      // Return pending status with polling URL
      return {
        success: true,
        provider: 'flux',
        taskId: pollingUrl || requestId, // Use polling URL as taskId for easier polling
        status: 'processing',
      }
    } catch (error: any) {
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
        : `https://api.bfl.ai/v1/status/${pollingUrl}`

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
      if (data.status === 'Pending' || data.status === 'Processing') {
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

// FLUX Kontext Pro - supports image input
export async function generateWithFluxKontext(
  apiKey: string,
  prompt: string,
  aspectRatio: string = '1:1'
): Promise<GenerateImageResult> {
  try {
    const createResponse = await fetch('https://api.bfl.ai/v1/flux-kontext-pro', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'x-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        aspect_ratio: aspectRatio,
      }),
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
