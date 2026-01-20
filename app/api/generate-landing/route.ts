import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'

const COPYWRITING_SYSTEM_PROMPT = `Eres un experto copywriter de e-commerce en español para Latinoamérica.

Tu tarea es generar textos de marketing CORTOS y PODEROSOS para un banner de producto.

REGLAS CRITICAS:
- Textos MUY CORTOS (máximo 4-5 palabras por línea)
- TODO EN MAYUSCULAS para impacto visual
- Usa palabras que vendan: GRATIS, OFERTA, RESULTADOS, POTENCIA, TRANSFORMA, PREMIUM
- SIN tildes/acentos (escribir POTENCIA no POTÉNCIA, FORMULA no FÓRMULA)
- Frases que generen urgencia y deseo
- Si ves fotos del producto, identifica qué tipo de producto es y genera copy relevante

Responde SOLO en JSON con esta estructura exacta:
{
  "headline": "TEXTO PRINCIPAL (max 5 palabras, sin tildes)",
  "subheadline": "SUBTITULO PERSUASIVO (max 6 palabras, sin tildes)", 
  "cta": "LLAMADO A ACCION (max 3 palabras)",
  "footer": "BENEFICIO CLAVE (max 6 palabras, sin tildes)"
}

EJEMPLOS BUENOS:
- Headlines: "TRANSFORMA TU CUERPO", "RESULTADOS REALES", "POTENCIA MAXIMA", "BELLEZA NATURAL"
- Subheadlines: "EN SOLO 30 DIAS", "FORMULA PROFESIONAL", "CALIDAD PREMIUM"
- CTAs: "COMPRAR AHORA", "LO QUIERO", "PEDIR HOY"
- Footers: "ENVIO GRATIS + PAGO CONTRAENTREGA", "GARANTIA 100% SATISFACCION"`

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

// Remove accents from text to avoid rendering issues
function removeAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
}

// STEP 1: Generate marketing copy analyzing images + optional user input
async function generateMarketingCopy(
  apiKey: string,
  productName: string,
  productPhotosBase64: { data: string; mimeType: string }[],
  creativeControls?: {
    productDetails?: string
    salesAngle?: string
    targetAvatar?: string
    additionalInstructions?: string
  }
): Promise<{ headline: string; subheadline: string; cta: string; footer: string }> {
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  
  const parts: any[] = []
  
  // Add product photos for visual analysis
  for (const photo of productPhotosBase64) {
    parts.push({
      inline_data: { mime_type: photo.mimeType, data: photo.data }
    })
  }
  
  // Build prompt based on available info
  const hasUserInput = creativeControls?.productDetails || creativeControls?.salesAngle || creativeControls?.targetAvatar
  
  let promptText = ''
  
  if (hasUserInput) {
    // User provided info - use it
    promptText = `Genera textos de marketing para este producto:

NOMBRE: ${productName}
${creativeControls?.productDetails ? `DESCRIPCION DEL PRODUCTO: ${creativeControls.productDetails}` : ''}
${creativeControls?.salesAngle ? `ANGULO DE VENTA: ${creativeControls.salesAngle}` : ''}
${creativeControls?.targetAvatar ? `CLIENTE IDEAL: ${creativeControls.targetAvatar}` : ''}
${creativeControls?.additionalInstructions ? `INSTRUCCIONES ADICIONALES: ${creativeControls.additionalInstructions}` : ''}

Las imagenes adjuntas son fotos del producto. Usa la informacion proporcionada para crear textos de marketing perfectos.

Genera textos CORTOS, PODEROSOS, en MAYUSCULAS y SIN TILDES.`
  } else {
    // No user input - analyze images
    promptText = `Analiza las imagenes del producto adjuntas y genera textos de marketing.

NOMBRE DEL PRODUCTO: ${productName}

INSTRUCCIONES:
1. Mira las fotos del producto cuidadosamente
2. Identifica que tipo de producto es (suplemento, cosmetico, electronico, ropa, etc)
3. Identifica los colores y estilo del producto
4. Genera textos de marketing relevantes para ESE tipo de producto

Genera textos CORTOS, PODEROSOS, en MAYUSCULAS y SIN TILDES.
Los textos deben ser relevantes para lo que VES en las imagenes.`
  }
  
  parts.push({ text: promptText })

  try {
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: COPYWRITING_SYSTEM_PROMPT }] },
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
    })

    if (!response.ok) {
      throw new Error('API error')
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    const copy = JSON.parse(text)
    return {
      headline: removeAccents(copy.headline || 'CALIDAD PREMIUM'),
      subheadline: removeAccents(copy.subheadline || 'RESULTADOS INCREIBLES'),
      cta: removeAccents(copy.cta || 'COMPRAR AHORA'),
      footer: removeAccents(copy.footer || 'ENVIO GRATIS')
    }
  } catch (error) {
    console.error('Copywriting error:', error)
    // Fallback texts
    const cleanName = removeAccents(productName).slice(0, 25)
    return {
      headline: cleanName,
      subheadline: 'RESULTADOS GARANTIZADOS',
      cta: 'COMPRAR AHORA',
      footer: 'ENVIO GRATIS + PAGO CONTRAENTREGA'
    }
  }
}

// STEP 2: Generate image with exact texts
async function generateImageWithGemini(
  apiKey: string,
  templateBase64: string,
  templateMimeType: string,
  productPhotosBase64: { data: string; mimeType: string }[],
  marketingCopy: { headline: string; subheadline: string; cta: string; footer: string },
  productName: string
): Promise<{ imageBase64: string; mimeType: string } | null> {
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'
  
  const parts: any[] = []
  
  // Add template first
  parts.push({
    inline_data: { mime_type: templateMimeType, data: templateBase64 }
  })
  
  // Add product photos
  for (const photo of productPhotosBase64) {
    parts.push({
      inline_data: { mime_type: photo.mimeType, data: photo.data }
    })
  }
  
  // Prompt with EXACT texts
  const prompt = `RECREATE THIS BANNER FOR A NEW PRODUCT.

=== IMAGES PROVIDED ===
IMAGE 1: Design template - copy the EXACT layout, people poses, design elements, visual style
IMAGES 2+: The NEW product that must appear in the banner

=== PRODUCT ===
Name: ${productName}

=== CRITICAL: EXACT TEXTS TO WRITE ===
You MUST write these texts EXACTLY as shown. Copy character by character. Do NOT modify, translate, or change anything:

HEADLINE (large bold text, prominent position): "${marketingCopy.headline}"
SUBHEADLINE (medium text, below headline): "${marketingCopy.subheadline}"
CTA (call to action, button style or highlighted): "${marketingCopy.cta}"
FOOTER (smaller text at bottom): "${marketingCopy.footer}"

=== DESIGN INSTRUCTIONS ===
1. LAYOUT: Copy the EXACT same layout from the template (positions, composition, visual hierarchy)
2. PEOPLE/MODELS: Keep the EXACT same people with same poses, expressions, clothing style
3. PRODUCT: Replace the template's product with the product from images 2+
4. COLORS: Adapt the color scheme to match the new product's packaging colors
5. TEXTS: Write the texts EXACTLY as provided above - large, bold, easy to read
6. QUALITY: Professional e-commerce banner quality, ready to use

IMPORTANT: The texts must be written EXACTLY as provided. Do not add accents, do not change words, do not translate. Copy them exactly.`

  parts.push({ text: prompt })

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
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

    // ============ STEP 1: Generate Marketing Copy ============
    console.log('Step 1: Generating marketing copy...')
    const marketingCopy = await generateMarketingCopy(
      apiKey,
      productName,
      productPhotosBase64,
      creativeControls
    )
    console.log('Generated copy:', marketingCopy)

    // ============ STEP 2: Generate Image with Exact Texts ============
    console.log('Step 2: Generating image...')
    
    const imageResult = await generateImageWithGemini(
      apiKey,
      templateBase64,
      templateMimeType,
      productPhotosBase64,
      marketingCopy,
      productName
    )

    if (!imageResult) {
      return NextResponse.json({ 
        success: false,
        error: 'No se pudo generar la imagen',
        tip: 'Verifica tu API key y facturacion de Google Cloud'
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
        prompt_used: JSON.stringify(marketingCopy),
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
