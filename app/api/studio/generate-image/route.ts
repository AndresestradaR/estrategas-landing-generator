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

// Mark this route as requiring extended timeout
export const maxDuration = 120 // 2 minutes max

export async function POST(request: Request) {
  const startTime = Date.now()
  
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

    console.log(`[Studio] Request received - Model: ${modelId}, User: ${user.id.substring(0, 8)}...`)

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

    // Get provider from model
    const selectedProvider = modelIdToProviderType(modelId)

    // Validate we have the required API key
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

    // Build generation request
    const generateRequest: GenerateImageRequest = {
      provider: selectedProvider,
      modelId: modelId,
      prompt: prompt,
      productImagesBase64: productImagesBase64.length > 0 ? productImagesBase64 : undefined,
      aspectRatio: aspectRatio as '9:16' | '1:1' | '16:9',
    }

    console.log(`[Studio] Starting generation with ${selectedProvider}/${modelId}`)
    console.log(`[Studio] Prompt (first 100 chars): ${prompt.substring(0, 100)}...`)
    if (productImagesBase64.length > 0) {
      console.log(`[Studio] Reference images: ${productImagesBase64.length}`)
    }

    // Generate image
    let result = await generateImage(generateRequest, apiKeys)

    // For async providers (KIE, BFL), poll for result
    // Use shorter timeout to stay within Vercel limits
    if (result.success && result.status === 'processing' && result.taskId) {
      console.log(`[Studio] Async task created: ${result.taskId}, polling...`)

      const apiKey = apiKeys[requiredKey]!
      const elapsedMs = Date.now() - startTime
      const remainingMs = Math.max(100000 - elapsedMs, 30000) // At least 30s, max until 100s total

      result = await pollForResult(selectedProvider, result.taskId, apiKey, {
        maxAttempts: Math.floor(remainingMs / 1000), // 1 attempt per second
        intervalMs: 1000,
        timeoutMs: remainingMs,
      })
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)

    if (!result.success || !result.imageBase64) {
      console.error(`[Studio] Generation failed after ${totalTime}s:`, result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'No se pudo generar la imagen',
        provider: selectedProvider,
      }, { status: 200 })
    }

    console.log(`[Studio] ✓ Image generated successfully in ${totalTime}s with ${selectedProvider}`)

    return NextResponse.json({
      success: true,
      imageBase64: result.imageBase64,
      mimeType: result.mimeType || 'image/png',
      provider: selectedProvider,
    })

  } catch (error: any) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
    console.error(`[Studio] Error after ${totalTime}s:`, error.message)
    
    // Return user-friendly error messages
    let userMessage = 'Error interno del servidor'
    if (error.message?.includes('timeout') || error.message?.includes('tardó demasiado')) {
      userMessage = 'La generación tardó demasiado. Intenta de nuevo.'
    } else if (error.message?.includes('API key')) {
      userMessage = error.message
    } else if (error.message?.includes('SAFETY') || error.message?.includes('bloqueado')) {
      userMessage = 'Contenido bloqueado por filtros de seguridad. Modifica el prompt.'
    }
    
    return NextResponse.json({ 
      success: false,
      error: userMessage 
    }, { status: 500 })
  }
}
