import { NextRequest, NextResponse } from 'next/server'
import { generateSpeech } from '@/lib/audio-providers/elevenlabs'
import { createClient } from '@/lib/supabase/server'
import { AUDIO_MODELS, type GenerateAudioRequest, type AudioModelId } from '@/lib/audio-providers/types'

// Max duration for audio generation (in seconds)
const MAX_DURATION = 60

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
      languageCode = 'es', // Default to Spanish
    } = body as GenerateAudioRequest & { provider?: string }

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
    const modelConfig = AUDIO_MODELS[modelId as AudioModelId]
    const maxChars = modelConfig?.maxCharacters || 5000
    
    if (text.length > maxChars) {
      return NextResponse.json(
        { success: false, error: `Text exceeds maximum length of ${maxChars} characters` },
        { status: 400 }
      )
    }

    // Get API key based on provider
    let apiKey: string | undefined
    
    if (provider === 'elevenlabs') {
      apiKey = process.env.ELEVENLABS_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'ElevenLabs API key not configured' },
          { status: 500 }
        )
      }
    } else if (provider === 'google-tts') {
      // TODO: Implement Google Cloud TTS
      return NextResponse.json(
        { success: false, error: 'Google TTS not yet implemented' },
        { status: 501 }
      )
    } else {
      return NextResponse.json(
        { success: false, error: `Unknown provider: ${provider}` },
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

    // Generate audio
    const result = await generateSpeech(
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

    if (!result.success || !result.audioBase64) {
      return NextResponse.json(
        { success: false, error: result.error || 'Audio generation failed' },
        { status: 500 }
      )
    }

    // Upload to Supabase storage (temporary)
    const supabase = await createClient()
    const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`
    const filePath = `audio/${fileName}`

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(result.audioBase64, 'base64')

    const { error: uploadError } = await supabase.storage
      .from('landing-images') // Using existing bucket for now
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
