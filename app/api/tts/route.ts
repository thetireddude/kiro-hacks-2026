/**
 * API Route: POST /api/tts
 * 
 * Generates speech audio using OpenAI Text-to-Speech API
 * 
 * Requirements:
 * - 4.1: Accept text from AI response
 * - 4.2: Call OpenAI TTS API for speech synthesis
 * - 4.3: Stream audio data back to client
 * - 4.4: Implement retry logic with exponential backoff
 * - 4.5: Return audio in mp3 format
 * - 9.1: Read API key from OPENAI_API_KEY environment variable
 * - 9.3: Use server-side API routes for all OpenAI API calls
 * - 9.5: Display clear error message when API authentication fails
 * - 15.4: Stream audio playback as it becomes available
 */

import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { retryWithBackoff } from '@/lib/retry'
import { VoiceError, VoiceErrorCode } from '@/lib/errors'
import { getVoiceEnv } from '@/lib/voice/env'
import type { TTSVoice } from '@/lib/voice/types'

/**
 * Request body interface for TTS
 */
interface TTSRequest {
  text: string
  voice?: TTSVoice
  speed?: number
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
 * Validate request data
 */
function validateTTSRequest(body: unknown): body is TTSRequest {
  if (typeof body !== 'object' || body === null) {
    return false
  }
  
  const req = body as Record<string, unknown>
  
  // Check text is a non-empty string
  if (typeof req.text !== 'string' || req.text.trim().length === 0) {
    return false
  }
  
  // Check voice is valid if provided
  if (req.voice !== undefined) {
    const validVoices: TTSVoice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    if (!validVoices.includes(req.voice as TTSVoice)) {
      return false
    }
  }
  
  // Check speed is valid if provided (0.25 to 4.0)
  if (req.speed !== undefined) {
    if (typeof req.speed !== 'number' || req.speed < 0.25 || req.speed > 4.0) {
      return false
    }
  }
  
  return true
}

/**
 * POST /api/tts
 * 
 * Generate speech audio using OpenAI Text-to-Speech API
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body.',
        },
        { status: 400 }
      )
    }
    
    // Validate request data
    if (!validateTTSRequest(body)) {
      return NextResponse.json(
        {
          error: 'Invalid request format. Expected text (string), optional voice (string), and optional speed (number 0.25-4.0).',
        },
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
        },
        { status: 500 }
      )
    }
    
    // Use provided voice or default
    const voice: TTSVoice = body.voice || 'alloy'
    const speed = body.speed || 1.0
    
    // Call OpenAI TTS API with retry logic
    const audioStream = await retryWithBackoff(
      async () => {
        return await client.audio.speech.create({
          model: 'tts-1',
          voice,
          input: body.text,
          speed,
          response_format: 'mp3',
        })
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      }
    )
    
    // Convert the response to a buffer
    const buffer = await audioStream.arrayBuffer()
    
    // Stream audio data back to client with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
    
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
          },
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
          },
          { status: 429 }
        )
      }
      
      // Other API errors
      const voiceError = new VoiceError(
        `OpenAI API error: ${error.message}`,
        VoiceErrorCode.TTS_SYNTHESIS_FAILED,
        true,
        'Failed to synthesize speech. Please try again.'
      )
      
      return NextResponse.json(
        {
          error: voiceError.userMessage,
        },
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
        },
        { status: 503 }
      )
    }
    
    // Generic error fallback
    const voiceError = new VoiceError(
      error instanceof Error ? error.message : 'Unknown error',
      VoiceErrorCode.TTS_SYNTHESIS_FAILED,
      true,
      'Failed to synthesize speech. Please try again.'
    )
    
    return NextResponse.json(
      {
        error: voiceError.userMessage,
      },
      { status: 500 }
    )
  }
}
