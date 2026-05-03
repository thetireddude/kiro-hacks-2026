/**
 * API Route: POST /api/chat
 * 
 * Generates AI responses using OpenAI Chat Completions API
 * 
 * Requirements:
 * - 3.1: Send user message and conversation history to OpenAI API
 * - 3.2: Return AI response text to Conversation Manager
 * - 3.3: Maintain conversation context across multiple turns
 * - 3.4: Display error message when response generation fails
 * - 3.5: Allow user to retry when response generation fails
 * - 9.1: Read API key from OPENAI_API_KEY environment variable
 * - 9.3: Use server-side API routes for all OpenAI API calls
 * - 9.5: Display clear error message when API authentication fails
 */

import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { retryWithBackoff } from '@/lib/retry'
import { VoiceError, VoiceErrorCode } from '@/lib/errors'
import { getVoiceEnv } from '@/lib/voice/env'
import type { ConversationMessage } from '@/lib/voice/types'

/**
 * Request body interface for chat
 */
interface ChatRequest {
  message: string
  history: ConversationMessage[]
}

/**
 * Response interface for chat
 */
interface ChatResponse {
  response: string
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
 * Validate request data
 */
function validateChatRequest(body: unknown): body is ChatRequest {
  if (typeof body !== 'object' || body === null) {
    return false
  }
  
  const req = body as Record<string, unknown>
  
  // Check message is a non-empty string
  if (typeof req.message !== 'string' || req.message.trim().length === 0) {
    return false
  }
  
  // Check history is an array
  if (!Array.isArray(req.history)) {
    return false
  }
  
  // Validate each message in history
  for (const msg of req.history) {
    if (typeof msg !== 'object' || msg === null) {
      return false
    }
    
    const m = msg as Record<string, unknown>
    
    if (typeof m.role !== 'string' || (m.role !== 'user' && m.role !== 'assistant')) {
      return false
    }
    
    if (typeof m.content !== 'string' || m.content.trim().length === 0) {
      return false
    }
  }
  
  return true
}

/**
 * Format conversation history for OpenAI Chat Completions API
 */
function formatConversationHistory(
  history: ConversationMessage[],
  userMessage: string
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
  
  // Add system message to set context
  messages.push({
    role: 'system',
    content: 'You are a helpful AI assistant having a natural conversation. Keep responses concise and conversational, optimized for voice interaction. Use short sentences and natural cadence.',
  })
  
  // Add conversation history
  for (const msg of history) {
    messages.push({
      role: msg.role,
      content: msg.content,
    })
  }
  
  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  })
  
  return messages
}

/**
 * POST /api/chat
 * 
 * Generate AI response using OpenAI Chat Completions API
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json()
    
    // Validate request data
    if (!validateChatRequest(body)) {
      return NextResponse.json(
        {
          error: 'Invalid request format. Expected message (string) and history (array).',
        } as ChatResponse,
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
        } as ChatResponse,
        { status: 500 }
      )
    }
    
    // Format conversation history for OpenAI API
    const messages = formatConversationHistory(body.history, body.message)
    
    // Call OpenAI Chat Completions API with retry logic
    const completion = await retryWithBackoff(
      async () => {
        return await client.chat.completions.create({
          model: 'gpt-4',
          messages,
          temperature: 0.7,
          max_tokens: 500,
        })
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      }
    )
    
    // Extract response text
    const responseText = completion.choices[0]?.message?.content
    
    if (!responseText) {
      const voiceError = new VoiceError(
        'Empty response from OpenAI API',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Failed to generate response. Please try again.'
      )
      
      return NextResponse.json(
        {
          error: voiceError.userMessage,
        } as ChatResponse,
        { status: 500 }
      )
    }
    
    // Return AI response
    return NextResponse.json({
      response: responseText,
    } as ChatResponse)
    
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
          } as ChatResponse,
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
          } as ChatResponse,
          { status: 429 }
        )
      }
      
      // Other API errors
      const voiceError = new VoiceError(
        `OpenAI API error: ${error.message}`,
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Failed to generate response. Please try again.'
      )
      
      return NextResponse.json(
        {
          error: voiceError.userMessage,
        } as ChatResponse,
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
        } as ChatResponse,
        { status: 503 }
      )
    }
    
    // Generic error fallback
    const voiceError = new VoiceError(
      error instanceof Error ? error.message : 'Unknown error',
      VoiceErrorCode.NETWORK_ERROR,
      true,
      'Failed to generate response. Please try again.'
    )
    
    return NextResponse.json(
      {
        error: voiceError.userMessage,
      } as ChatResponse,
      { status: 500 }
    )
  }
}
