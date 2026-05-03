/**
 * Error handling utilities for the voice conversation feature
 */

/**
 * Voice error codes for different error scenarios
 */
export enum VoiceErrorCode {
  MICROPHONE_PERMISSION_DENIED = 'MICROPHONE_PERMISSION_DENIED',
  MICROPHONE_NOT_FOUND = 'MICROPHONE_NOT_FOUND',
  SPEECH_RECOGNITION_FAILED = 'SPEECH_RECOGNITION_FAILED',
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_AUTHENTICATION_FAILED = 'API_AUTHENTICATION_FAILED',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TTS_SYNTHESIS_FAILED = 'TTS_SYNTHESIS_FAILED',
  AUDIO_PLAYBACK_FAILED = 'AUDIO_PLAYBACK_FAILED',
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
}

/**
 * Custom error class for voice conversation errors
 */
export class VoiceError extends Error {
  constructor(
    message: string,
    public code: VoiceErrorCode,
    public recoverable: boolean,
    public userMessage: string
  ) {
    super(message)
    this.name = 'VoiceError'
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VoiceError)
    }
  }
}

/**
 * Convert error to user-friendly message
 */
export function formatErrorMessage(error: VoiceError): string {
  return error.userMessage || error.message
}

/**
 * Determine if error is recoverable
 */
export function isRecoverableError(error: VoiceError): boolean {
  return error.recoverable
}
