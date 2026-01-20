import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
import { composeBanner, getDefaultBenefits } from '@/lib/banner-composer'

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
  
  // Build PHOTO-ONLY prompt (text/icons added by code later)
  const systemInstruction = {
    role: "ecommerce_photographer",
    task: "generate_photo_layer_only",
    critical: "NO TEXT, NO ICONS, NO LOGOS - I will add those as vector layers later",
    images: {
      image_1: "COMPOSITION GUIDE - Copy this layout structure, leave empty spaces where text/icons go",
      image_2_plus: "PRODUCT REFERENCE - Use this product's shape/colors for the jars in the scene"
    },
    composition: {
      top_left_25_percent: "EMPTY - clean space for headline (I add later)",
      left_column: "EMPTY - clean space for 3 circular icons (I add later)",
      right_side: creativeControls?.targetAvatar || "Fitness model, 40% width",
      bottom_center: `Large hero ${productName} with realistic shadow`,
      model_hand: "Small product jar (same style, no readable label)",
      bottom_strip: "Relatively clean for footer (I add later)"
    },
    style: {
      background: "White with very soft pink/purple gradient, premium look",
      model: creativeControls?.targetAvatar || "Woman 22-35, athletic, confident smile, sportswear, fitness pose",
      effects: "Powder splash behind hero jar, subtle decorative elements on floor near jar",
      lighting: "Studio lighting, sharp focus, coherent shadows, realistic skin",
      quality: "Commercial supplement photography, 8K, professional"
    },
    product_details: {
      name: productName,
      info: creativeControls?.productDetails || "Analyze from product photos",
      sales_angle: creativeControls?.salesAngle || null
    },
    custom_instructions: creativeControls?.additionalInstructions || null,
    strict_rules: {
      FORBIDDEN: [
        "ANY text, letters, numbers, typography",
        "ANY logos, brands, watermarks, stamps",
        "ANY readable labels on products",
        "ANY icons or badges",
        "Deformed hands, extra fingers",
        "Cluttered backgrounds",
        "Duplicate jars"
      ],
      REQUIRED: [
        "Large empty spaces for text overlay",
        "Minimalist aesthetic",
        "Wide white/clean areas on left side"
      ]
    },
    output: {
      type: "photo_layer_only",
      aspect_ratio: aspectRatio,
      ready_for: "text and icon overlay by code"
    }
  }

  const prompt = `SYSTEM INSTRUCTION:
${JSON.stringify(systemInstruction, null, 2)}

Generate ONLY the photographic layer.

CRITICAL RULES:
- NO TEXT of any kind (I add text with code later)
- NO ICONS or badges (I add icons with code later)
- NO readable labels on products
- NO logos or watermarks

LEAVE CLEAN EMPTY SPACES:
- Top-left area: empty for headline
- Left column: empty for benefit icons
- Bottom strip: relatively clean for footer

FOCUS ON:
- Beautiful model matching the target customer
- Hero product jar with realistic lighting/shadows
- Premium gradient background
- Powder/splash effects for energy
- Professional commercial photography quality

${creativeControls?.additionalInstructions ? `CUSTOM INSTRUCTIONS: ${creativeControls.additionalInstructions}` : ''}

The output must be a CLEAN PHOTO BASE ready for text/icon overlay.`

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

    // PASO 2: Componer capas de texto/iconos sobre la foto
    console.log('Composing banner with text/icons overlay...')

    let finalImageUrl: string

    try {
      // Convertir base64 a Buffer
      const photoBuffer = Buffer.from(imageResult.imageBase64, 'base64')

      // Determinar tipo de producto para íconos por defecto
      const productType = detectProductType(productName, creativeControls?.productDetails || '')

      // Generar textos de marketing
      const headline = creativeControls?.salesAngle
        ? creativeControls.salesAngle.toUpperCase().slice(0, 30)
        : `${productName.toUpperCase().slice(0, 25)}`

      const subheadline = creativeControls?.productDetails
        ? creativeControls.productDetails.slice(0, 50).toUpperCase()
        : 'RESULTADOS GARANTIZADOS'

      // Componer banner final con capas
      const composedBuffer = await composeBanner({
        baseImage: photoBuffer,
        productName,
        headline,
        subheadline,
        benefits: getDefaultBenefits(productType),
        price: '$49.99', // TODO: hacer configurable
        footer: {
          badges: ['ENVÍO GRATIS', 'PAGO CONTRAENTREGA', 'GARANTÍA 100%']
        },
        aspectRatio: aspectRatio as '9:16' | '1:1' | '4:5' | '16:9',
        colorScheme: {
          primary: '#FF1493',
          secondary: '#8B5CF6',
          text: '#FFFFFF',
          accent: '#FFD700',
        }
      })

      finalImageUrl = `data:image/png;base64,${composedBuffer.toString('base64')}`
      console.log('Banner composed successfully')
    } catch (composeError: any) {
      // Si falla la composición, usar la imagen de Gemini directamente
      console.error('Composition failed, using raw Gemini image:', composeError.message)
      finalImageUrl = `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`
    }

    const generatedImageUrl = finalImageUrl

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
