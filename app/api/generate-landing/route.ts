import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
import {
  generateImage,
  pollForResult,
  ImageProviderType,
  GenerateImageRequest,
} from '@/lib/image-providers'

function getAspectRatio(outputSize: string): '9:16' | '1:1' | '16:9' | '4:5' {
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
      creativeControls,
      provider = 'gemini', // Default to Gemini
      modelId, // New hierarchical model ID
      targetCountry,
      currencySymbol,
      priceAfter,
      priceBefore,
      priceCombo2,
      priceCombo3,
    } = body

    if (!templateUrl) {
      return NextResponse.json({ error: 'Plantilla requerida' }, { status: 400 })
    }

    if (!productPhotos || productPhotos.length === 0) {
      return NextResponse.json({ error: 'Al menos una foto del producto requerida' }, { status: 400 })
    }

    // Get API keys from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_api_key, openai_api_key, kie_api_key, bfl_api_key')
      .eq('id', user.id)
      .single()

    // Build API keys object
    const apiKeys: {
      gemini?: string
      openai?: string
      kie?: string
      bfl?: string
    } = {}

    if (profile?.google_api_key) {
      apiKeys.gemini = decrypt(profile.google_api_key)
    }
    if (profile?.openai_api_key) {
      apiKeys.openai = decrypt(profile.openai_api_key)
    }
    if (profile?.kie_api_key) {
      apiKeys.kie = decrypt(profile.kie_api_key)
    }
    if (profile?.bfl_api_key) {
      apiKeys.bfl = decrypt(profile.bfl_api_key)
    }

    // Also check environment variables as fallback
    if (!apiKeys.openai && process.env.OPENAI_API_KEY) {
      apiKeys.openai = process.env.OPENAI_API_KEY
    }
    if (!apiKeys.kie && process.env.KIE_API_KEY) {
      apiKeys.kie = process.env.KIE_API_KEY
    }
    if (!apiKeys.bfl && process.env.BFL_API_KEY) {
      apiKeys.bfl = process.env.BFL_API_KEY
    }

    // Validate we have the required API key for the selected provider
    const selectedProvider = provider as ImageProviderType
    const providerKeyMap: Record<ImageProviderType, keyof typeof apiKeys> = {
      gemini: 'gemini',
      openai: 'openai',
      seedream: 'kie',
      flux: 'bfl',
    }

    const requiredKey = providerKeyMap[selectedProvider]
    if (!apiKeys[requiredKey]) {
      const keyNames: Record<ImageProviderType, string> = {
        gemini: 'Google (Gemini)',
        openai: 'OpenAI',
        seedream: 'KIE.ai',
        flux: 'Black Forest Labs',
      }
      return NextResponse.json({
        error: `Configura tu API key de ${keyNames[selectedProvider]} en Settings`,
      }, { status: 400 })
    }

    // Check if templateUrl is a public URL or a data URL
    const isPublicUrl = templateUrl.startsWith('http://') || templateUrl.startsWith('https://')

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
    const productImagesBase64: { data: string; mimeType: string }[] = []
    for (const photoUrl of productPhotos) {
      if (photoUrl?.startsWith('data:')) {
        const parsed = parseDataUrl(photoUrl)
        if (parsed) productImagesBase64.push(parsed)
      }
    }

    if (productImagesBase64.length === 0) {
      return NextResponse.json({ error: 'No se pudieron procesar las fotos' }, { status: 400 })
    }

    // Get aspect ratio
    const aspectRatio = getAspectRatio(outputSize)

    // Build generation request with pricing data
    // Pass templateUrl only if it's a public URL (not a data URL)
    const generateRequest: GenerateImageRequest = {
      provider: selectedProvider,
      modelId: modelId, // Pass the specific model ID
      prompt: '', // Will be built by provider
      // Pass public URL for providers that support it (like KIE.ai Seedream)
      templateUrl: isPublicUrl ? templateUrl : undefined,
      templateBase64,
      templateMimeType,
      productImagesBase64,
      aspectRatio,
      productName,
      creativeControls: {
        ...creativeControls,
        // Include pricing from separate fields
        currencySymbol: currencySymbol || '$',
        priceAfter,
        priceBefore,
        priceCombo2,
        priceCombo3,
        // Include country
        targetCountry,
      },
    }

    console.log(`Generating image with ${selectedProvider} for product:`, productName)
    console.log('Aspect ratio:', aspectRatio)
    console.log('Template URL (public):', isPublicUrl ? templateUrl : 'N/A (user upload)')

    // Generate image
    let result = await generateImage(generateRequest, apiKeys)

    // For async providers, poll for result
    if (result.success && result.status === 'processing' && result.taskId) {
      console.log(`Task created: ${result.taskId}, polling for result...`)

      const apiKey = apiKeys[requiredKey]!
      result = await pollForResult(selectedProvider, result.taskId, apiKey, {
        maxAttempts: 120, // 2 minutes max
        intervalMs: 1000,
        timeoutMs: 120000,
      })
    }

    if (!result.success || !result.imageBase64) {
      return NextResponse.json({
        success: false,
        error: result.error || 'No se pudo generar la imagen',
        provider: selectedProvider,
        tip: getProviderTip(selectedProvider),
      }, { status: 200 })
    }

    // Build data URL
    const generatedImageUrl = `data:${result.mimeType};base64,${result.imageBase64}`
    console.log(`Banner generated successfully with ${selectedProvider}`)

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
        prompt_used: `Product: ${productName} | Provider: ${selectedProvider}`,
        status: 'completed',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: `Error guardando: ${insertError.message}`,
        imageUrl: generatedImageUrl,
      }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      sectionId: insertedSection?.id,
      provider: selectedProvider,
    })
  } catch (error: any) {
    console.error('Generate error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function getProviderTip(provider: ImageProviderType): string {
  const tips: Record<ImageProviderType, string> = {
    gemini: 'Verifica tu API key y facturación de Google Cloud. El modelo gemini-2.5-flash-image requiere billing activo.',
    openai: 'Verifica tu API key de OpenAI y que tengas créditos disponibles.',
    seedream: 'Verifica tu API key de KIE.ai y que tengas créditos disponibles.',
    flux: 'Verifica tu API key de Black Forest Labs y que tengas créditos disponibles.',
  }
  return tips[provider]
}
