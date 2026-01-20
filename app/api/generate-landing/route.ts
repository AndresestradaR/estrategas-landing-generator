import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
      .select('google_api_key, nano_banana_key')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.google_api_key) {
      return NextResponse.json({ error: 'Configura tu API key de Google en Settings' }, { status: 400 })
    }

    const googleApiKey = decrypt(profile.google_api_key)
    const nanoBananaKey = profile.nano_banana_key ? decrypt(profile.nano_banana_key) : null

    // Build the analysis prompt
    let userPrompt = `Analyze this landing page template and create a detailed image generation prompt.

PRODUCT TO FEATURE: ${productName}
${creativeControls?.productDetails ? `PRODUCT DETAILS: ${creativeControls.productDetails}` : ''}
${creativeControls?.salesAngle ? `SALES ANGLE: ${creativeControls.salesAngle}` : ''}
${creativeControls?.targetAvatar ? `TARGET CUSTOMER: ${creativeControls.targetAvatar}` : ''}
${creativeControls?.additionalInstructions ? `STYLE NOTES: ${creativeControls.additionalInstructions}` : ''}

Create a detailed prompt that describes how to recreate this template design but featuring the product above. Include specific details about layout, colors, text placement, and styling. The generated image should look professional and ready for a real e-commerce landing page.`

    // Use Gemini to analyze template and create prompt
    const genAI = new GoogleGenerativeAI(googleApiKey)
    
    // Prepare image parts for analysis
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

    // Use gemini-2.0-flash (current stable model with vision)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: LANDING_SYSTEM_PROMPT,
    })

    let enhancedPrompt: string

    try {
      const result = await model.generateContent([
        userPrompt,
        ...imageParts
      ])

      const response = await result.response
      enhancedPrompt = response.text()
    } catch (geminiError: any) {
      console.error('Gemini error:', geminiError)
      
      // If Gemini fails, create a basic prompt
      if (geminiError.message?.includes('quota') || geminiError.message?.includes('429')) {
        // Build fallback prompt without AI
        enhancedPrompt = `Professional e-commerce landing page section featuring ${productName}. 
${creativeControls?.productDetails ? `Product: ${creativeControls.productDetails}. ` : ''}
${creativeControls?.salesAngle ? `Sales angle: ${creativeControls.salesAngle}. ` : ''}
Modern design, clean layout, Spanish sales copy, high quality product photography, 
gradient background, professional lighting, ready for landing page use.
${creativeControls?.additionalInstructions || ''}`
      } else {
        return NextResponse.json({ 
          error: `Error de Google AI: ${geminiError.message}` 
        }, { status: 500 })
      }
    }

    // Now generate image with Nano Banana if available
    let generatedImageUrl = null

    if (nanoBananaKey) {
      try {
        const nanoBananaResponse = await fetch('https://api.nanobanana.net/v1/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nanoBananaKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: enhancedPrompt,
            aspect_ratio: outputSize === '1080x1920' ? '9:16' : '1:1',
            style: 'professional',
          }),
        })

        if (nanoBananaResponse.ok) {
          const nanoBananaData = await nanoBananaResponse.json()
          generatedImageUrl = nanoBananaData.image_url || nanoBananaData.url
        } else {
          console.error('Nano Banana error:', await nanoBananaResponse.text())
        }
      } catch (nbError) {
        console.error('Nano Banana error:', nbError)
      }
    }

    // If no Nano Banana or it failed, try Imagen (if available)
    if (!generatedImageUrl) {
      try {
        const imagenModel = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-002' })
        const imagenResult = await imagenModel.generateContent(enhancedPrompt)
        const imagenResponse = await imagenResult.response
        const imagenParts = imagenResponse.candidates?.[0]?.content?.parts || []
        
        for (const part of imagenParts) {
          if (part.inlineData?.mimeType?.startsWith('image/')) {
            generatedImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            break
          }
        }
      } catch (imagenError: any) {
        console.error('Imagen model error:', imagenError.message)
      }
    }

    // Return enhanced prompt even if image generation failed
    // This way the user can use the prompt elsewhere
    if (!generatedImageUrl) {
      return NextResponse.json({ 
        success: false,
        error: 'No se pudo generar la imagen. Configura tu API key de Nano Banana en Settings para mejor calidad.',
        enhancedPrompt: enhancedPrompt,
        tip: 'Puedes usar este prompt en otra herramienta de generación de imágenes.'
      }, { status: 200 }) // 200 because we have useful data
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
        generated_image_url: generatedImageUrl.substring(0, 500),
        prompt_used: enhancedPrompt.substring(0, 2000),
        status: 'completed',
      })

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      enhancedPrompt: enhancedPrompt,
    })
  } catch (error: any) {
    console.error('Generate landing API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al generar sección' 
    }, { status: 500 })
  }
}
