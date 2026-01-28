// Gemini TTS Provider (Google AI Studio)
// Uses Gemini 2.0 Flash with native TTS capabilities
// Docs: https://ai.google.dev/gemini-api/docs/text-generation

import { Voice, GenerateAudioResult, ListVoicesResult } from './types'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// Gemini 2.0 available voices for TTS
// These are the voice presets available in Gemini
const GEMINI_VOICES = [
  { id: 'Puck', name: 'Puck', gender: 'male', description: 'Voz masculina natural' },
  { id: 'Charon', name: 'Charon', gender: 'male', description: 'Voz masculina profunda' },
  { id: 'Kore', name: 'Kore', gender: 'female', description: 'Voz femenina natural' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Voz masculina energica' },
  { id: 'Aoede', name: 'Aoede', gender: 'female', description: 'Voz femenina melodica' },
]

export async function generateSpeech(
  text: string,
  voiceId: string,
  apiKey: string,
  options?: {
    languageCode?: string
  }
): Promise<GenerateAudioResult> {
  try {
    const languageCode = options?.languageCode || 'es-MX'
    
    // Use Gemini 2.0 Flash with audio output
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Lee el siguiente texto en español con voz natural y expresiva:\n\n${text}`
            }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceId || 'Kore'
            }
          }
        }
      }
    }

    console.log('[Audio/GeminiTTS] Generating speech:', {
      voiceId,
      languageCode,
      textLength: text.length,
    })

    const response = await fetch(
      `${GEMINI_API_BASE}/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `Gemini TTS error: ${response.status}`
      console.error('[Audio/GeminiTTS] Error:', response.status, errorData)
      throw new Error(errorMessage)
    }

    const data = await response.json()
    
    // Extract audio from response
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData
    
    if (!audioData?.data) {
      console.error('[Audio/GeminiTTS] No audio in response:', JSON.stringify(data).slice(0, 500))
      throw new Error('No audio content returned from Gemini')
    }

    console.log('[Audio/GeminiTTS] Success, audio type:', audioData.mimeType)

    return {
      success: true,
      audioBase64: audioData.data,
      contentType: audioData.mimeType || 'audio/wav',
      charactersUsed: text.length,
      provider: 'google-tts',
    }
  } catch (error: any) {
    console.error('[Audio/GeminiTTS] Error:', error.message)
    return {
      success: false,
      error: error.message || 'Gemini TTS generation failed',
      provider: 'google-tts',
    }
  }
}

export async function listVoices(apiKey: string): Promise<ListVoicesResult> {
  try {
    // Return static list of Gemini voices
    const voices: Voice[] = GEMINI_VOICES.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
      gender: v.gender as 'male' | 'female',
      language: 'Multilingue',
      accent: 'Natural',
      category: 'gemini',
      provider: 'google-tts' as const,
    }))

    console.log('[Audio/GeminiTTS] Returning', voices.length, 'Gemini voices')

    return { success: true, voices }
  } catch (error: any) {
    console.error('[Audio/GeminiTTS] Error listing voices:', error.message)
    return { success: false, voices: [], error: error.message }
  }
}

export function getVoiceInfo(voiceId: string): Voice | null {
  const config = GEMINI_VOICES.find((v) => v.id === voiceId)
  if (!config) return null

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    gender: config.gender as 'male' | 'female',
    language: 'Multilingue',
    accent: 'Natural',
    provider: 'google-tts',
  }
}
