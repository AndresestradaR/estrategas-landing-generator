import { NextRequest, NextResponse } from 'next/server'
import { generateSpeech as generateElevenLabs } from '@/lib/audio-providers/elevenlabs'
import { generateSpeech as generateGoogleTTS } from '@/lib/audio-providers/google-tts'
import { createClient } from '@/lib/supabase/server'
import { AUDIO_MODELS, type AudioModelId } from '@/lib/audio-providers/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      text,
      voiceId,
      modelId = 'eleven_multilingual_v2',
      provider = 'elevenlabs',
      settings,
      outputFormat = 'mp3_44100_128',
      languageCode = 'es',
    } = body

    // Validation
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      )
    }

    if (!voiceId || typeof voiceId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Voice ID is required' },
        { status: 400 }
      )
    }

    // Check text length
    const maxChars = 5000
    if (text.length > maxChars) {
      return NextResponse.json(
        { success: false, error: `Text exceeds maximum length of ${maxChars} characters` },
        { status: 400 }
      )
    }

    console.log('[API/generate-audio] Request:', {
      provider,
      modelId,
      voiceId,
      textLength: text.length,
      languageCode,
    })

    let result: {
      success: boolean
      audioBase64?: string
      contentType?: string
      charactersUsed?: number
      error?: string
      provider: string
    }

    // Generate audio based on provider
    if (provider === 'elevenlabs') {
      const apiKey = process.env.ELEVENLABS_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'ElevenLabs API key not configured' },
          { status: 500 }
        )
      }

      result = await generateElevenLabs(
        {
          text,
          voiceId,
          modelId: modelId as AudioModelId,
          settings,
          outputFormat,
          languageCode,
        },
        apiKey
      )

    } else if (provider === 'google-tts' || provider === 'google') {
      const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'Google TTS API key not configured. Add GOOGLE_TTS_API_KEY to env.' },
          { status: 500 }
        )
      }

      result = await generateGoogleTTS(text, voiceId, apiKey, {
        speakingRate: settings?.speed ?? 1.0,
        pitch: settings?.style ? (settings.style - 0.5) * 10 : 0, // Convert 0-1 to -5 to +5
      })

    } else {
      return NextResponse.json(
        { success: false, error: `Unknown provider: ${provider}` },
        { status: 400 }
      )
    }

    if (!result.success || !result.audioBase64) {
      return NextResponse.json(
        { success: false, error: result.error || 'Audio generation failed' },
        { status: 500 }
      )
    }

    // Upload to Supabase storage
    const supabase = await createClient()
    const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`
    const filePath = `audio/${fileName}`

    const audioBuffer = Buffer.from(result.audioBase64, 'base64')

    const { error: uploadError } = await supabase.storage
      .from('landing-images')
      .upload(filePath, audioBuffer, {
        contentType: result.contentType || 'audio/mpeg',
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('[API/generate-audio] Upload error:', uploadError)
      // Return base64 if upload fails
      return NextResponse.json({
        success: true,
        audioBase64: result.audioBase64,
        contentType: result.contentType,
        charactersUsed: result.charactersUsed,
        provider: result.provider,
      })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('landing-images')
      .getPublicUrl(filePath)

    console.log('[API/generate-audio] Success:', {
      audioUrl: urlData.publicUrl,
      charactersUsed: result.charactersUsed,
      provider: result.provider,
    })

    return NextResponse.json({
      success: true,
      audioUrl: urlData.publicUrl,
      contentType: result.contentType,
      charactersUsed: result.charactersUsed,
      provider: result.provider,
    })

  } catch (error: any) {
    console.error('[API/generate-audio] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
