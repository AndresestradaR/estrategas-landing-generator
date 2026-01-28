import { NextRequest, NextResponse } from 'next/server'
import { listVoices as listElevenLabsVoices } from '@/lib/audio-providers/elevenlabs'
import { listVoices as listGeminiVoices } from '@/lib/audio-providers/google-tts'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider') || 'elevenlabs'
    const search = searchParams.get('search') || undefined
    const category = searchParams.get('category') || undefined

    if (provider === 'elevenlabs') {
      const apiKey = process.env.ELEVENLABS_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'ElevenLabs API key not configured' },
          { status: 500 }
        )
      }

      const result = await listElevenLabsVoices(apiKey, { search, category })

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

    } else if (provider === 'google-tts' || provider === 'google' || provider === 'gemini') {
      // Use GOOGLE_API_KEY or GEMINI_API_KEY from AI Studio
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'Gemini API key not configured. Add GOOGLE_API_KEY or GEMINI_API_KEY to env.' },
          { status: 500 }
        )
      }

      const result = await listGeminiVoices(apiKey)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        )
      }

      // Apply search filter if provided
      let voices = result.voices
      if (search) {
        const searchLower = search.toLowerCase()
        voices = voices.filter(v => 
          v.name.toLowerCase().includes(searchLower) ||
          v.description?.toLowerCase().includes(searchLower)
        )
      }

      return NextResponse.json({
        success: true,
        voices,
        total: voices.length,
      })

    } else if (provider === 'all') {
      // Return voices from all providers
      const results = await Promise.allSettled([
        (async () => {
          const apiKey = process.env.ELEVENLABS_API_KEY
          if (!apiKey) return { voices: [], provider: 'elevenlabs' }
          const result = await listElevenLabsVoices(apiKey, { search, category })
          return { voices: result.voices || [], provider: 'elevenlabs' }
        })(),
        (async () => {
          const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
          if (!apiKey) return { voices: [], provider: 'google-tts' }
          const result = await listGeminiVoices(apiKey)
          return { voices: result.voices || [], provider: 'google-tts' }
        })(),
      ])

      const allVoices = results
        .filter((r): r is PromiseFulfilledResult<{ voices: any[]; provider: string }> => 
          r.status === 'fulfilled'
        )
        .flatMap(r => r.value.voices)

      return NextResponse.json({
        success: true,
        voices: allVoices,
        total: allVoices.length,
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
