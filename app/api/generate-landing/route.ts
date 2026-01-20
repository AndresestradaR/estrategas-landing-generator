import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'

// OPTIMIZED SYSTEM PROMPT - Reverse-engineered from Ecom Magic results
const LANDING_SYSTEM_PROMPT = `You are an expert e-commerce visual designer. Your job is to RECREATE a banner template with a NEW product.

CRITICAL INSTRUCTION - WHAT TO KEEP EXACTLY THE SAME:
1. PEOPLE/MODELS: Keep the EXACT same people, poses, body positions, facial expressions, clothing style
2. LAYOUT: Keep the EXACT same composition - where elements are placed (top, middle, bottom)
3. DESIGN ELEMENTS: Keep geometric shapes, gradients, diagonal lines, badges, icons in the SAME positions
4. TYPOGRAPHY STYLE: Keep the same font styles (bold headlines, smaller subtext) in SAME positions
5. VISUAL FLOW: Keep the same eye movement path through the design

CRITICAL INSTRUCTION - WHAT TO CHANGE:
1. PRODUCT: Replace the product the model is holding/showing with the USER'S PRODUCT (from product photos)
2. COLOR SCHEME: Change ALL colors to match the user's product packaging colors
   - Background gradients → match product colors
   - Accent colors → match product colors  
   - Text colors → complementary to new scheme
3. TEXT CONTENT: Generate NEW Spanish sales copy for the user's product
   - Headlines should be catchy Spanish sales phrases
   - Subtext should describe the product benefits
   - Keep text in the SAME positions as template
4. PRODUCT DETAILS: Show the user's actual product label/branding clearly

OUTPUT FORMAT:
Create a detailed image generation prompt that includes:
- Exact description of people (gender, age, ethnicity, pose, expression, clothing colors matching new scheme)
- Exact positions (top third, center, bottom third)  
- Specific color hex codes or descriptions based on user's product
- Spanish text with exact placement
- All decorative elements and their positions
- Lighting and effects to maintain

EXAMPLE TRANSFORMATION:
Template: Blue/red scheme, man holding protein powder, woman beside him, diagonal stripes
Result: Red/black scheme (matching new product), SAME man pose/expression, SAME woman pose, SAME diagonal stripes, NEW product in hand, NEW Spanish text`

// Helper to convert aspect ratio string to Gemini format
function getAspectRatio(outputSize: string): string {
  if (outputSize === '1080x1920' || outputSize === '9:16') return '9:16'
  if (outputSize === '1080x1080' || outputSize === '1:1') return '1:1'
  if (outputSize === '1920x1080' || outputSize === '16:9') return '16:9'
  if (outputSize === '1080x1350' || outputSize === '4:5') return '4:5'
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
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent'
  
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
  
  // 3. Add the prompt with VERY clear instructions
  const fullPrompt = `RECREATE THIS BANNER WITH A NEW PRODUCT:

IMAGE 1 = DESIGN TEMPLATE - Copy EVERYTHING about this design EXCEPT the product:
- Copy the EXACT same people/models (poses, expressions, clothing style)
- Copy the EXACT same layout and element positions
- Copy the EXACT same design style (shapes, gradients, badges)

IMAGES 2+ = USER'S PRODUCT - This is the NEW product to feature:
- Replace the template's product with THIS product
- Adapt ALL colors to match THIS product's packaging
- Generate Spanish text relevant to THIS product

${prompt}

FINAL REMINDER: The result should look like the SAME photo shoot but with a DIFFERENT product and color scheme.`

  parts.push({ text: fullPrompt })

  const payload = {
    contents: [{
      parts: parts
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
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

    // Build the analysis prompt with detailed context
    const userPrompt = `ANALYZE AND CREATE PROMPT FOR BANNER RECREATION:

=== TEMPLATE IMAGE (Image 1) ===
Analyze this design template carefully:
- What people/models are shown? (gender, approximate age, ethnicity, pose, expression)
- What is the layout? (element positions in top/middle/bottom thirds)
- What colors are used? (background, accents, text)
- What design elements exist? (shapes, gradients, badges, icons)
- What is the product being shown?

=== USER'S PRODUCT (Images 2+) ===
This is the product that must REPLACE the template's product:
- Product Name: ${productName}
${creativeControls?.productDetails ? `- Product Details: ${creativeControls.productDetails}` : ''}
${creativeControls?.salesAngle ? `- Sales Angle: ${creativeControls.salesAngle}` : ''}
${creativeControls?.targetAvatar ? `- Target Customer: ${creativeControls.targetAvatar}` : ''}
${creativeControls?.additionalInstructions ? `- Special Instructions: ${creativeControls.additionalInstructions}` : ''}

=== YOUR TASK ===
Create a DETAILED image generation prompt that will recreate the template with the user's product.

The prompt MUST specify:
1. KEEP SAME: Exact people descriptions (poses, expressions), layout positions, design element positions
2. CHANGE TO NEW: Colors matching user's product, the product itself, Spanish sales text

Generate compelling Spanish headlines and subtext for "${productName}".

Output only the image generation prompt, nothing else.`

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
        tip: 'Verifica que tu API key de Google tenga acceso a Gemini 2.5 Flash y facturación habilitada.'
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
