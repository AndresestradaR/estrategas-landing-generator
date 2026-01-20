import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'

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
  
  // Build strict replication prompt
  const systemInstruction = {
    role: "banner_replicator",
    task: "EXACT_REPLICA_with_product_swap",
    critical_rules: {
      KEEP_EXACTLY_THE_SAME: [
        "ALL human models/people - EXACT same poses, positions, expressions, clothing",
        "ALL icons and their EXACT positions",
        "ALL price tags, offer badges, discount labels",
        "ALL text areas with SAME font sizes and styles",
        "ALL decorative elements (fruits, splashes, shapes, gradients)",
        "Footer with trust badges if present",
        "Background style, colors, and gradients",
        "Overall composition, layout, and visual hierarchy",
        "Lighting and shadow styles"
      ],
      ONLY_CHANGE_THESE: [
        "Replace the product/packaging with user's product from images 2+",
        "Adapt text CONTENT to user's product (but keep SAME font size/style/position)"
      ],
      ABSOLUTELY_FORBIDDEN: [
        "Removing ANY element from the template",
        "Changing layout or element positions",
        "Making the design simpler or different",
        "Changing font sizes or text positions",
        "Spelling errors in Spanish text",
        "Gibberish or corrupted text",
        "Inventing new design elements not in template"
      ]
    },
    images: {
      image_1: "MASTER_TEMPLATE - This is your EXACT reference. Copy EVERYTHING except the product.",
      image_2_plus: "USER_PRODUCT - This product REPLACES the template's product. Show it clearly with its real packaging/labels."
    },
    product_info: {
      name: productName,
      details: creativeControls?.productDetails || null,
      sales_angle: creativeControls?.salesAngle || null,
      target_customer: creativeControls?.targetAvatar || null,
      special_instructions: creativeControls?.additionalInstructions || null
    },
    text_rules: {
      language: "Spanish",
      style: "UPPERCASE for headlines",
      quality: "Perfect spelling, NO errors, NO gibberish",
      sizing: "LARGE and BOLD - same sizes as template"
    },
    output: {
      type: "EXACT_REPLICA_banner",
      quality: "indistinguishable_from_template_except_product",
      aspect_ratio: aspectRatio
    }
  }

  const prompt = `YOU ARE A BANNER REPLICATOR. Your job is to create an EXACT COPY of the template with ONLY the product swapped.

INSTRUCTION (JSON):
${JSON.stringify(systemInstruction, null, 2)}

CRITICAL: The output should look like the SAME EXACT photo/design - same people, same poses, same icons, same layout, same everything. The ONLY difference is the product shown must be from images 2+.

Think of it like Photoshop - you're just replacing the product layer, nothing else changes.`

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

    const generatedImageUrl = `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`

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
