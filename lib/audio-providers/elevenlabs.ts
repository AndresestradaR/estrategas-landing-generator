// ElevenLabs Audio Provider
// Docs: https://elevenlabs.io/docs/api-reference

import {
  Voice,
  VoiceSettings,
  GenerateAudioRequest,
  GenerateAudioResult,
  ListVoicesResult,
  AudioModelId,
} from './types'

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

/**
 * Generate speech from text using ElevenLabs
 * Returns audio as base64 or uploads to storage
 */
export async function generateSpeech(
  request: GenerateAudioRequest,
  apiKey: string
): Promise<GenerateAudioResult> {
  try {
    const modelId = request.modelId || 'eleven_multilingual_v2'
    
    // Build request body
    const body: Record<string, any> = {
      text: request.text,
      model_id: modelId,
    }

    // Voice settings
    if (request.settings) {
      body.voice_settings = {
        stability: request.settings.stability ?? 0.5,
        similarity_boost: request.settings.similarityBoost ?? 0.75,
        style: request.settings.style ?? 0,
        use_speaker_boost: request.settings.useSpeakerBoost ?? true,
      }
      
      // Speed is set differently
      if (request.settings.speed && request.settings.speed !== 1) {
        body.voice_settings.speed = request.settings.speed
      }
    }

    // Language code for multilingual models
    if (request.languageCode) {
      body.language_code = request.languageCode
    }

    // Output format
    const outputFormat = request.outputFormat || 'mp3_44100_128'

    console.log('[Audio/ElevenLabs] Generating speech:', {
      voiceId: request.voiceId,
      modelId,
      textLength: request.text.length,
      outputFormat,
    })

    const response = await fetch(
      `${ELEVENLABS_API_BASE}/text-to-speech/${request.voiceId}?output_format=${outputFormat}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Audio/ElevenLabs] Error:', response.status, errorText)
      
      let errorMessage = `ElevenLabs API error: ${response.status}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.detail?.message || errorJson.detail || errorMessage
      } catch (e) {
        errorMessage = errorText || errorMessage
      }
      
      throw new Error(errorMessage)
    }

    // Get audio as buffer
    const audioBuffer = await response.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    // Get content type from response
    const contentType = response.headers.get('content-type') || 'audio/mpeg'

    // Character count from headers (if available)
    const charactersUsed = parseInt(
      response.headers.get('character-count') || String(request.text.length)
    )

    console.log('[Audio/ElevenLabs] Success:', {
      contentType,
      size: audioBuffer.byteLength,
      charactersUsed,
    })

    return {
      success: true,
      audioBase64,
      contentType,
      charactersUsed,
      provider: 'elevenlabs',
    }
  } catch (error: any) {
    console.error('[Audio/ElevenLabs] Error:', error.message)
    return {
      success: false,
      error: error.message || 'Speech generation failed',
      provider: 'elevenlabs',
    }
  }
}

/**
 * List all available voices from ElevenLabs
 */
export async function listVoices(
  apiKey: string,
  options?: {
    search?: string
    category?: string
  }
): Promise<ListVoicesResult> {
  try {
    // Build query params
    const params = new URLSearchParams()
    params.set('page_size', '100')
    
    if (options?.search) {
      params.set('search', options.search)
    }
    if (options?.category) {
      params.set('category', options.category)
    }

    console.log('[Audio/ElevenLabs] Listing voices...')

    const response = await fetch(
      `${ELEVENLABS_API_BASE}/voices?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to list voices: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    // Transform to our Voice interface
    const voices: Voice[] = (data.voices || []).map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      description: v.description,
      previewUrl: v.preview_url,
      language: v.labels?.language,
      accent: v.labels?.accent,
      gender: v.labels?.gender?.toLowerCase(),
      category: v.category,
      provider: 'elevenlabs' as const,
      labels: v.labels,
    }))

    console.log('[Audio/ElevenLabs] Found', voices.length, 'voices')

    return {
      success: true,
      voices,
    }
  } catch (error: any) {
    console.error('[Audio/ElevenLabs] Error listing voices:', error.message)
    return {
      success: false,
      voices: [],
      error: error.message || 'Failed to list voices',
    }
  }
}

/**
 * Get a specific voice by ID
 */
export async function getVoice(
  voiceId: string,
  apiKey: string
): Promise<Voice | null> {
  try {
    const response = await fetch(
      `${ELEVENLABS_API_BASE}/voices/${voiceId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    )

    if (!response.ok) {
      return null
    }

    const v = await response.json()
    
    return {
      id: v.voice_id,
      name: v.name,
      description: v.description,
      previewUrl: v.preview_url,
      language: v.labels?.language,
      accent: v.labels?.accent,
      gender: v.labels?.gender?.toLowerCase() as 'male' | 'female' | 'neutral',
      category: v.category,
      provider: 'elevenlabs',
      labels: v.labels,
    }
  } catch (error) {
    return null
  }
}

/**
 * Get user's subscription info (remaining credits, etc)
 */
export async function getSubscriptionInfo(apiKey: string): Promise<{
  characterCount: number
  characterLimit: number
  canExtend: boolean
  tier: string
} | null> {
  try {
    const response = await fetch(
      `${ELEVENLABS_API_BASE}/user/subscription`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    return {
      characterCount: data.character_count,
      characterLimit: data.character_limit,
      canExtend: data.can_extend_character_limit,
      tier: data.tier,
    }
  } catch (error) {
    return null
  }
}
