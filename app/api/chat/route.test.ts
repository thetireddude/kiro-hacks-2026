/**
 * Unit tests for POST /api/chat
 */

import { POST } from './route'
import OpenAI from 'openai'

// Mock dependencies
jest.mock('openai')
jest.mock('@/lib/voice/env')
jest.mock('@/lib/retry')

import { getVoiceEnv } from '@/lib/voice/env'
import { retryWithBackoff } from '@/lib/retry'

describe('POST /api/chat', () => {
  const mockGetVoiceEnv = getVoiceEnv as jest.MockedFunction<typeof getVoiceEnv>
  const mockRetryWithBackoff = retryWithBackoff as jest.MockedFunction<typeof retryWithBackoff>
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock for getVoiceEnv
    mockGetVoiceEnv.mockReturnValue({
      OPENAI_API_KEY: 'test-api-key',
      OPENAI_ORG_ID: 'test-org-id',
      TTS_VOICE: 'alloy',
      TTS_SPEED: '1.0',
      MAX_CONVERSATION_LENGTH: '50',
    })
  })
  
  describe('successful response generation', () => {
    it('returns AI response for valid message', async () => {
      // Mock OpenAI client
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'This is an AI response.',
            },
          },
        ],
      })
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as any))
      
      // Mock retry to just call the function
      mockRetryWithBackoff.mockImplementation(async (fn) => await fn())
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'What is the weather?',
          history: [],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.response).toBe('This is an AI response.')
      expect(data.error).toBeUndefined()
    })
    
    it('includes conversation history in API call', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Follow-up response.',
            },
          },
        ],
      })
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as any))
      
      mockRetryWithBackoff.mockImplementation(async (fn) => await fn())
      
      const history = [
        {
          id: '1',
          role: 'user' as const,
          content: 'What is AI?',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant' as const,
          content: 'AI is artificial intelligence.',
          timestamp: new Date(),
        },
      ]
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Tell me more.',
          history,
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.response).toBe('Follow-up response.')
      
      // Verify the API was called with correct message format
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('helpful AI assistant'),
          }),
          expect.objectContaining({
            role: 'user',
            content: 'What is AI?',
          }),
          expect.objectContaining({
            role: 'assistant',
            content: 'AI is artificial intelligence.',
          }),
          expect.objectContaining({
            role: 'user',
            content: 'Tell me more.',
          }),
        ]),
        temperature: 0.7,
        max_tokens: 500,
      })
    })
    
    it('formats conversation history correctly for OpenAI API', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Response.',
            },
          },
        ],
      })
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as any))
      
      mockRetryWithBackoff.mockImplementation(async (fn) => await fn())
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: [],
        }),
      })
      
      await POST(request)
      
      // Verify system message is included
      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.messages[0].role).toBe('system')
      expect(callArgs.messages[0].content).toContain('helpful AI assistant')
      
      // Verify user message is last
      expect(callArgs.messages[callArgs.messages.length - 1].role).toBe('user')
      expect(callArgs.messages[callArgs.messages.length - 1].content).toBe('Hello')
    })
  })
  
  describe('validation errors', () => {
    it('returns 400 for missing message', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          history: [],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid request format')
    })
    
    it('returns 400 for empty message', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '   ',
          history: [],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid request format')
    })
    
    it('returns 400 for non-string message', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 12345,
          history: [],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid request format')
    })
    
    it('returns 400 for missing history', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid request format')
    })
    
    it('returns 400 for non-array history', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: 'not-an-array',
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid request format')
    })
    
    it('returns 400 for invalid message in history', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: [
            {
              id: '1',
              role: 'user',
              content: 'Previous message',
              timestamp: new Date(),
            },
            {
              id: '2',
              role: 'invalid-role',
              content: 'Invalid message',
              timestamp: new Date(),
            },
          ],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid request format')
    })
    
    it('returns 400 for empty content in history', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: [
            {
              id: '1',
              role: 'user',
              content: '   ',
              timestamp: new Date(),
            },
          ],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid request format')
    })
    
    it('returns 500 for invalid JSON', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: 'invalid json',
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBeTruthy()
    })
  })
  
  describe('API key errors', () => {
    it('returns 500 when API key is missing', async () => {
      mockGetVoiceEnv.mockImplementation(() => {
        throw new Error('OPENAI_API_KEY environment variable is required')
      })
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: [],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toContain('Voice services are not configured')
    })
  })
  
  describe('OpenAI API errors', () => {
    it('returns 401 for authentication errors', async () => {
      ;(OpenAI as any).APIError = class APIError extends Error {
        status: number
        constructor(message: string, status: number) {
          super(message)
          this.status = status
        }
      }
      
      mockRetryWithBackoff.mockImplementation(async () => {
        throw new (OpenAI as any).APIError('Invalid API key', 401)
      })
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: [],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.error).toContain('Unable to connect to voice services')
    })
    
    it('returns 429 for rate limit errors', async () => {
      ;(OpenAI as any).APIError = class APIError extends Error {
        status: number
        constructor(message: string, status: number) {
          super(message)
          this.status = status
        }
      }
      
      mockRetryWithBackoff.mockImplementation(async () => {
        throw new (OpenAI as any).APIError('Rate limit exceeded', 429)
      })
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: [],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(429)
      expect(data.error).toContain('Voice services are temporarily busy')
    })
    
    it('returns 500 for other API errors', async () => {
      ;(OpenAI as any).APIError = class APIError extends Error {
        status: number
        constructor(message: string, status: number) {
          super(message)
          this.status = status
        }
      }
      
      mockRetryWithBackoff.mockImplementation(async () => {
        throw new (OpenAI as any).APIError('Internal server error', 500)
      })
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: [],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to generate response')
    })
  })
  
  describe('network errors', () => {
    it('returns 503 for network errors', async () => {
      mockRetryWithBackoff.mockImplementation(async () => {
        throw new Error('fetch failed')
      })
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: [],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(503)
      expect(data.error).toContain('Connection lost')
    })
  })
  
  describe('empty response handling', () => {
    it('returns 500 when OpenAI returns empty response', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      })
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as any))
      
      mockRetryWithBackoff.mockImplementation(async (fn) => await fn())
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: [],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to generate response')
    })
    
    it('returns 500 when OpenAI returns no choices', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [],
      })
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as any))
      
      mockRetryWithBackoff.mockImplementation(async (fn) => await fn())
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: [],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to generate response')
    })
  })
  
  describe('retry logic', () => {
    it('calls retryWithBackoff with correct configuration', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Response.',
            },
          },
        ],
      })
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as any))
      
      mockRetryWithBackoff.mockImplementation(async (fn) => await fn())
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: [],
        }),
      })
      
      await POST(request)
      
      expect(mockRetryWithBackoff).toHaveBeenCalledWith(
        expect.any(Function),
        {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        }
      )
    })
  })
  
  describe('generic error handling', () => {
    it('returns 500 for unknown errors', async () => {
      mockRetryWithBackoff.mockImplementation(async () => {
        throw new Error('Unknown error')
      })
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          history: [],
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to generate response')
    })
  })
})
