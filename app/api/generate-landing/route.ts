import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
import { GoogleGenerativeAI } from '@google/generative-ai'

const LANDING_SYSTEM_PROMPT = `You are an expert e-commerce landing page designer and image generator. Your task is to create professional, high-converting landing page sections by combining a reference template design with the user's product.

CRITICAL RULES:
1. MAINTAIN the exact visual style, layout structure, colors, and design elements from the reference template
2. REPLACE the product in the template with the user's product, maintaining similar positioning and scale
3. GENERATE relevant, compelling sales copy in Spanish that matches the product and target audience
4. KEEP the same visual hierarchy, typography style, and graphic elements (badges, icons, decorative elements)
5. ENSURE the final image looks professional, polished, and ready for a real landing page
6. NEVER add watermarks, signatures, or AI-generated artifacts
7. MATCH the energy and style of the original template (if it's bold and dynamic, keep that energy)

FOR TEXT GENERATION:
- Write all text in Spanish
- Create headlines that grab attention and highlight the main benefit
- Use persuasive copywriting techniques (urgency, social proof, benefits over features)
- Keep text concise and impactful
- Match the tone to the product (professional for health products, exciting for fitness, etc.)

OUTPUT REQUIREMENTS:
- High resolution, sharp and clear
- Professional e-commerce quality
- Ready to use in GemPages, Shopify, or any landing page builder
- Clean composition with proper spacing`

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

    // Get user's API key
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_api_key')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.google_api_key) {
      return NextResponse.json({ error: 'Configura tu API key de Google en Settings' }, { status: 400 })
    }

    const googleApiKey = decrypt(profile.google_api_key)

    // Build the prompt
    let userPrompt = `Create a professional landing page section image.

REFERENCE TEMPLATE: I'm providing a template image that shows the exact style, layout, and design I want.

PRODUCT: ${productName}
${creativeControls?.productDetails ? `PRODUCT DETAILS: ${creativeControls.productDetails}` : ''}
${creativeControls?.salesAngle ? `SALES ANGLE: ${creativeControls.salesAngle}` : ''}
${creativeControls?.targetAvatar ? `TARGET CUSTOMER: ${creativeControls.targetAvatar}` : ''}
${creativeControls?.additionalInstructions ? `ADDITIONAL INSTRUCTIONS: ${creativeControls.additionalInstructions}` : ''}

TASK: 
1. Analyze the reference template's design, layout, colors, and style
2. Replace the product shown with MY product (see product photos)
3. Generate new Spanish text that sells MY product while maintaining the template's visual style
4. Create a final image that looks like it was professionally designed for MY product

The result should look like the template was originally made for my product - professional, cohesive, and ready for a real landing page.`

    // Generate with Nano Banana Pro
    const genAI = new GoogleGenerativeAI(googleApiKey)
    
    // Prepare image parts
    const imageParts = []
    
    // Add template image
    if (templateUrl.startsWith('data:')) {
      const base64Data = templateUrl.split(',')[1]
      const mimeType = templateUrl.split(';')[0].split(':')[1]
      imageParts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      })
    } else {
      // Fetch external URL and convert to base64
      try {
        const response = await fetch(templateUrl)
        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const contentType = response.headers.get('content-type') || 'image/jpeg'
        imageParts.push({
          inlineData: {
            data: base64,
            mimeType: contentType
          }
        })
      } catch (e) {
        console.error('Error fetching template:', e)
        return NextResponse.json({ error: 'Error al cargar plantilla' }, { status: 500 })
      }
    }

    // Add product photos
    for (const photo of productPhotos) {
      if (photo.startsWith('data:')) {
        const base64Data = photo.split(',')[1]
        const mimeType = photo.split(';')[0].split(':')[1]
        imageParts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        })
      }
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      systemInstruction: LANDING_SYSTEM_PROMPT,
    })

    const result = await model.generateContent([
      userPrompt,
      ...imageParts
    ])

    const response = await result.response
    const parts = response.candidates?.[0]?.content?.parts || []
    
    let generatedImageUrl = null
    
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        generatedImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        break
      }
    }

    if (!generatedImageUrl) {
      // If no image, try with imagen model
      const imagenModel = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-002' })
      
      // Create a text-only prompt for Imagen
      const imagenPrompt = `${LANDING_SYSTEM_PROMPT}

${userPrompt}

Style: Professional e-commerce landing page section, high quality, clean design, modern layout, compelling Spanish sales copy visible in the image.`
      
      try {
        const imagenResult = await imagenModel.generateContent(imagenPrompt)
        const imagenResponse = await imagenResult.response
        const imagenParts = imagenResponse.candidates?.[0]?.content?.parts || []
        
        for (const part of imagenParts) {
          if (part.inlineData?.mimeType?.startsWith('image/')) {
            generatedImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            break
          }
        }
      } catch (imagenError) {
        console.error('Imagen model error:', imagenError)
      }
    }

    if (!generatedImageUrl) {
      return NextResponse.json({ 
        error: 'No se pudo generar la imagen. Intenta con otra plantilla o fotos diferentes.' 
      }, { status: 500 })
    }

    // Save to database
    const serviceClient = await createServiceClient()
    await serviceClient
      .from('landing_sections')
      .insert({
        product_id: productId,
        user_id: user.id,
        template_id: templateId || null,
        output_size: outputSize,
        generated_image_url: generatedImageUrl.substring(0, 100) + '...', // Store truncated for DB
        prompt_used: userPrompt.substring(0, 1000),
        status: 'completed',
      })

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
    })
  } catch (error: any) {
    console.error('Generate landing API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al generar sección' 
    }, { status: 500 })
  }
}
