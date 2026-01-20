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
  
  // Build visual-only art director prompt (NO text on image)
  const systemInstruction = {
    ROLE: "Expert E-commerce Art Director & Visual Synthesizer",
    CRITICAL_INSTRUCTION: "Do NOT write any text, words, or letters on the image. Use the JSON values ONLY as creative direction to generate VISUAL elements. The final image must be TEXT-FREE.",
    task: "Creative Visual Fusion based on Template Structure",
    structure_guide: {
      source_template: "Analyze IMAGE 1 for layout, composition, and visual style reference",
      layout_rule: "Maintain similar composition structure - subject area and content/graphics area"
    },
    visual_elements_to_render: {
      subject_person: {
        description: creativeControls?.targetAvatar || "Person that matches the product's target demographic",
        style: "Hyper-realistic photo, NOT cartoon, high energy expression, dynamic pose",
        custom: creativeControls?.additionalInstructions || null
      },
      product_item: {
        description: `A photorealistic ${productName}`,
        source: "Use the EXACT product appearance from IMAGES 2+",
        placement: "Held naturally by the person or integrated into the scene foreground",
        detail: creativeControls?.productDetails || "Show product with hyper-realistic detail"
      },
      pain_point_icons: {
        description: "A collection of 3D glassmorphism icons floating in the composition",
        concept: creativeControls?.salesAngle || "Icons representing the product's key benefits",
        style: "Glossy 3D glassmorphism with subtle glow effects",
        composition_rule: "Arrange them in a visually appealing flow"
      }
    },
    aesthetic: {
      style: "Premium 8K advertising photography, vibrant colors, studio lighting",
      mood: "Explosive energy, success, premium quality",
      lighting: "Cinematic studio lighting with rim light to separate subject from background",
      aspect_ratio: aspectRatio
    },
    ABSOLUTE_FORBIDDEN: {
      never_include: [
        "ANY text or writing",
        "ANY letters or words",
        "Labels with text",
        "Watermarks",
        "Cartoon style",
        "Blurry elements",
        "Distorted faces or limbs"
      ]
    }
  }

  const prompt = `You are an EXPERT E-COMMERCE ART DIRECTOR creating a VISUAL-ONLY banner.

CRITICAL: DO NOT RENDER ANY TEXT ON THE IMAGE. No words, no letters, no writing. ONLY visual elements.

CREATIVE DIRECTION:
${JSON.stringify(systemInstruction, null, 2)}

IMAGE INPUTS:
- IMAGE 1: Template for STYLE and COMPOSITION reference only
- IMAGES 2+: The ACTUAL PRODUCT - render this with hyper-realistic detail

WHAT TO CREATE:
1. A dynamic subject/person matching the target customer
2. The product from images 2+ shown prominently with realistic detail
3. Floating 3D glassmorphism icons representing product benefits
4. Premium gradient background
5. Cinematic lighting

WHAT TO ABSOLUTELY AVOID:
- ANY text, words, letters, or writing
- Cartoon or illustrated style
- Blurry or low quality elements
- Distorted faces or anatomy

The user will add text later in editing software. Your job is to create a stunning TEXT-FREE visual composition.`

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
