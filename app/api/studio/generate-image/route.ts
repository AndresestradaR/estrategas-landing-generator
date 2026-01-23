import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
import {
  generateImage,
  pollForResult,
  ImageProviderType,
  GenerateImageRequest,
  IMAGE_MODELS,
  modelIdToProviderType,
  type ImageModelId,
} from '@/lib/image-providers'

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
      modelId,
      prompt,
      aspectRatio = '1:1',
      quality = '1k',
      referenceImages,
    } = body as {
      modelId: ImageModelId
      prompt: string
      aspectRatio?: string
      quality?: string
      referenceImages?: { data: string; mimeType: string }[]
    }

    if (!modelId || !prompt) {
      return NextResponse.json(
        { error: 'Modelo y prompt son requeridos' },
        { status: 400 }
      )
    }

    // Validate model exists
    const modelConfig = IMAGE_MODELS[modelId]
    if (!modelConfig) {
      return NextResponse.json(
        { error: 'Modelo no encontrado' },
        { status: 400 }
      )
    }

    // Get API keys from profile - EXACTLY like generate-landing
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_api_key, openai_api_key, kie_api_key, bfl_api_key')
      .eq('id', user.id)
      .single()

    // Build API keys object - EXACTLY like generate-landing
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

    // Get provider from model
    const selectedProvider = modelIdToProviderType(modelId)

    // Validate we have the required API key - EXACTLY like generate-landing
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

    // Parse reference images if provided
    const productImagesBase64: { data: string; mimeType: string }[] = []
    if (referenceImages && referenceImages.length > 0) {
      for (const img of referenceImages) {
        if (img.data && img.mimeType) {
          productImagesBase64.push(img)
        }
      }
    }

    // Build generation request - EXACTLY like generate-landing
    // The key difference: we pass the user's prompt via additionalInstructions
    // so buildPrompt() includes it, keeping the same flow that works
    const generateRequest: GenerateImageRequest = {
      provider: selectedProvider,
      modelId: modelId,
      prompt: '', // Empty so providers use buildPrompt()
      productImagesBase64: productImagesBase64.length > 0 ? productImagesBase64 : undefined,
      aspectRatio: aspectRatio as '9:16' | '1:1' | '16:9',
      productName: 'Imagen generada', // Generic name for studio
      creativeControls: {
        additionalInstructions: prompt, // User's prompt goes here
      },
    }

    console.log(`[Studio] Generating image with ${selectedProvider}, model: ${modelId}`)

    // Generate image - EXACTLY like generate-landing
    let result = await generateImage(generateRequest, apiKeys)

    // For async providers, poll for result - EXACTLY like generate-landing
    if (result.success && result.status === 'processing' && result.taskId) {
      console.log(`[Studio] Task created: ${result.taskId}, polling for result...`)

      const apiKey = apiKeys[requiredKey]!
      result = await pollForResult(selectedProvider, result.taskId, apiKey, {
        maxAttempts: 120,
        intervalMs: 1000,
        timeoutMs: 120000,
      })
    }

    if (!result.success || !result.imageBase64) {
      return NextResponse.json({
        success: false,
        error: result.error || 'No se pudo generar la imagen',
        provider: selectedProvider,
      }, { status: 200 })
    }

    console.log(`[Studio] Image generated successfully with ${selectedProvider}`)

    return NextResponse.json({
      success: true,
      imageBase64: result.imageBase64,
      mimeType: result.mimeType || 'image/png',
      provider: selectedProvider,
    })

  } catch (error: any) {
    console.error('[Studio] Generate error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
