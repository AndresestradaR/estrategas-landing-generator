import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
import {
  generateVideo,
  pollForVideoResult,
  VIDEO_MODELS,
  type VideoModelId,
} from '@/lib/video-providers'

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
      startImageBase64,
      referenceImageBase64,
    } = body as {
      modelId: VideoModelId
      prompt: string
      duration?: number
      aspectRatio?: '16:9' | '9:16' | '1:1'
      resolution?: string
      enableAudio?: boolean
      startImageBase64?: string
      referenceImageBase64?: string
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

    // Get KIE API key from profile (all video models go through KIE.ai)
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

    console.log(`[Video] Generating with model: ${modelId}`)
    console.log(`[Video] Prompt: ${prompt.substring(0, 100)}...`)
    console.log(`[Video] Duration: ${duration}s, Resolution: ${resolution}, Aspect: ${aspectRatio}`)

    // Generate video
    let result = await generateVideo(
      {
        modelId,
        prompt,
        duration,
        aspectRatio,
        resolution: resolution || modelConfig.defaultResolution,
        enableAudio: modelConfig.supportsAudio ? enableAudio : false,
        startImageBase64: modelConfig.supportsStartEndFrames ? startImageBase64 : undefined,
        referenceImageBase64: modelConfig.supportsReferences ? referenceImageBase64 : undefined,
      },
      kieApiKey
    )

    // Poll for result
    if (result.success && result.status === 'processing' && result.taskId) {
      console.log(`[Video] Task created: ${result.taskId}, polling for result...`)

      result = await pollForVideoResult(result.taskId, kieApiKey, {
        maxAttempts: 300, // 10 minutes max
        intervalMs: 2000, // Check every 2 seconds
        timeoutMs: 600000, // 10 minute timeout
      })
    }

    if (!result.success) {
      console.error(`[Video] Generation failed:`, result.error)
      return NextResponse.json({
        success: false,
        error: result.error || 'No se pudo generar el video',
      }, { status: 200 })
    }

    console.log(`[Video] Video generated successfully`)

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
    })

  } catch (error: any) {
    console.error('[Video] Generate error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
