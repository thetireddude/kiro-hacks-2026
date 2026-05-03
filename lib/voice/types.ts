/**
 * Core type definitions for the voice conversation feature
 */

/**
 * Conversation message in the history
 */
export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  audioUrl?: string // optional reference to audio for playback
}

/**
 * Current state of the conversation
 */
export type ConversationState = 
  | 'listening'    // Waiting for user input
  | 'processing'   // Transcribing user speech
  | 'thinking'     // Generating AI response
  | 'speaking'     // Playing AI audio response

/**
 * Voice activity detection result
 */
export interface VoiceActivity {
  isActive: boolean
  volume: number
  timestamp: number
}

/**
 * Audio configuration
 */
export interface AudioConfig {
  sampleRate: number
  channelCount: number
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}

/**
 * TTS voice options
 */
export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

/**
 * Speech recognition result
 */
export interface SpeechRecognitionResult {
  transcript: string
  isFinal: boolean
  confidence: number
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
    recoverable: boolean
  }
}
