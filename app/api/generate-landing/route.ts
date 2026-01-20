import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'

const LANDING_SYSTEM_PROMPT = `You are an expert e-commerce landing page designer. Your task is to create a detailed prompt for generating professional, high-converting landing page section images.

CRITICAL RULES:
1. ANALYZE the reference template's design, layout structure, colors, and design elements
2. CREATE a detailed prompt that will REPLACE the product with the user's product
3. GENERATE relevant, compelling sales copy suggestions in Spanish
4. KEEP the same visual hierarchy, typography style, and graphic elements
5. ENSURE the prompt describes a professional, polished landing page section

OUTPUT FORMAT:
Return ONLY a detailed image generation prompt in English that describes:
- The exact layout and composition from the template
- The user's product positioned like in the template
- Colors and design elements to maintain
- Spanish text suggestions for headlines and copy
- Professional e-commerce quality standards

Be extremely specific and detailed for best results with image generation AI.`

// Helper to convert aspect ratio string to Gemini format
function getAspectRatio(outputSize: string): string {
  if (outputSize === '1080x1920' || outputSize === '9:16') return '9:16'
  if (outputSize === '1080x1080' || outputSize === '1:1') return '1:1'
  if (outputSize === '1920x1080' || outputSize === '16:9') return '16:9'
  return '9:16' // Default for mobile landing pages
}

// Call Gemini API directly via REST for image generation
async function generateImageWithGemini(
  apiKey: string,
  prompt: string,
  aspectRatio: string,
  templateBase64?: string,
  templateMimeType?: string
): Promise<{ imageBase64: string; mimeType: string } | null> {
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent'
  
  // Build the parts array
  const parts: any[] = [{ text: prompt }]
  
  // Add template image as reference if provided
  if (templateBase64 && templateMimeType) {
    parts.unshift({
      inline_data: {
        mime_type: templateMimeType,
        data: templateBase64
      }
    })
    // Prepend instruction to use template as reference
    parts[1] = { 
      text: `Use the provided image as a design reference/template. Recreate a similar layout and style but with the following content:\n\n${prompt}`
    }
  }

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

// Call Gemini for prompt enhancement (text only)
async function enhancePromptWithGemini(
  apiKey: string,
  userPrompt: string,
  templateBase64?: string,
  templateMimeType?: string
): Promise<string> {
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  
  const parts: any[] = []
  
  // Add template image if provided
  if (templateBase64 && templateMimeType) {
    parts.push({
      inline_data: {
        mime_type: templateMimeType,
        data: templateBase64
      }
    })
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
      templateBase64 = templateUrl.split(',')[1]
      templateMimeType = templateUrl.split(';')[0].split(':')[1]
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

    // Build the analysis prompt
    const userPrompt = `Analyze this landing page template and create a detailed image generation prompt.

PRODUCT TO FEATURE: ${productName}
${creativeControls?.productDetails ? `PRODUCT DETAILS: ${creativeControls.productDetails}` : ''}
${creativeControls?.salesAngle ? `SALES ANGLE: ${creativeControls.salesAngle}` : ''}
${creativeControls?.targetAvatar ? `TARGET CUSTOMER: ${creativeControls.targetAvatar}` : ''}
${creativeControls?.additionalInstructions ? `STYLE NOTES: ${creativeControls.additionalInstructions}` : ''}

Create a detailed prompt that describes how to recreate this template design but featuring the product above. Include specific details about layout, colors, text placement, and styling. The generated image should look professional and ready for a real e-commerce landing page.`

    // Step 1: Enhance the prompt using Gemini 2.0 Flash (fast, cheap)
    let enhancedPrompt: string
    try {
      enhancedPrompt = await enhancePromptWithGemini(
        googleApiKey,
        userPrompt,
        templateBase64,
        templateMimeType
      )
    } catch (error: any) {
      console.error('Prompt enhancement error:', error)
      // Fallback to basic prompt
      enhancedPrompt = `Professional e-commerce landing page section featuring ${productName}. 
${creativeControls?.productDetails ? `Product: ${creativeControls.productDetails}. ` : ''}
${creativeControls?.salesAngle ? `Sales angle: ${creativeControls.salesAngle}. ` : ''}
Modern design with bold typography, clean layout, Spanish sales copy, 
high quality product photography, gradient background, professional lighting.
Vertical mobile-optimized layout (9:16 aspect ratio).
${creativeControls?.additionalInstructions || ''}`
    }

    // Step 2: Generate image using Gemini 2.5 Flash Image
    const aspectRatio = getAspectRatio(outputSize)
    let generatedImageUrl: string | null = null

    try {
      const imageResult = await generateImageWithGemini(
        googleApiKey,
        enhancedPrompt,
        aspectRatio,
        templateBase64,
        templateMimeType
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

    // Save to database - IMPORTANT: Handle errors properly
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
      // Return error instead of silently failing
      return NextResponse.json({ 
        success: false,
        error: `Error guardando sección: ${insertError.message}`,
        imageUrl: generatedImageUrl, // Still provide the image
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
