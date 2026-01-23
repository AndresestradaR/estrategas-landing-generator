import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/services/encryption'
import { checkGenerationStatus, type ImageProviderType } from '@/lib/image-providers'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const provider = searchParams.get('provider') as ImageProviderType

    if (!taskId || !provider) {
      return NextResponse.json(
        { error: 'taskId y provider son requeridos' },
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

    // Get the appropriate API key
    let apiKey: string | null = null
    switch (provider) {
      case 'gemini':
        apiKey = profile.google_api_key
        break
      case 'openai':
        apiKey = profile.openai_api_key
        break
      case 'seedream':
        apiKey = profile.kie_api_key
        break
      case 'flux':
        apiKey = profile.bfl_api_key
        break
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key no configurada' },
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

    // Check generation status
    const result = await checkGenerationStatus(provider, taskId, decryptedKey)

    return NextResponse.json({
      status: result.status || (result.success ? 'completed' : 'failed'),
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
      error: result.error,
    })

  } catch (error) {
    console.error('Studio status check error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
