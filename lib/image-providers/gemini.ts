import { ImageProvider, GenerateImageRequest, GenerateImageResult } from './types'

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
    lines.push(`- Precio ANTES: ${currencySymbol}${priceBefore} (precio tachado, más pequeño)`)
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
    MX: 'México',
    PA: 'Panamá',
    EC: 'Ecuador',
    PE: 'Perú',
    CL: 'Chile',
    PY: 'Paraguay',
    AR: 'Argentina',
    GT: 'Guatemala',
    ES: 'España',
  }
  const countryName = countryNames[targetCountry] || 'Colombia'

  const pricingSection = buildPricingSection(request)

  return `Eres un diseñador experto de banners e-commerce. Crea un banner profesional en ESPAÑOL.

COMPOSICIÓN (copia EXACTAMENTE del template - imagen 1):
- Mantén el MISMO layout, posiciones y estructura del template
- Mantén TODAS las personas/modelos en las MISMAS poses
- Mantén TODOS los elementos decorativos (splashes, frutas, efectos)
- Mantén badges de precio y secciones de oferta en mismas posiciones
- Mantén footer con sellos de confianza

REEMPLAZO DE PRODUCTO (CRÍTICO):
- Reemplaza TODAS las instancias del producto del template con el producto del usuario
- El producto en la mano del modelo debe ser reemplazado
- El producto hero grande debe ser reemplazado
- Preserva el empaque, etiquetas y branding del producto del usuario EXACTAMENTE como se muestra en las imágenes 2+

DATOS EXACTOS PARA EL BANNER (USA ESTOS VALORES, NO INVENTES):
- Producto: ${productName}
- País destino: ${countryName}
${pricingSection}
${creativeControls?.productDetails ? `- Detalles: ${creativeControls.productDetails}` : ''}

TEXTO (MUY IMPORTANTE):
- TODO el texto debe estar en ESPAÑOL PERFECTO
- Usa los PRECIOS EXACTOS que te di arriba - NO inventes precios
- Usa fuentes GRANDES, BOLD, MUY LEGIBLES
- El texto debe estar PERFECTAMENTE ESCRITO - sin letras al azar, sin errores
- Copia el ESTILO de texto del template (tamaño, posición, colores)
- Los titulares deben ser impactantes y orientados a ventas

${creativeControls?.salesAngle ? `ÁNGULO DE VENTA: ${creativeControls.salesAngle}` : ''}
${creativeControls?.targetAvatar ? `PÚBLICO OBJETIVO: ${creativeControls.targetAvatar}` : ''}
${creativeControls?.additionalInstructions ? `INSTRUCCIONES ESPECIALES: ${creativeControls.additionalInstructions}` : ''}

PROHIBIDO:
- NO remover ningún elemento del template
- NO simplificar el diseño
- NO cambiar el layout
- NO generar texto con errores ortográficos
- NO crear letras sin sentido o gibberish
- NO inventar precios diferentes a los que te di

RESULTADO: Banner IDÉNTICO al template, solo con producto reemplazado y textos/precios adaptados con los datos exactos proporcionados.`
}

export const geminiProvider: ImageProvider = {
  id: 'gemini',

  async generate(request: GenerateImageRequest, apiKey: string): Promise<GenerateImageResult> {
    try {
      // IMPORTANT: Use gemini-2.5-flash-image for proper text rendering
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent'

      const parts: any[] = []

      // Add template first as reference
      if (request.templateBase64 && request.templateMimeType) {
        parts.push({
          inline_data: {
            mime_type: request.templateMimeType,
            data: request.templateBase64,
          },
        })
      }

      // Add product photos
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

      // Build and add prompt
      const prompt = buildPrompt(request)
      parts.push({ text: prompt })

      const response = await fetch(`${endpoint}?key=${apiKey}`, {
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
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      // Extract image from response
      for (const candidate of data.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            return {
              success: true,
              imageBase64: part.inlineData.data,
              mimeType: part.inlineData.mimeType || 'image/png',
              provider: 'gemini',
            }
          }
        }
      }

      return {
        success: false,
        error: 'No image generated by Gemini',
        provider: 'gemini',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Gemini generation failed',
        provider: 'gemini',
      }
    }
  },
}
