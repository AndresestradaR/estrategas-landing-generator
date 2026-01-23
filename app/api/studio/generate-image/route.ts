import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
import {
  generateImage,
  pollForResult,
  IMAGE_MODELS,
  modelIdToProviderType,
  type ImageModelId,
} from '@/lib/image-providers'

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
      quantity = 1,
      referenceImages,
    } = body as {
      modelId: ImageModelId
      prompt: string
      aspectRatio?: string
      quality?: string
      quantity?: number
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

    // Get user's API keys
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_api_key, openai_api_key, kie_api_key, bfl_api_key')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      )
    }

    // Get the appropriate API key for this model
    const provider = modelIdToProviderType(modelId)
    let apiKey: string | null = null

    switch (modelConfig.company) {
      case 'google':
        apiKey = profile.google_api_key
        break
      case 'openai':
        apiKey = profile.openai_api_key
        break
      case 'bytedance':
        apiKey = profile.kie_api_key
        break
      case 'bfl':
        apiKey = profile.bfl_api_key
        break
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: `No tienes configurada la API key para ${modelConfig.companyName}. Ve a Settings para agregarla.` },
        { status: 400 }
      )
    }

    // Decrypt the API key
    let decryptedKey: string
    try {
      decryptedKey = decrypt(apiKey)
    } catch {
      return NextResponse.json(
        { error: 'Error al desencriptar API key' },
        { status: 500 }
      )
    }

    // Build the generation request
    const generationRequest = {
      provider,
      modelId,
      prompt,
      aspectRatio: aspectRatio as '9:16' | '1:1' | '16:9',
      quality: quality === '2k' ? 'hd' : 'standard' as 'standard' | 'hd',
      productImagesBase64: referenceImages,
    }

    // Prepare API keys object
    const apiKeys = {
      gemini: modelConfig.company === 'google' ? decryptedKey : undefined,
      openai: modelConfig.company === 'openai' ? decryptedKey : undefined,
      kie: modelConfig.company === 'bytedance' ? decryptedKey : undefined,
      bfl: modelConfig.company === 'bfl' ? decryptedKey : undefined,
    }

    // Generate the image
    const result = await generateImage(generationRequest, apiKeys)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error generando imagen' },
        { status: 500 }
      )
    }

    // If it's an async provider that requires polling
    if (result.taskId && modelConfig.requiresPolling) {
      // Poll for the result
      const pollResult = await pollForResult(provider, result.taskId, decryptedKey, {
        maxAttempts: 60,
        intervalMs: 2000,
        timeoutMs: 120000,
      })

      if (!pollResult.success) {
        return NextResponse.json(
          { error: pollResult.error || 'Error obteniendo resultado' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        imageBase64: pollResult.imageBase64,
        mimeType: pollResult.mimeType || 'image/png',
      })
    }

    // Sync provider - return result directly
    return NextResponse.json({
      success: true,
      imageBase64: result.imageBase64,
      mimeType: result.mimeType || 'image/png',
    })

  } catch (error) {
    console.error('Studio generate-image error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
