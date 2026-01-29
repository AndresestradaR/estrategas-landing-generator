import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
import { generateImage, pollForResult } from '@/lib/image-providers'
import type { GenerateImageRequest } from '@/lib/image-providers/types'

type ToolType = 'variations' | 'upscale' | 'remove-bg' | 'camera-angle' | 'mockup' | 'lip-sync'

const KIE_API_BASE = 'https://api.kie.ai/api/v1'

// Tool-specific prompts
const TOOL_PROMPTS: Record<string, string> = {
  variations: `Create a variation of this image. Keep the same subject, style, and quality but vary the composition, lighting, or perspective slightly to create an interesting alternative version. Maintain the same level of detail and professionalism.`,

  upscale: `Enhance this image to higher resolution and quality. Improve sharpness, details, and clarity while maintaining the original composition, colors, and style exactly. Make it look more professional and crisp.`,

  'camera-angle': `Reimagine this exact scene from a completely different camera angle. Create a new perspective as if the camera was positioned from above, below, from the side, or at a dramatic angle. Keep the same subject, lighting style, and quality but change the viewpoint dramatically.`,

  mockup: `Transform this product into a professional e-commerce mockup. Place the product in a clean, minimalist studio setting with professional soft lighting. Use a neutral background (white or light gray) with subtle shadows. Make it look like a high-end product photography shot ready for an online store.`,
}

/**
 * Generate lip sync video using Hailuo via KIE.ai
 */
async function generateLipSync(
  imageUrl: string,
  audioUrl: string,
  apiKey: string
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  console.log('[Tools/LipSync] Starting lip sync generation')

  try {
    const response = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'hailuo/lip-sync',
        input: {
          image_url: imageUrl,
          audio_url: audioUrl,
        },
      }),
    })

    const data = await response.json()

    if (data.code !== 200 && data.code !== 0) {
      return { success: false, error: data.msg || data.message || 'Error en KIE API' }
    }

    const taskId = data.data?.taskId || data.taskId
    if (!taskId) {
      return { success: false, error: 'No se recibio ID de tarea' }
    }

    return { success: true, taskId }
  } catch (error: any) {
    console.error('[Tools/LipSync] Error:', error.message)
    return { success: false, error: error.message || 'Error en lip sync' }
  }
}

/**
 * Check lip sync task status
 */
async function checkLipSyncStatus(
  taskId: string,
  apiKey: string
): Promise<{ success: boolean; videoUrl?: string; status?: string; error?: string }> {
  try {
    const response = await fetch(`${KIE_API_BASE}/jobs/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    const data = await response.json()
    const taskData = data.data || data
    const state = taskData.state || ''

    if (['waiting', 'queuing', 'generating', 'processing', 'running', 'pending'].includes(state)) {
      return { success: true, status: 'processing' }
    }

    if (['fail', 'failed', 'error'].includes(state)) {
      return { success: false, error: taskData.failMsg || 'Lip sync failed' }
    }

    if (state === 'success' || state === 'completed') {
      let videoUrl: string | undefined

      if (taskData.resultJson) {
        const result = typeof taskData.resultJson === 'string'
          ? JSON.parse(taskData.resultJson)
          : taskData.resultJson
        videoUrl = result.videoUrl || result.video_url || result.resultUrls?.[0] || result.url
      }

      if (!videoUrl) {
        videoUrl = taskData.videoUrl || taskData.video_url || taskData.resultUrl
      }

      if (videoUrl) {
        return { success: true, videoUrl, status: 'completed' }
      }

      return { success: false, error: 'Video URL not found' }
    }

    if (!state) {
      return { success: true, status: 'processing' }
    }

    return { success: false, error: `Unknown status: ${state}` }
  } catch (error: any) {
    return { success: false, error: error.message || 'Status check failed' }
  }
}

/**
 * Upload file to Supabase and return public URL
 */
async function uploadToSupabase(
  supabase: any,
  userId: string,
  file: File,
  filename: string,
  contentType: string
): Promise<string | null> {
  const bucket = 'generations'
  const path = `${userId}/tools/${Date.now()}-${filename}`

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, fileBuffer, { contentType, upsert: true })

  if (error) {
    console.error('[Upload] Error:', error)
    return null
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
  return urlData?.publicUrl || null
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const image = formData.get('image') as File | null
    const tool = formData.get('tool') as ToolType
    const audio = formData.get('audio') as File | null

    if (!tool) {
      return NextResponse.json({ error: 'Herramienta es requerida' }, { status: 400 })
    }

    if (tool === 'lip-sync' && (!image || !audio)) {
      return NextResponse.json({ error: 'Lip sync requiere imagen y audio' }, { status: 400 })
    } else if (tool !== 'lip-sync' && !image) {
      return NextResponse.json({ error: 'Imagen es requerida' }, { status: 400 })
    }

    // Get user's API keys
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_api_key, openai_api_key, kie_api_key, bfl_api_key')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Convert image to base64
    let imageBase64 = ''
    let mimeType = ''
    if (image) {
      const imageBuffer = await image.arrayBuffer()
      imageBase64 = Buffer.from(imageBuffer).toString('base64')
      mimeType = image.type || 'image/png'
    }

    switch (tool) {
      // ========================================
      // GEMINI tools - Use existing provider that works
      // ========================================
      case 'variations':
      case 'upscale':
      case 'camera-angle':
      case 'mockup': {
        if (!profile.google_api_key) {
          return NextResponse.json(
            { error: 'Necesitas configurar tu API key de Google' },
            { status: 400 }
          )
        }

        const apiKey = decrypt(profile.google_api_key)
        const prompt = TOOL_PROMPTS[tool]

        // Use the existing image provider system
        const imageRequest: GenerateImageRequest = {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash', // Use the model that works
          prompt: prompt,
          productImagesBase64: [{ data: imageBase64, mimeType }],
          aspectRatio: '1:1',
        }

        console.log(`[Tools] Starting ${tool} with gemini provider`)

        const result = await generateImage(imageRequest, { gemini: apiKey })

        if (result.success && result.imageBase64) {
          return NextResponse.json({
            success: true,
            imageBase64: result.imageBase64,
            mimeType: result.mimeType || 'image/png',
          })
        }

        // If result has taskId (async), poll for it
        if (result.taskId) {
          const pollResult = await pollForResult('gemini', result.taskId, apiKey, {
            maxAttempts: 60,
            intervalMs: 2000,
          })

          if (pollResult.success && pollResult.imageBase64) {
            return NextResponse.json({
              success: true,
              imageBase64: pollResult.imageBase64,
              mimeType: pollResult.mimeType || 'image/png',
            })
          }

          return NextResponse.json(
            { error: pollResult.error || `Error en ${tool}` },
            { status: 500 }
          )
        }

        return NextResponse.json(
          { error: result.error || `Error en ${tool}` },
          { status: 500 }
        )
      }

      // ========================================
      // BFL FLUX - Background removal
      // ========================================
      case 'remove-bg': {
        if (!profile.bfl_api_key) {
          return NextResponse.json(
            { error: 'Necesitas configurar tu API key de Black Forest Labs' },
            { status: 400 }
          )
        }

        const apiKey = decrypt(profile.bfl_api_key)

        // Use flux provider for background removal
        const imageRequest: GenerateImageRequest = {
          provider: 'flux',
          modelId: 'flux-2-pro',
          prompt: 'Remove the background completely, keep only the main subject with transparent background. Do not modify the subject.',
          productImagesBase64: [{ data: imageBase64, mimeType }],
          aspectRatio: '1:1',
        }

        console.log('[Tools] Starting remove-bg with flux provider')

        const result = await generateImage(imageRequest, { bfl: apiKey })

        // Flux requires polling
        if (result.taskId) {
          const pollResult = await pollForResult('flux', result.taskId, apiKey, {
            maxAttempts: 60,
            intervalMs: 2000,
          })

          if (pollResult.success && pollResult.imageBase64) {
            return NextResponse.json({
              success: true,
              imageBase64: pollResult.imageBase64,
              mimeType: 'image/png',
            })
          }

          return NextResponse.json(
            { error: pollResult.error || 'Error al quitar fondo' },
            { status: 500 }
          )
        }

        if (result.success && result.imageBase64) {
          return NextResponse.json({
            success: true,
            imageBase64: result.imageBase64,
            mimeType: 'image/png',
          })
        }

        return NextResponse.json(
          { error: result.error || 'Error al quitar fondo' },
          { status: 500 }
        )
      }

      // ========================================
      // KIE Hailuo - Lip Sync
      // ========================================
      case 'lip-sync': {
        if (!profile.kie_api_key) {
          return NextResponse.json(
            { error: 'Necesitas configurar tu API key de KIE.ai' },
            { status: 400 }
          )
        }

        const apiKey = decrypt(profile.kie_api_key)

        // Upload image and audio to get public URLs
        const imageUrl = await uploadToSupabase(
          supabase,
          user.id,
          image!,
          `lipsync-image.${image!.name.split('.').pop() || 'png'}`,
          image!.type || 'image/png'
        )

        const audioUrl = await uploadToSupabase(
          supabase,
          user.id,
          audio!,
          `lipsync-audio.${audio!.name.split('.').pop() || 'mp3'}`,
          audio!.type || 'audio/mpeg'
        )

        if (!imageUrl || !audioUrl) {
          return NextResponse.json({ error: 'Error al subir archivos' }, { status: 500 })
        }

        const result = await generateLipSync(imageUrl, audioUrl, apiKey)

        if (result.success && result.taskId) {
          return NextResponse.json({
            success: true,
            taskId: result.taskId,
            status: 'processing',
          })
        }

        return NextResponse.json(
          { error: result.error || 'Error al iniciar lip sync' },
          { status: 500 }
        )
      }

      default:
        return NextResponse.json({ error: 'Herramienta no soportada' }, { status: 400 })
    }
  } catch (error) {
    console.error('Studio tools error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * GET endpoint for checking lip-sync status
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: 'taskId es requerido' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('kie_api_key')
      .eq('id', user.id)
      .single()

    if (!profile?.kie_api_key) {
      return NextResponse.json({ error: 'KIE API key no configurada' }, { status: 400 })
    }

    const apiKey = decrypt(profile.kie_api_key)
    const result = await checkLipSyncStatus(taskId, apiKey)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
