import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
import {
  generateVideo,
  pollForVideoResult,
  VIDEO_MODELS,
  type VideoModelId,
} from '@/lib/video-providers'

/**
 * Upload base64 image to Supabase Storage and get public URL
 * KIE.ai requires public URLs, not base64
 */
async function uploadImageToStorage(
  supabase: any,
  base64Data: string,
  userId: string,
  index: number
): Promise<string> {
  // Remove data URL prefix if present
  const base64Clean = base64Data.includes(',') 
    ? base64Data.split(',')[1] 
    : base64Data

  // Convert to buffer
  const buffer = Buffer.from(base64Clean, 'base64')

  // Generate unique filename
  const timestamp = Date.now()
  const filename = `video-input-${userId}-${timestamp}-${index}.jpg`
  const path = `video-inputs/${filename}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('studio-assets')
    .upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (error) {
    console.error('[Video] Storage upload error:', error)
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('studio-assets')
    .getPublicUrl(path)

  console.log('[Video] Uploaded image:', urlData.publicUrl)
  return urlData.publicUrl
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
      duration = 5,
      aspectRatio = '16:9',
      resolution,
      enableAudio = true,
      imageBase64, // Single image (start frame)
      imageBase64End, // End frame (optional, for transitions)
    } = body as {
      modelId: VideoModelId
      prompt: string
      duration?: number
      aspectRatio?: '16:9' | '9:16' | '1:1'
      resolution?: string
      enableAudio?: boolean
      imageBase64?: string
      imageBase64End?: string
    }

    if (!modelId || !prompt) {
      return NextResponse.json(
        { error: 'Modelo y prompt son requeridos' },
        { status: 400 }
      )
    }

    // Validate model exists
    const modelConfig = VIDEO_MODELS[modelId]
    if (!modelConfig) {
      return NextResponse.json(
        { error: 'Modelo no encontrado' },
        { status: 400 }
      )
    }

    // Get KIE API key from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('kie_api_key')
      .eq('id', user.id)
      .single()

    if (!profile?.kie_api_key) {
      return NextResponse.json({
        error: 'Configura tu API key de KIE.ai en Settings para generar videos',
      }, { status: 400 })
    }

    const kieApiKey = decrypt(profile.kie_api_key)

    console.log(`[Video] Model: ${modelId}`)
    console.log(`[Video] Prompt: ${prompt.substring(0, 100)}...`)
    console.log(`[Video] Duration: ${duration}s, Aspect: ${aspectRatio}`)

    // Upload images to Supabase and get public URLs
    const imageUrls: string[] = []

    if (imageBase64 && modelConfig.supportsStartEndFrames) {
      console.log('[Video] Uploading start image...')
      const url = await uploadImageToStorage(supabase, imageBase64, user.id, 0)
      imageUrls.push(url)

      // End frame (for transitions)
      if (imageBase64End) {
        console.log('[Video] Uploading end image...')
        const urlEnd = await uploadImageToStorage(supabase, imageBase64End, user.id, 1)
        imageUrls.push(urlEnd)
      }
    }

    console.log(`[Video] Image URLs: ${imageUrls.length}`)

    // Generate video
    let result = await generateVideo(
      {
        modelId,
        prompt,
        duration,
        aspectRatio,
        resolution: resolution || modelConfig.defaultResolution,
        enableAudio: modelConfig.supportsAudio ? enableAudio : false,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      },
      kieApiKey
    )

    // Poll for result
    if (result.success && result.status === 'processing' && result.taskId) {
      console.log(`[Video] Task created: ${result.taskId}, polling...`)

      result = await pollForVideoResult(result.taskId, kieApiKey, {
        maxAttempts: 200,
        intervalMs: 3000, // 3 seconds
        timeoutMs: 600000, // 10 minutes
      })
    }

    if (!result.success) {
      console.error(`[Video] Failed:`, result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'No se pudo generar el video',
      }, { status: 200 })
    }

    console.log(`[Video] Success! URL: ${result.videoUrl}`)

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
    })

  } catch (error: any) {
    console.error('[Video] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
