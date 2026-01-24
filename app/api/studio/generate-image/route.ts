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

// Upload base64 image to Supabase Storage and return public URL
async function uploadImageToStorage(
  supabase: any,
  base64Data: string,
  mimeType: string,
  userId: string,
  index: number
): Promise<string | null> {
  try {
    // Decode base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Determine file extension from mime type
    const ext = mimeType.includes('png') ? 'png' : 
                mimeType.includes('webp') ? 'webp' : 'jpg'
    
    // Generate unique filename
    const filename = `studio/${userId}/${Date.now()}-${index}.${ext}`
    
    // Upload to Supabase Storage (landing-images bucket)
    const { data, error } = await supabase.storage
      .from('landing-images')
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: true,
      })
    
    if (error) {
      console.error('[Studio] Storage upload error:', error)
      return null
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('landing-images')
      .getPublicUrl(filename)
    
    console.log(`[Studio] Uploaded image to: ${publicUrl}`)
    return publicUrl
  } catch (err) {
    console.error('[Studio] Upload error:', err)
    return null
  }
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

    // Log reference images info for debugging
    console.log(`[Studio] Reference images received: ${productImagesBase64.length}`)
    console.log(`[Studio] Provider: ${selectedProvider}`)

    // For Seedream, we need to upload images to get public URLs
    // KIE.ai API requires public URLs, not base64
    let productImageUrls: string[] | undefined
    if (selectedProvider === 'seedream' && productImagesBase64.length > 0) {
      console.log(`[Studio] Uploading ${productImagesBase64.length} images to storage for Seedream...`)
      const urls: string[] = []
      
      for (let i = 0; i < productImagesBase64.length; i++) {
        const img = productImagesBase64[i]
        const url = await uploadImageToStorage(supabase, img.data, img.mimeType, user.id, i)
        if (url) {
          urls.push(url)
        }
      }
      
      if (urls.length > 0) {
        productImageUrls = urls
        console.log(`[Studio] Successfully uploaded ${urls.length} images for Seedream`)
      }
    }

    // Build generation request
    const generateRequest: GenerateImageRequest = {
      provider: selectedProvider,
      modelId: modelId,
      prompt: prompt,
      productImagesBase64: productImagesBase64.length > 0 ? productImagesBase64 : undefined,
      productImageUrls: productImageUrls, // For Seedream (requires public URLs)
      aspectRatio: aspectRatio as '9:16' | '1:1' | '16:9',
    }

    console.log(`[Studio] Generating image with ${selectedProvider}, model: ${modelId}`)
    console.log(`[Studio] Prompt: ${prompt.substring(0, 100)}...`)
    console.log(`[Studio] Has base64 images: ${!!generateRequest.productImagesBase64}`)
    console.log(`[Studio] Has image URLs: ${!!generateRequest.productImageUrls}`)

    // Generate image
    let result = await generateImage(generateRequest, apiKeys)

    // For async providers, poll for result
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
      console.error(`[Studio] Generation failed:`, result.error)
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
