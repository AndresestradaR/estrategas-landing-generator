// Google Cloud Text-to-Speech Provider
// Uses REST API directly (no SDK needed)
// Docs: https://cloud.google.com/text-to-speech/docs/reference/rest

import { Voice, GenerateAudioResult, ListVoicesResult } from './types'

const GOOGLE_TTS_API_BASE = 'https://texttospeech.googleapis.com/v1'

// Spanish/LATAM voice configurations with proper language codes
const SPANISH_VOICE_CONFIGS = [
  // Mexico - Neural2 (highest quality)
  { name: 'es-MX-Neural2-A', gender: 'female', label: 'Sofia (Mexico)', accent: 'Mexicano' },
  { name: 'es-MX-Neural2-B', gender: 'male', label: 'Diego (Mexico)', accent: 'Mexicano' },
  { name: 'es-MX-Neural2-C', gender: 'male', label: 'Carlos (Mexico)', accent: 'Mexicano' },
  // Mexico - Wavenet
  { name: 'es-MX-Wavenet-A', gender: 'female', label: 'Maria (Mexico)', accent: 'Mexicano' },
  { name: 'es-MX-Wavenet-B', gender: 'male', label: 'Miguel (Mexico)', accent: 'Mexicano' },
  { name: 'es-MX-Wavenet-C', gender: 'male', label: 'Pablo (Mexico)', accent: 'Mexicano' },
  // US Spanish - Neural2
  { name: 'es-US-Neural2-A', gender: 'female', label: 'Isabella (Latino US)', accent: 'Latino US' },
  { name: 'es-US-Neural2-B', gender: 'male', label: 'Mateo (Latino US)', accent: 'Latino US' },
  { name: 'es-US-Neural2-C', gender: 'male', label: 'Andres (Latino US)', accent: 'Latino US' },
  // US Spanish - Wavenet
  { name: 'es-US-Wavenet-A', gender: 'female', label: 'Valentina (Latino US)', accent: 'Latino US' },
  { name: 'es-US-Wavenet-B', gender: 'male', label: 'Santiago (Latino US)', accent: 'Latino US' },
  { name: 'es-US-Wavenet-C', gender: 'male', label: 'Sebastian (Latino US)', accent: 'Latino US' },
  // Spain - Neural2 (for variety)
  { name: 'es-ES-Neural2-A', gender: 'female', label: 'Lucia (Espana)', accent: 'Castellano' },
  { name: 'es-ES-Neural2-B', gender: 'male', label: 'Alejandro (Espana)', accent: 'Castellano' },
  { name: 'es-ES-Neural2-C', gender: 'female', label: 'Carmen (Espana)', accent: 'Castellano' },
  { name: 'es-ES-Neural2-D', gender: 'female', label: 'Elena (Espana)', accent: 'Castellano' },
  { name: 'es-ES-Neural2-E', gender: 'female', label: 'Laura (Espana)', accent: 'Castellano' },
  { name: 'es-ES-Neural2-F', gender: 'male', label: 'Jorge (Espana)', accent: 'Castellano' },
]

export async function generateSpeech(
  text: string,
  voiceId: string,
  apiKey: string,
  options?: {
    speakingRate?: number  // 0.25 to 4.0, default 1.0
    pitch?: number         // -20.0 to 20.0, default 0
    volumeGainDb?: number  // -96.0 to 16.0, default 0
  }
): Promise<GenerateAudioResult> {
  try {
    // Parse voice ID to get language code (e.g., "es-MX-Neural2-A" -> "es-MX")
    const parts = voiceId.split('-')
    const languageCode = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : 'es-MX'

    const requestBody = {
      input: { text },
      voice: {
        languageCode,
        name: voiceId,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: options?.speakingRate ?? 1.0,
        pitch: options?.pitch ?? 0,
        volumeGainDb: options?.volumeGainDb ?? 0,
        sampleRateHertz: 24000,
      },
    }

    console.log('[Audio/GoogleTTS] Generating speech:', {
      voiceId,
      languageCode,
      textLength: text.length,
    })

    const response = await fetch(
      `${GOOGLE_TTS_API_BASE}/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `Google TTS error: ${response.status}`
      console.error('[Audio/GoogleTTS] Error:', response.status, errorData)
      throw new Error(errorMessage)
    }

    const data = await response.json()
    
    if (!data.audioContent) {
      throw new Error('No audio content returned from Google TTS')
    }

    console.log('[Audio/GoogleTTS] Success')

    return {
      success: true,
      audioBase64: data.audioContent,
      contentType: 'audio/mpeg',
      charactersUsed: text.length,
      provider: 'google-tts',
    }
  } catch (error: any) {
    console.error('[Audio/GoogleTTS] Error:', error.message)
    return {
      success: false,
      error: error.message || 'Google TTS generation failed',
      provider: 'google-tts',
    }
  }
}

export async function listVoices(apiKey: string): Promise<ListVoicesResult> {
  try {
    // Option 1: Use static list (faster, no API call needed)
    // This is preferred because Google's voice list rarely changes
    const voices: Voice[] = SPANISH_VOICE_CONFIGS.map((v) => ({
      id: v.name,
      name: v.label,
      description: `${v.accent} - ${v.name.includes('Neural2') ? 'Neural2 (Alta calidad)' : 'Wavenet'}`,
      gender: v.gender as 'male' | 'female',
      language: 'Espanol',
      accent: v.accent,
      category: v.name.includes('Neural2') ? 'neural' : 'wavenet',
      provider: 'google-tts' as const,
    }))

    console.log('[Audio/GoogleTTS] Returning', voices.length, 'Spanish voices')

    return { success: true, voices }

    // Option 2: Fetch from API (uncomment if you need dynamic list)
    /*
    const response = await fetch(
      `${GOOGLE_TTS_API_BASE}/voices?key=${apiKey}&languageCode=es`,
      { method: 'GET' }
    )

    if (!response.ok) {
      throw new Error(`Failed to list voices: ${response.status}`)
    }

    const data = await response.json()
    const allVoices = data.voices || []

    // Filter to Spanish voices only
    const spanishVoices = allVoices.filter((v: any) => 
      v.languageCodes.some((code: string) => code.startsWith('es-'))
    )

    const voices: Voice[] = spanishVoices.map((v: any) => ({
      id: v.name,
      name: v.name,
      gender: v.ssmlGender?.toLowerCase() || 'neutral',
      language: 'Espanol',
      provider: 'google-tts' as const,
    }))

    return { success: true, voices }
    */
  } catch (error: any) {
    console.error('[Audio/GoogleTTS] Error listing voices:', error.message)
    return { success: false, voices: [], error: error.message }
  }
}

export function getVoiceInfo(voiceId: string): Voice | null {
  const config = SPANISH_VOICE_CONFIGS.find((v) => v.name === voiceId)
  if (!config) return null

  return {
    id: config.name,
    name: config.label,
    description: `${config.accent} - ${config.name.includes('Neural2') ? 'Neural2' : 'Wavenet'}`,
    gender: config.gender as 'male' | 'female',
    language: 'Espanol',
    accent: config.accent,
    provider: 'google-tts',
  }
}
