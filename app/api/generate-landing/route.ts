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
  
  // Build COMPLETE banner prompt (Gemini generates everything including text)
  const prompt = `You are creating a PROFESSIONAL E-COMMERCE BANNER in Spanish.

COMPOSITION (copy EXACTLY from the template image):
- Keep the SAME layout, positions, and structure as the template
- Keep ALL human models/people in the SAME poses
- Keep ALL decorative elements (splashes, fruits, effects)
- Keep price badges and offer sections in same positions
- Keep footer with trust badges

PRODUCT REPLACEMENT (CRITICAL):
- Replace ALL instances of the template product with the user's product
- The product in the model's hand must be replaced
- The large hero product must be replaced
- Preserve the user's product packaging, labels, and branding EXACTLY as shown in images 2+

TEXT REQUIREMENTS (VERY IMPORTANT):
- ALL text must be in SPANISH
- Use LARGE, BOLD, HIGHLY READABLE fonts
- Text must be PERFECTLY SPELLED - no gibberish, no random letters
- Copy the TEXT STYLE from the template (font size, positioning)
- Headlines should be impactful and sales-focused

FORBIDDEN:
- Do NOT remove any elements from the template
- Do NOT simplify the design
- Do NOT change the layout
- Do NOT generate misspelled or corrupted text
- Do NOT create gibberish letters

PRODUCT INFO:
Name: ${productName}
${creativeControls?.productDetails ? `Details: ${creativeControls.productDetails}` : ''}
${creativeControls?.salesAngle ? `Sales Angle: ${creativeControls.salesAngle}` : ''}
${creativeControls?.targetAvatar ? `Target Customer: ${creativeControls.targetAvatar}` : ''}
${creativeControls?.additionalInstructions ? `Special Instructions: ${creativeControls.additionalInstructions}` : ''}

Generate a banner that looks like an EXACT COPY of the template, with ONLY the product replaced and text adapted to the new product.`

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
