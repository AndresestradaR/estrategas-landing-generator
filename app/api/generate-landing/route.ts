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
  
  // Build adaptive creative prompt
  const systemInstruction = {
    role: "ecommerce_creative_director",
    task: "CREATE_STUNNING_BANNER_inspired_by_template",
    understanding: {
      image_1: "STYLE REFERENCE - Use this template for inspiration on layout, design quality, and visual style",
      image_2_plus: "THE ACTUAL PRODUCT - Feature this product prominently with its real packaging and branding"
    },
    creative_approach: {
      template_usage: "Use as INSPIRATION for quality and style, NOT as exact copy",
      product_focus: "The new product is the STAR - everything should support selling THIS product",
      smart_adaptation: [
        "Generate icons/graphics that make sense for THIS product (e.g., muscle icons for fitness, beauty icons for cosmetics, growth charts for supplements)",
        "Choose models/people that match the target customer for THIS product",
        "Select colors that complement THIS product's packaging",
        "Write compelling text specifically for THIS product's benefits"
      ]
    },
    product_info: {
      name: productName,
      details: creativeControls?.productDetails || "Analyze the product from the photos",
      sales_angle: creativeControls?.salesAngle || "Create a compelling sales angle based on the product",
      target_customer: creativeControls?.targetAvatar || "Determine ideal customer from product type",
      special_instructions: creativeControls?.additionalInstructions || null
    },
    user_instructions_priority: {
      note: "If the user provides specific instructions in 'special_instructions', FOLLOW THEM EXACTLY",
      examples: [
        "If user says 'change girl to guy' -> use a male model",
        "If user says 'white background' -> use white background",
        "If user says 'add muscle icons' -> add relevant muscle/fitness icons",
        "User instructions OVERRIDE template elements"
      ]
    },
    design_requirements: {
      quality: "Professional, high-end e-commerce quality like top Shopify stores",
      text: {
        language: "Spanish",
        style: "BOLD, UPPERCASE headlines that SELL",
        content: "Compelling copy specific to THIS product - benefits, offers, CTAs",
        forbidden: ["spelling errors", "gibberish", "corrupted text", "random letters"]
      },
      visual_elements: [
        "Product shown clearly with real packaging/labels from images 2+",
        "Relevant icons that support the product's benefits",
        "Trust badges, offer tags, price displays as appropriate",
        "Eye-catching but professional color scheme"
      ]
    },
    output: {
      type: "sales_ready_banner",
      quality: "professional_ecommerce",
      aspect_ratio: aspectRatio
    }
  }

  const prompt = `You are a TOP E-COMMERCE CREATIVE DIRECTOR creating a banner that SELLS.

CONTEXT:
${JSON.stringify(systemInstruction, null, 2)}

YOUR MISSION:
1. Look at the TEMPLATE (image 1) for STYLE INSPIRATION - quality level, layout ideas, visual approach
2. Look at the PRODUCT PHOTOS (images 2+) - this is what you're selling
3. Create a STUNNING banner that would make someone want to BUY this product

BE CREATIVE AND SMART:
- Add icons/graphics that make sense for THIS product (fitness icons for supplements, beauty elements for cosmetics, etc.)
- Use models/people that match who would BUY this product
- Write Spanish text that highlights THIS product's specific benefits
- Make design choices that SUPPORT SELLING this product

${creativeControls?.additionalInstructions ? `
IMPORTANT - USER'S SPECIFIC INSTRUCTIONS (FOLLOW EXACTLY):
${creativeControls.additionalInstructions}
` : ''}

Create a banner so good it could be used by a top e-commerce brand TODAY.`

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
