import { NextRequest, NextResponse } from 'next/server'
import { listVoices } from '@/lib/audio-providers/elevenlabs'
import { SPANISH_LATAM_VOICES } from '@/lib/audio-providers/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider') || 'elevenlabs'
    const search = searchParams.get('search') || undefined
    const category = searchParams.get('category') || undefined
    const defaultsOnly = searchParams.get('defaults') === 'true'

    // If requesting defaults only, return pre-configured voices
    if (defaultsOnly) {
      const defaultVoices = provider === 'elevenlabs' 
        ? SPANISH_LATAM_VOICES.elevenlabs.map(v => ({
            ...v,
            provider: 'elevenlabs' as const,
          }))
        : SPANISH_LATAM_VOICES.google.map(v => ({
            ...v,
            provider: 'google-tts' as const,
          }))

      return NextResponse.json({
        success: true,
        voices: defaultVoices,
        total: defaultVoices.length,
      })
    }

    if (provider === 'elevenlabs') {
      const apiKey = process.env.ELEVENLABS_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'ElevenLabs API key not configured' },
          { status: 500 }
        )
      }

      const result = await listVoices(apiKey, { search, category })

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        voices: result.voices,
        total: result.voices.length,
      })

    } else if (provider === 'google-tts') {
      // TODO: Implement Google Cloud TTS voice listing
      // For now, return static list
      return NextResponse.json({
        success: true,
        voices: SPANISH_LATAM_VOICES.google.map(v => ({
          ...v,
          provider: 'google-tts' as const,
        })),
        total: SPANISH_LATAM_VOICES.google.length,
      })

    } else {
      return NextResponse.json(
        { success: false, error: `Unknown provider: ${provider}` },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.error('[API/voices] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
