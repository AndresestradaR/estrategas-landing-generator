import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'

// OPTIMIZED SYSTEM PROMPT - Similar to Ecom Magic
const LANDING_SYSTEM_PROMPT = `You are an expert e-commerce visual designer specialized in creating high-converting landing page banners.

YOUR MISSION: Create a NEW image that uses the DESIGN LAYOUT from the template but features the USER'S PRODUCT.

CRITICAL RULES - YOU MUST FOLLOW:
1. KEEP the EXACT layout structure, composition, and visual hierarchy from the template
2. KEEP decorative elements: gradients, shapes, splashes, effects, icons, badges
3. REPLACE the product in the template with the user's product (described below)
4. REPLACE all text with new Spanish sales copy relevant to the user's product
5. CHANGE the color scheme to match the user's product colors
6. The result must look like a PROFESSIONAL e-commerce banner ready to use

WHAT TO ANALYZE FROM TEMPLATE:
- Layout: Where is the product? Text positions? Visual flow?
- Style elements: Gradients, shapes, decorative items, lighting effects
- Typography style: Bold headlines, sub-headlines placement
- Badges/icons positions and style

WHAT TO CHANGE:
- Product: Replace with user's product
- Colors: Adapt to user's product palette
- Text: New Spanish sales copy for the product
- Person (if any): Keep similar style but make it appropriate for the product

OUTPUT: Return ONLY a detailed image generation prompt in English. Be extremely specific about:
- Exact layout positions (top, center, bottom thirds)
- Color palette based on user's product
- Spanish text suggestions with exact placement
- Decorative elements to include
- Product positioning and lighting`

// Helper to convert aspect ratio string to Gemini format
function getAspectRatio(outputSize: string): string {
  if (outputSize === '1080x1920' || outputSize === '9:16') return '9:16'
  if (outputSize === '1080x1080' || outputSize === '1:1') return '1:1'
  if (outputSize === '1920x1080' || outputSize === '16:9') return '16:9'
  return '9:16' // Default for mobile landing pages
}

// Call Gemini API for image generation with BOTH template AND product photos
async function generateImageWithGemini(
  apiKey: string,
  prompt: string,
  aspectRatio: string,
  templateBase64?: string,
  templateMimeType?: string,
  productPhotosBase64?: { data: string; mimeType: string }[]
): Promise<{ imageBase64: string; mimeType: string } | null> {
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent'
  
  // Build the parts array - ORDER MATTERS!
  const parts: any[] = []
  
  // 1. First add template as design reference
  if (templateBase64 && templateMimeType) {
    parts.push({
      inline_data: {
        mime_type: templateMimeType,
        data: templateBase64
      }
    })
  }
  
  // 2. Add product photos - THE KEY TO PROPER REPLACEMENT
  if (productPhotosBase64 && productPhotosBase64.length > 0) {
    for (const photo of productPhotosBase64) {
      parts.push({
        inline_data: {
          mime_type: photo.mimeType,
          data: photo.data
        }
      })
    }
  }
  
  // 3. Add the prompt with clear instructions
  const fullPrompt = `IMPORTANT: 
- Image 1 is the DESIGN TEMPLATE - copy its layout, structure, and style
- Images 2+ are the USER'S PRODUCT - feature THIS product in the banner
- DO NOT copy the template's product, use the user's product photos

${prompt}`

  parts.push({ text: fullPrompt })

  const payload = {
    contents: [{
      parts: parts
    }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: aspectRatio
      }
    }
  }

  try {
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini Image API error:', errorText)
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    // Extract image from response
    const candidates = data.candidates || []
    for (const candidate of candidates) {
      const contentParts = candidate.content?.parts || []
      for (const part of contentParts) {
        if (part.inlineData?.data) {
          return {
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png'
          }
        }
      }
    }
    
    return null
  } catch (error: any) {
    console.error('Gemini Image generation error:', error)
    throw error
  }
}

// Call Gemini for prompt enhancement (text only) - includes product photos for analysis
async function enhancePromptWithGemini(
  apiKey: string,
  userPrompt: string,
  templateBase64?: string,
  templateMimeType?: string,
  productPhotosBase64?: { data: string; mimeType: string }[]
): Promise<string> {
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  
  const parts: any[] = []
  
  // Add template image first
  if (templateBase64 && templateMimeType) {
    parts.push({
      inline_data: {
        mime_type: templateMimeType,
        data: templateBase64
      }
    })
  }
  
  // Add product photos for analysis
  if (productPhotosBase64 && productPhotosBase64.length > 0) {
    for (const photo of productPhotosBase64) {
      parts.push({
        inline_data: {
          mime_type: photo.mimeType,
          data: photo.data
        }
      })
    }
  }
  
  parts.push({ text: userPrompt })

  const payload = {
    systemInstruction: {
      parts: [{ text: LANDING_SYSTEM_PROMPT }]
    },
    contents: [{
      parts: parts
    }]
  }

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return text
}

// Helper to convert data URL to base64 object
function parseDataUrl(dataUrl: string): { data: string; mimeType: string } | null {
  if (!dataUrl.startsWith('data:')) return null
  const [header, data] = dataUrl.split(',')
  const mimeType = header.split(':')[1]?.split(';')[0] || 'image/jpeg'
  return { data, mimeType }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      productId, 
      productName,
      templateId,
      templateUrl,
      productPhotos,
      outputSize,
      creativeControls 
    } = body

    if (!templateUrl) {
      return NextResponse.json({ error: 'Plantilla requerida' }, { status: 400 })
    }

    if (!productPhotos || productPhotos.length === 0) {
      return NextResponse.json({ error: 'Al menos una foto del producto requerida' }, { status: 400 })
    }

    // Get user's API keys
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_api_key')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.google_api_key) {
      return NextResponse.json({ error: 'Configura tu API key de Google en Settings' }, { status: 400 })
    }

    const googleApiKey = decrypt(profile.google_api_key)

    // Fetch and convert template image to base64
    let templateBase64: string | undefined
    let templateMimeType: string | undefined
    
    if (templateUrl.startsWith('data:')) {
      const parsed = parseDataUrl(templateUrl)
      if (parsed) {
        templateBase64 = parsed.data
        templateMimeType = parsed.mimeType
      }
    } else {
      try {
        const response = await fetch(templateUrl)
        const buffer = await response.arrayBuffer()
        templateBase64 = Buffer.from(buffer).toString('base64')
        templateMimeType = response.headers.get('content-type') || 'image/jpeg'
      } catch (e) {
        console.error('Error fetching template:', e)
        return NextResponse.json({ error: 'Error al cargar plantilla' }, { status: 500 })
      }
    }

    // Convert product photos to base64 array
    const productPhotosBase64: { data: string; mimeType: string }[] = []
    for (const photoUrl of productPhotos) {
      if (photoUrl.startsWith('data:')) {
        const parsed = parseDataUrl(photoUrl)
        if (parsed) {
          productPhotosBase64.push(parsed)
        }
      }
    }

    if (productPhotosBase64.length === 0) {
      return NextResponse.json({ error: 'No se pudieron procesar las fotos del producto' }, { status: 400 })
    }

    // Build the analysis prompt with more context
    const userPrompt = `TEMPLATE ANALYSIS REQUEST:

The first image is the DESIGN TEMPLATE to copy the layout from.
The following images are the USER'S PRODUCT that must appear in the final banner.

PRODUCT INFO:
- Name: ${productName}
${creativeControls?.productDetails ? `- Details: ${creativeControls.productDetails}` : ''}
${creativeControls?.salesAngle ? `- Sales Angle: ${creativeControls.salesAngle}` : ''}
${creativeControls?.targetAvatar ? `- Target Customer: ${creativeControls.targetAvatar}` : ''}
${creativeControls?.additionalInstructions ? `- Special Instructions: ${creativeControls.additionalInstructions}` : ''}

TASK: Create a detailed prompt to generate a landing page banner that:
1. Uses the EXACT layout and design style from the template
2. Features the USER'S PRODUCT (from the product photos) as the main product
3. Has NEW Spanish sales copy relevant to "${productName}"
4. Adapts colors to match the user's product

Analyze both the template design AND the product photos carefully.`

    // Step 1: Enhance the prompt using Gemini 2.0 Flash with ALL images
    let enhancedPrompt: string
    try {
      enhancedPrompt = await enhancePromptWithGemini(
        googleApiKey,
        userPrompt,
        templateBase64,
        templateMimeType,
        productPhotosBase64
      )
    } catch (error: any) {
      console.error('Prompt enhancement error:', error)
      // Fallback to basic prompt
      enhancedPrompt = `Professional e-commerce landing page banner for ${productName}. 
${creativeControls?.productDetails ? `Product: ${creativeControls.productDetails}. ` : ''}
${creativeControls?.salesAngle ? `Sales angle: ${creativeControls.salesAngle}. ` : ''}
Modern design with bold typography, clean layout, Spanish sales copy, 
high quality product photography, gradient background, professional lighting.
Vertical mobile-optimized layout (9:16 aspect ratio).
${creativeControls?.additionalInstructions || ''}`
    }

    // Step 2: Generate image with ALL images (template + product photos)
    const aspectRatio = getAspectRatio(outputSize)
    let generatedImageUrl: string | null = null

    try {
      const imageResult = await generateImageWithGemini(
        googleApiKey,
        enhancedPrompt,
        aspectRatio,
        templateBase64,
        templateMimeType,
        productPhotosBase64 // NOW PASSING PRODUCT PHOTOS!
      )

      if (imageResult) {
        generatedImageUrl = `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`
      }
    } catch (imageError: any) {
      console.error('Image generation error:', imageError)
      
      return NextResponse.json({ 
        success: false,
        error: `Error generando imagen: ${imageError.message}`,
        enhancedPrompt: enhancedPrompt,
        tip: 'Verifica que tu API key de Google tenga acceso a Gemini 2.5 Flash Image y facturación habilitada.'
      }, { status: 200 })
    }

    if (!generatedImageUrl) {
      return NextResponse.json({ 
        success: false,
        error: 'No se pudo generar la imagen. Verifica tu configuración de Google Cloud.',
        enhancedPrompt: enhancedPrompt,
        tip: 'Asegúrate de tener facturación habilitada en tu proyecto de Google Cloud.'
      }, { status: 200 })
    }

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
        prompt_used: enhancedPrompt.substring(0, 4000),
        status: 'completed',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json({ 
        success: false,
        error: `Error guardando sección: ${insertError.message}`,
        imageUrl: generatedImageUrl,
        tip: 'La imagen se generó pero no se pudo guardar. Verifica la configuración de la base de datos.'
      }, { status: 200 })
    }

    if (!insertedSection) {
      console.error('No section returned after insert')
      return NextResponse.json({ 
        success: false,
        error: 'Error guardando sección: no se retornó el registro insertado',
        imageUrl: generatedImageUrl,
        tip: 'La imagen se generó pero no se pudo guardar correctamente.'
      }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      enhancedPrompt: enhancedPrompt,
      sectionId: insertedSection.id,
    })
  } catch (error: any) {
    console.error('Generate landing API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al generar sección' 
    }, { status: 500 })
  }
}
