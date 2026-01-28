// Audio Provider Types
// Supports ElevenLabs and Google Cloud TTS

export type AudioProviderId = 'elevenlabs' | 'google-tts'

export type AudioModelId = 
  | 'eleven_multilingual_v2'  // Best quality, 32 languages
  | 'eleven_flash_v2_5'      // Fast, 75ms latency
  | 'eleven_turbo_v2_5'      // Balance quality/speed
  | 'google-neural2'         // Google Neural2
  | 'google-wavenet'         // Google WaveNet
  | 'google-standard'        // Google Standard

export type AudioFormat = 'mp3_44100_128' | 'mp3_22050_32' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000'

export interface Voice {
  id: string
  name: string
  description?: string
  previewUrl?: string
  language?: string
  accent?: string
  gender?: 'male' | 'female' | 'neutral'
  category?: 'premade' | 'cloned' | 'generated' | 'professional'
  provider: AudioProviderId
  labels?: Record<string, string>
}

export interface VoiceSettings {
  stability?: number        // 0-1, default 0.5
  similarityBoost?: number  // 0-1, default 0.75
  style?: number            // 0-1, default 0 (only multilingual v2)
  useSpeakerBoost?: boolean // default true
  speed?: number            // 0.5-2, default 1
}

export interface GenerateAudioRequest {
  text: string
  voiceId: string
  modelId?: AudioModelId
  provider?: AudioProviderId
  settings?: VoiceSettings
  outputFormat?: AudioFormat
  languageCode?: string     // ISO 639-1 (es, en, etc)
}

export interface GenerateAudioResult {
  success: boolean
  audioUrl?: string         // URL to audio file (after upload to storage)
  audioBase64?: string      // Base64 encoded audio (if not uploaded)
  contentType?: string      // audio/mpeg, audio/wav, etc
  duration?: number         // Duration in seconds
  charactersUsed?: number   // Characters billed
  error?: string
  provider: AudioProviderId
}

export interface ListVoicesRequest {
  provider?: AudioProviderId
  language?: string         // Filter by language code
  gender?: 'male' | 'female'
  category?: string
  search?: string           // Search by name/description
}

export interface ListVoicesResult {
  success: boolean
  voices: Voice[]
  error?: string
}

// Audio model configurations
export interface AudioModelConfig {
  id: AudioModelId
  name: string
  description: string
  provider: AudioProviderId
  costPerCharacter: number  // In credits or cents
  maxCharacters: number
  languages: string[]
  latencyMs?: number
  supportsStreaming: boolean
}

export const AUDIO_MODELS: Record<AudioModelId, AudioModelConfig> = {
  'eleven_multilingual_v2': {
    id: 'eleven_multilingual_v2',
    name: 'Multilingual v2',
    description: 'Highest quality, emotionally rich, 32 languages',
    provider: 'elevenlabs',
    costPerCharacter: 1,
    maxCharacters: 5000,
    languages: ['es', 'en', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ar', 'ja', 'ko', 'zh'],
    latencyMs: 500,
    supportsStreaming: true,
  },
  'eleven_flash_v2_5': {
    id: 'eleven_flash_v2_5',
    name: 'Flash v2.5',
    description: 'Ultra-low latency (~75ms), 32 languages',
    provider: 'elevenlabs',
    costPerCharacter: 0.5,
    maxCharacters: 5000,
    languages: ['es', 'en', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ar', 'ja', 'ko', 'zh'],
    latencyMs: 75,
    supportsStreaming: true,
  },
  'eleven_turbo_v2_5': {
    id: 'eleven_turbo_v2_5',
    name: 'Turbo v2.5',
    description: 'Balance of quality and speed',
    provider: 'elevenlabs',
    costPerCharacter: 0.5,
    maxCharacters: 5000,
    languages: ['es', 'en', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ar', 'ja', 'ko', 'zh'],
    latencyMs: 200,
    supportsStreaming: true,
  },
  'google-neural2': {
    id: 'google-neural2',
    name: 'Google Neural2',
    description: 'High quality neural voices',
    provider: 'google-tts',
    costPerCharacter: 0.000016,
    maxCharacters: 5000,
    languages: ['es-US', 'es-MX', 'es-ES', 'en-US', 'en-GB'],
    supportsStreaming: false,
  },
  'google-wavenet': {
    id: 'google-wavenet',
    name: 'Google WaveNet',
    description: 'Natural sounding WaveNet voices',
    provider: 'google-tts',
    costPerCharacter: 0.000016,
    maxCharacters: 5000,
    languages: ['es-US', 'es-MX', 'es-ES', 'en-US', 'en-GB'],
    supportsStreaming: false,
  },
  'google-standard': {
    id: 'google-standard',
    name: 'Google Standard',
    description: 'Basic voices, lowest cost',
    provider: 'google-tts',
    costPerCharacter: 0.000004,
    maxCharacters: 5000,
    languages: ['es-US', 'es-MX', 'es-ES', 'en-US', 'en-GB'],
    supportsStreaming: false,
  },
}

// Default Spanish LATAM voices - loaded from API with Spanish filter
// No hardcoded English voices - voices are fetched dynamically
export const SPANISH_LATAM_VOICES = {
  elevenlabs: [] as { id: string; name: string; gender: 'male' | 'female' }[],
  google: [
    { id: 'es-MX-Wavenet-A', name: 'Mexico Femenina', gender: 'female' as const },
    { id: 'es-MX-Wavenet-B', name: 'Mexico Masculino', gender: 'male' as const },
    { id: 'es-MX-Wavenet-C', name: 'Mexico Femenina 2', gender: 'female' as const },
    { id: 'es-US-Neural2-A', name: 'Latino US Femenina', gender: 'female' as const },
    { id: 'es-US-Neural2-B', name: 'Latino US Masculino', gender: 'male' as const },
  ],
}
