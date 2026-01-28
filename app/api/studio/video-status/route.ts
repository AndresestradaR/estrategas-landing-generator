import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
import { pollForVideoResult } from '@/lib/video-providers'

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

    // Get KIE API key
    const { data: profile } = await supabase
      .from('profiles')
      .select('kie_api_key')
      .eq('id', user.id)
      .single()

    if (!profile?.kie_api_key) {
      return NextResponse.json({ error: 'API key no configurada' }, { status: 400 })
    }

    const kieApiKey = decrypt(profile.kie_api_key)

    // Check status once (no polling, just single check)
    const result = await pollForVideoResult(taskId, kieApiKey, {
      maxAttempts: 1,
      intervalMs: 0,
      timeoutMs: 10000,
    })

    if (result.status === 'processing') {
      return NextResponse.json({
        success: true,
        status: 'processing',
        taskId,
      })
    }

    if (result.success && result.videoUrl) {
      return NextResponse.json({
        success: true,
        status: 'completed',
        videoUrl: result.videoUrl,
        taskId,
      })
    }

    // Failed
    return NextResponse.json({
      success: false,
      status: 'failed',
      error: result.error || 'Error desconocido',
      taskId,
    })

  } catch (error: any) {
    console.error('[VideoStatus] Error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}
