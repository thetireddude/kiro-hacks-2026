/**
 * API Route: POST /api/transcribe
 * 
 * Transcribes audio to text using OpenAI Whisper API
 * 
 * Requirements:
 * - 2.1: Send audio data to OpenAI API
 * - 2.2: Return transcribed text to Conversation Manager
 * - 2.3: Use API key from environment variables
 * - 2.4: Retry up to 3 times with exponential backoff
 * - 2.5: Display error message when all retries fail
 * - 9.1: Read API key from OPENAI_API_KEY environment variable
 * - 9.3: Use server-side API routes for all OpenAI API calls
 * - 9.5: Display clear error message when API authentication fails
 */

import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { retryWithBackoff } from '@/lib/retry'
import { VoiceError, VoiceErrorCode } from '@/lib/errors'
import { getVoiceEnv } from '@/lib/voice/env'

/**
 * Request body interface for transcription
 */
interface TranscribeRequest {
  audio: string // base64-encoded audio data
  language?: string // optional language hint (e.g., 'en', 'es', 'fr')
}

/**
 * Response interface for transcription
 */
interface TranscribeResponse {
  text: string
  error?: string
}

/**
 * Initialize OpenAI client with API key from environment
 */
function getOpenAIClient(): OpenAI {
  const env = getVoiceEnv()
  
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    organization: env.OPENAI_ORG_ID,
  })
}

/**
 * Convert base64 audio data to File object for OpenAI API
 */
function base64ToFile(base64Data: string, filename: string = 'audio.webm'): File {
  // Remove data URL prefix if present (e.g., "data:audio/webm;base64,")
  const base64String = base64Data.includes(',') 
    ? base64Data.split(',')[1] 
    : base64Data
  
  // Convert base64 to binary
  const binaryString = atob(base64String)
  const bytes = new Uint8Array(binaryString.length)
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  // Create File object
  const blob = new Blob([bytes], { type: 'audio/webm' })
  return new File([blob], filename, { type: 'audio/webm' })
}

/**
 * Validate audio data format
 */
function validateAudioData(audio: unknown): audio is string {
  if (typeof audio !== 'string') {
    return false
  }
  
  // Check if it's a valid base64 string (with or without data URL prefix)
  const base64String = audio.includes(',') ? audio.split(',')[1] : audio
  
  try {
    // Attempt to decode to verify it's valid base64
    atob(base64String)
    return true
  } catch {
    return false
  }
}

/**
 * POST /api/transcribe
 * 
 * Transcribe audio to text using OpenAI Whisper API
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json() as TranscribeRequest
    
    // Validate audio data
    if (!body.audio || !validateAudioData(body.audio)) {
      return NextResponse.json(
        {
          error: 'Invalid audio data format. Expected base64-encoded audio.',
        } as TranscribeResponse,
        { status: 400 }
      )
    }
    
    // Initialize OpenAI client
    let client: OpenAI
    try {
      client = getOpenAIClient()
    } catch (error) {
      const voiceError = new VoiceError(
        'API key missing',
        VoiceErrorCode.API_KEY_MISSING,
        false,
        'Voice services are not configured. Please contact support.'
      )
      
      return NextResponse.json(
        {
          error: voiceError.userMessage,
        } as TranscribeResponse,
        { status: 500 }
      )
    }
    
    // Convert base64 to File
    const audioFile = base64ToFile(body.audio)
    
    // Call OpenAI Whisper API with retry logic
    const transcription = await retryWithBackoff(
      async () => {
        return await client.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          language: body.language,
          response_format: 'text',
        })
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      }
    )
    
    // Return transcribed text
    return NextResponse.json({
      text: transcription,
    } as TranscribeResponse)
    
  } catch (error) {
    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      // Authentication error
      if (error.status === 401) {
        const voiceError = new VoiceError(
          'API authentication failed',
          VoiceErrorCode.API_AUTHENTICATION_FAILED,
          false,
          'Unable to connect to voice services. Please contact support.'
        )
        
        return NextResponse.json(
          {
            error: voiceError.userMessage,
          } as TranscribeResponse,
          { status: 401 }
        )
      }
      
      // Rate limit error
      if (error.status === 429) {
        const voiceError = new VoiceError(
          'API rate limit exceeded',
          VoiceErrorCode.API_RATE_LIMIT,
          true,
          'Voice services are temporarily busy. Please wait a moment and try again.'
        )
        
        return NextResponse.json(
          {
            error: voiceError.userMessage,
          } as TranscribeResponse,
          { status: 429 }
        )
      }
      
      // Other API errors
      const voiceError = new VoiceError(
        `OpenAI API error: ${error.message}`,
        VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
        true,
        'Speech recognition failed. Please try again.'
      )
      
      return NextResponse.json(
        {
          error: voiceError.userMessage,
        } as TranscribeResponse,
        { status: 500 }
      )
    }
    
    // Network errors
    if (error instanceof Error && error.message.includes('fetch')) {
      const voiceError = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost. Please check your internet connection and try again.'
      )
      
      return NextResponse.json(
        {
          error: voiceError.userMessage,
        } as TranscribeResponse,
        { status: 503 }
      )
    }
    
    // Generic error fallback
    const voiceError = new VoiceError(
      error instanceof Error ? error.message : 'Unknown error',
      VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
      true,
      'Speech recognition failed. Please try again.'
    )
    
    return NextResponse.json(
      {
        error: voiceError.userMessage,
      } as TranscribeResponse,
      { status: 500 }
    )
  }
}
