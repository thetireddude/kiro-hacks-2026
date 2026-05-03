/**
 * Environment variable types and validation for voice conversation feature
 */

import type { TTSVoice } from './types'

/**
 * Environment variables required for the voice conversation feature
 */
export interface VoiceConversationEnv {
  OPENAI_API_KEY: string // Required: OpenAI API key
  OPENAI_ORG_ID?: string // Optional: OpenAI organization ID
  TTS_VOICE?: TTSVoice   // Optional: Default TTS voice (default: 'alloy')
  TTS_SPEED?: string     // Optional: Default speech speed (default: '1.0')
  MAX_CONVERSATION_LENGTH?: string // Optional: Max messages (default: '50')
}

/**
 * Get and validate environment variables for voice conversation
 */
export function getVoiceEnv(): VoiceConversationEnv {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }

  return {
    OPENAI_API_KEY: apiKey,
    OPENAI_ORG_ID: process.env.OPENAI_ORG_ID,
    TTS_VOICE: (process.env.TTS_VOICE as TTSVoice) || 'alloy',
    TTS_SPEED: process.env.TTS_SPEED || '1.0',
    MAX_CONVERSATION_LENGTH: process.env.MAX_CONVERSATION_LENGTH || '50',
  }
}

/**
 * Validate that required environment variables are set
 */
export function validateVoiceEnv(): boolean {
  try {
    getVoiceEnv()
    return true
  } catch {
    return false
  }
}
