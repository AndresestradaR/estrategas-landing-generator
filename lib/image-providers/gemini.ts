import { ImageProvider, GenerateImageRequest, GenerateImageResult, IMAGE_MODELS, getApiModelId } from './types'

function buildPricingSection(request: GenerateImageRequest): string {
  const { creativeControls } = request
  const currencySymbol = creativeControls?.currencySymbol || '$'
  const priceAfter = creativeControls?.priceAfter
  const priceBefore = creativeControls?.priceBefore
  const priceCombo2 = creativeControls?.priceCombo2
  const priceCombo3 = creativeControls?.priceCombo3

  // Check if any price is provided
  const hasPricing = priceAfter || priceBefore || priceCombo2 || priceCombo3

  if (!hasPricing) {
    return 'NO incluir precios en este banner - es solo para branding/awareness.'
  }

  const lines: string[] = ['PRECIOS EXACTOS (usa estos valores, NO inventes):']

  if (priceAfter) {
    lines.push(`- Precio OFERTA: ${currencySymbol}${priceAfter} (precio principal, grande y destacado)`)
  }
  if (priceBefore) {
    lines.push(`- Precio ANTES: ${currencySymbol}${priceBefore} (precio tachado, mas pequeno)`)
  }
  if (priceCombo2) {
    lines.push(`- Precio 2 UNIDADES: ${currencySymbol}${priceCombo2}`)
  }
  if (priceCombo3) {
    lines.push(`- Precio 3 UNIDADES: ${currencySymbol}${priceCombo3}`)
  }

  return lines.join('\n')
}

function buildPrompt(request: GenerateImageRequest): string {
  const { productName, creativeControls } = request
  const targetCountry = creativeControls?.targetCountry || 'CO'

  // Map country codes to names
  const countryNames: Record<string, string> = {
    CO: 'Colombia',
    MX: 'Mexico',
    PA: 'Panama',
    EC: 'Ecuador',
    PE: 'Peru',
    CL: 'Chile',
    PY: 'Paraguay',
    AR: 'Argentina',
    GT: 'Guatemala',
    ES: 'Espana',
  }
  const countryName = countryNames[targetCountry] || 'Colombia'

  const pricingSection = buildPricingSection(request)

  return `Eres un disenador experto de banners e-commerce. Crea un banner profesional en ESPANOL.

COMPOSICION (copia EXACTAMENTE del template - imagen 1):
- Manten el MISMO layout, posiciones y estructura del template
- Manten TODAS las personas/modelos en las MISMAS poses
- Manten TODOS los elementos decorativos (splashes, frutas, efectos)
- Manten badges de precio y secciones de oferta en mismas posiciones
- Manten footer con sellos de confianza

REEMPLAZO DE PRODUCTO (CRITICO):
- Reemplaza TODAS las instancias del producto del template con el producto del usuario
- El producto en la mano del modelo debe ser reemplazado
- El producto hero grande debe ser reemplazado
- Preserva el empaque, etiquetas y branding del producto del usuario EXACTAMENTE como se muestra en las imagenes 2+

DATOS EXACTOS PARA EL BANNER (USA ESTOS VALORES, NO INVENTES):
- Producto: ${productName}
- Pais destino: ${countryName}
${pricingSection}
${creativeControls?.productDetails ? `- Detalles: ${creativeControls.productDetails}` : ''}

TEXTO (MUY IMPORTANTE):
- TODO el texto debe estar en ESPANOL PERFECTO
- Usa los PRECIOS EXACTOS que te di arriba - NO inventes precios
- Usa fuentes GRANDES, BOLD, MUY LEGIBLES
- El texto debe estar PERFECTAMENTE ESCRITO - sin letras al azar, sin errores
- Copia el ESTILO de texto del template (tamano, posicion, colores)
- Los titulares deben ser impactantes y orientados a ventas

${creativeControls?.salesAngle ? `ANGULO DE VENTA: ${creativeControls.salesAngle}` : ''}
${creativeControls?.targetAvatar ? `PUBLICO OBJETIVO: ${creativeControls.targetAvatar}` : ''}
${creativeControls?.additionalInstructions ? `INSTRUCCIONES ESPECIALES: ${creativeControls.additionalInstructions}` : ''}

PROHIBIDO:
- NO remover ningun elemento del template
- NO simplificar el diseno
- NO cambiar el layout
- NO generar texto con errores ortograficos
- NO crear letras sin sentido o gibberish
- NO inventar precios diferentes a los que te di

RESULTADO: Banner IDENTICO al template, solo con producto reemplazado y textos/precios adaptados con los datos exactos proporcionados.`
}

// Check if modelId is a Gemini model (uses generateContent) or Imagen model (uses predict)
function isGeminiModel(modelId: string): boolean {
  return modelId.startsWith('gemini-')
}

// Helper to create fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 110000 // 110s default, leaving 10s buffer for Vercel's 120s limit
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('La generación tardó demasiado. Intenta de nuevo o usa otro modelo.')
    }
    throw error
  }
}

// Generate with Gemini models (gemini-2.5-flash, gemini-3-pro-image-preview)
async function generateWithGemini(
  request: GenerateImageRequest,
  apiKey: string,
  apiModelId: string
): Promise<GenerateImageResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${apiModelId}:generateContent`

  const parts: any[] = []

  // Add template first as reference (for landing generator)
  if (request.templateBase64 && request.templateMimeType) {
    parts.push({
      inline_data: {
        mime_type: request.templateMimeType,
        data: request.templateBase64,
      },
    })
  }

  // Add reference/product images
  if (request.productImagesBase64) {
    for (const photo of request.productImagesBase64) {
      parts.push({
        inline_data: {
          mime_type: photo.mimeType,
          data: photo.data,
        },
      })
    }
  }

  // Use direct prompt if provided (Studio IA), otherwise build landing prompt
  const prompt = request.prompt && request.prompt.trim()
    ? request.prompt
    : buildPrompt(request)
  parts.push({ text: prompt })

  console.log(`[Gemini] Starting generation with model: ${apiModelId}`)
  const startTime = Date.now()

  const response = await fetchWithTimeout(
    `${endpoint}?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: request.aspectRatio || '9:16',
          },
        },
      }),
    },
    110000 // 110 seconds timeout
  )

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[Gemini] Response received in ${elapsed}s, status: ${response.status}`)

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[Gemini] API error: ${response.status} - ${errorText}`)
    
    // Parse common Gemini errors
    if (response.status === 429) {
      throw new Error('Límite de API excedido. Espera un momento e intenta de nuevo.')
    }
    if (response.status === 400 && errorText.includes('SAFETY')) {
      throw new Error('La imagen fue bloqueada por filtros de seguridad. Modifica el prompt.')
    }
    if (response.status === 403) {
      throw new Error('API key inválida o sin permisos para generación de imágenes.')
    }
    
    throw new Error(`Error de Gemini: ${response.status}`)
  }

  const data = await response.json()

  // Extract image from response
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        console.log(`[Gemini] Image generated successfully in ${elapsed}s`)
        return {
          success: true,
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
          provider: 'gemini',
        }
      }
    }
  }

  // Check for blocked content
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    return {
      success: false,
      error: 'Contenido bloqueado por filtros de seguridad. Modifica el prompt.',
      provider: 'gemini',
    }
  }

  console.error('[Gemini] No image in response:', JSON.stringify(data).substring(0, 500))
  return {
    success: false,
    error: 'No se generó imagen. Intenta con otro prompt.',
    provider: 'gemini',
  }
}

// Generate with Imagen models (imagen-3, imagen-4, etc.)
async function generateWithImagen(
  request: GenerateImageRequest,
  apiKey: string,
  apiModelId: string
): Promise<GenerateImageResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${apiModelId}:predict`

  // Use direct prompt if provided (Studio IA), otherwise build landing prompt
  const prompt = request.prompt && request.prompt.trim()
    ? request.prompt
    : buildPrompt(request)

  // Map aspect ratio for Imagen
  const aspectRatioMap: Record<string, string> = {
    '1:1': '1:1',
    '16:9': '16:9',
    '9:16': '9:16',
    '4:3': '4:3',
    '3:4': '3:4',
    '4:5': '4:3', // Closest match
    '3:2': '16:9', // Closest match
    '2:3': '9:16', // Closest match
  }

  console.log(`[Imagen] Starting generation with model: ${apiModelId}`)
  const startTime = Date.now()

  const response = await fetchWithTimeout(
    `${endpoint}?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [
          {
            prompt: prompt,
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: aspectRatioMap[request.aspectRatio || '9:16'] || '9:16',
          personGeneration: 'allow_adult',
        },
      }),
    },
    110000
  )

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[Imagen] Response received in ${elapsed}s, status: ${response.status}`)

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[Imagen] API error: ${response.status} - ${errorText}`)
    throw new Error(`Imagen API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // Extract image from response
  if (data.predictions && data.predictions.length > 0) {
    const prediction = data.predictions[0]
    if (prediction.bytesBase64Encoded) {
      console.log(`[Imagen] Image generated successfully in ${elapsed}s`)
      return {
        success: true,
        imageBase64: prediction.bytesBase64Encoded,
        mimeType: 'image/png',
        provider: 'gemini',
      }
    }
  }

  // Alternative response format
  if (data.generatedImages && data.generatedImages.length > 0) {
    const image = data.generatedImages[0]
    if (image.image?.imageBytes) {
      return {
        success: true,
        imageBase64: image.image.imageBytes,
        mimeType: image.image.mimeType || 'image/png',
        provider: 'gemini',
      }
    }
  }

  return {
    success: false,
    error: 'No image generated by Imagen',
    provider: 'gemini',
  }
}

export const geminiProvider: ImageProvider = {
  id: 'gemini',

  async generate(request: GenerateImageRequest, apiKey: string): Promise<GenerateImageResult> {
    try {
      // Get the API model ID from the selected model
      const apiModelId = request.modelId ? getApiModelId(request.modelId) : 'gemini-2.0-flash-exp-image-generation'

      console.log(`[Gemini Provider] Using model: ${request.modelId} -> API: ${apiModelId}`)

      // Use different generation method based on model type
      if (isGeminiModel(request.modelId || 'gemini-2.5-flash')) {
        return await generateWithGemini(request, apiKey, apiModelId)
      } else {
        return await generateWithImagen(request, apiKey, apiModelId)
      }
    } catch (error: any) {
      console.error('[Gemini Provider] Error:', error.message)
      return {
        success: false,
        error: error.message || 'Error en la generación con Google',
        provider: 'gemini',
      }
    }
  },
}
