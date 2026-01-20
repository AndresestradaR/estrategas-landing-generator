import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
// import { composeBanner, getDefaultBenefits } from '@/lib/banner-composer' // Desactivado por problemas de fuentes en Vercel

function getAspectRatio(outputSize: string): string {
  if (outputSize === '1080x1920' || outputSize === '9:16') return '9:16'
  if (outputSize === '1080x1080' || outputSize === '1:1') return '1:1'
  if (outputSize === '1920x1080' || outputSize === '16:9') return '16:9'
  if (outputSize === '1080x1350' || outputSize === '4:5') return '4:5'
  return '9:16'
}

function parseDataUrl(dataUrl: string): { data: string; mimeType: string } | null {
  if (!dataUrl.startsWith('data:')) return null
  const [header, data] = dataUrl.split(',')
  const mimeType = header.split(':')[1]?.split(';')[0] || 'image/jpeg'
  return { data, mimeType }
}

// Detectar tipo de producto para seleccionar íconos apropiados
function detectProductType(productName: string, productDetails: string): string {
  const text = `${productName} ${productDetails}`.toLowerCase()

  if (text.match(/creatina|proteina|whey|bcaa|pre.?workout|masa muscular|gym|fitness|muscul/)) {
    return 'fitness'
  }
  if (text.match(/colágeno|colageno|belleza|piel|cabello|uñas|serum|crema|anti.?edad|beauty/)) {
    return 'beauty'
  }
  if (text.match(/vitamin|inmun|salud|bienestar|natural|orgánico|organico|health/)) {
    return 'health'
  }
  if (text.match(/gluteo|glúteo|pompis|cola|butt|booty|nalgas/)) {
    return 'fitness' // Usa fitness para productos de glúteos
  }

  return 'default'
}

// Generate image with Gemini 2.5 Flash Image - THE CORRECT MODEL FOR TEXT IN IMAGES
async function generateImageWithGemini(
  apiKey: string,
  templateBase64: string,
  templateMimeType: string,
  productPhotosBase64: { data: string; mimeType: string }[],
  productName: string,
  aspectRatio: string,
  creativeControls?: {
    productDetails?: string
    salesAngle?: string
    targetAvatar?: string
    additionalInstructions?: string
    // Precios exactos estilo Zepol
    priceAfter?: string
    priceBefore?: string
    currencySymbol?: string
  }
): Promise<{ imageBase64: string; mimeType: string } | null> {
  // IMPORTANT: Use gemini-2.5-flash-image for proper text rendering
  // Do NOT change to gemini-2.0-flash-exp - it generates corrupted text
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent'
  
  const parts: any[] = []
  
  // Add template first as reference
  parts.push({
    inline_data: { mime_type: templateMimeType, data: templateBase64 }
  })
  
  // Add product photos
  for (const photo of productPhotosBase64) {
    parts.push({
      inline_data: { mime_type: photo.mimeType, data: photo.data }
    })
  }
  
  // Build COMPLETE banner prompt with Zepol-style exact data
  const currencySymbol = creativeControls?.currencySymbol || '$'
  const priceAfter = creativeControls?.priceAfter || ''
  const priceBefore = creativeControls?.priceBefore || ''

  const prompt = `Eres un diseñador experto de banners e-commerce. Crea un banner profesional en ESPAÑOL.

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
${priceAfter ? `- Precio OFERTA: ${currencySymbol}${priceAfter} (este es el precio principal, grande y destacado)` : ''}
${priceBefore ? `- Precio ANTES: ${currencySymbol}${priceBefore} (precio tachado, más pequeño)` : ''}
- País: Colombia
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

  parts.push({ text: prompt })

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { 
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        return {
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png'
        }
      }
    }
  }
  
  return null
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, productName, templateId, templateUrl, productPhotos, outputSize, creativeControls } = body

    if (!templateUrl) {
      return NextResponse.json({ error: 'Plantilla requerida' }, { status: 400 })
    }

    if (!productPhotos || productPhotos.length === 0) {
      return NextResponse.json({ error: 'Al menos una foto del producto requerida' }, { status: 400 })
    }

    // Get API key
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_api_key')
      .eq('id', user.id)
      .single()

    if (!profile?.google_api_key) {
      return NextResponse.json({ error: 'Configura tu API key de Google en Settings' }, { status: 400 })
    }

    const apiKey = decrypt(profile.google_api_key)

    // Parse template
    let templateBase64: string
    let templateMimeType: string
    
    if (templateUrl.startsWith('data:')) {
      const parsed = parseDataUrl(templateUrl)
      if (!parsed) throw new Error('Invalid template')
      templateBase64 = parsed.data
      templateMimeType = parsed.mimeType
    } else {
      const response = await fetch(templateUrl)
      const buffer = await response.arrayBuffer()
      templateBase64 = Buffer.from(buffer).toString('base64')
      templateMimeType = response.headers.get('content-type') || 'image/jpeg'
    }

    // Parse product photos
    const productPhotosBase64: { data: string; mimeType: string }[] = []
    for (const photoUrl of productPhotos) {
      if (photoUrl?.startsWith('data:')) {
        const parsed = parseDataUrl(photoUrl)
        if (parsed) productPhotosBase64.push(parsed)
      }
    }

    if (productPhotosBase64.length === 0) {
      return NextResponse.json({ error: 'No se pudieron procesar las fotos' }, { status: 400 })
    }

    // Get aspect ratio
    const aspectRatio = getAspectRatio(outputSize)

    // Generate image
    console.log('Generating image with gemini-2.5-flash-image for product:', productName)
    console.log('Aspect ratio:', aspectRatio)
    
    const imageResult = await generateImageWithGemini(
      apiKey,
      templateBase64,
      templateMimeType,
      productPhotosBase64,
      productName,
      aspectRatio,
      creativeControls
    )

    if (!imageResult) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo generar la imagen',
        tip: 'Verifica tu API key y facturacion de Google Cloud. El modelo gemini-2.5-flash-image requiere billing activo.'
      }, { status: 200 })
    }

    // Usar imagen de Gemini directamente (Sharp composition desactivado por problemas de fuentes en Vercel)
    const generatedImageUrl = `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`
    console.log('Banner generated successfully')

    // Save to database
    const serviceClient = await createServiceClient()
    const { data: insertedSection, error: insertError } = await serviceClient
      .from('landing_sections')
      .insert({
        product_id: productId,
        user_id: user.id,
        template_id: templateId || null,
        output_size: outputSize,
        generated_image_url: generatedImageUrl,
        prompt_used: `Product: ${productName}`,
        status: 'completed',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ 
        success: false,
        error: `Error guardando: ${insertError.message}`,
        imageUrl: generatedImageUrl
      }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      sectionId: insertedSection?.id,
    })
  } catch (error: any) {
    console.error('Generate error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
