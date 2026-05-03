/**
 * Unit tests for POST /api/transcribe
 */

import { POST } from './route'
import OpenAI from 'openai'

// Mock dependencies
jest.mock('openai')
jest.mock('@/lib/voice/env')
jest.mock('@/lib/retry')

import { getVoiceEnv } from '@/lib/voice/env'
import { retryWithBackoff } from '@/lib/retry'

describe('POST /api/transcribe', () => {
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
  
  describe('successful transcription', () => {
    it('returns transcribed text for valid audio', async () => {
      // Mock OpenAI client
      const mockCreate = jest.fn().mockResolvedValue('Hello, world!')
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          transcriptions: {
            create: mockCreate,
          },
        },
      } as any))
      
      // Mock retry to just call the function
      mockRetryWithBackoff.mockImplementation(async (fn) => await fn())
      
      // Create request with base64 audio
      const audioData = btoa('fake-audio-data')
      const request = new Request('http://localhost/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audio: audioData,
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.text).toBe('Hello, world!')
      expect(data.error).toBeUndefined()
      expect(mockCreate).toHaveBeenCalledWith({
        file: expect.any(File),
        model: 'whisper-1',
        language: undefined,
        response_format: 'text',
      })
    })
    
    it('includes language hint when provided', async () => {
      const mockCreate = jest.fn().mockResolvedValue('Hola, mundo!')
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          transcriptions: {
            create: mockCreate,
          },
        },
      } as any))
      
      mockRetryWithBackoff.mockImplementation(async (fn) => await fn())
      
      const audioData = btoa('fake-audio-data')
      const request = new Request('http://localhost/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audio: audioData,
          language: 'es',
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.text).toBe('Hola, mundo!')
      expect(mockCreate).toHaveBeenCalledWith({
        file: expect.any(File),
        model: 'whisper-1',
        language: 'es',
        response_format: 'text',
      })
    })
    
    it('handles data URL format with prefix', async () => {
      const mockCreate = jest.fn().mockResolvedValue('Test transcription')
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          transcriptions: {
            create: mockCreate,
          },
        },
      } as any))
      
      mockRetryWithBackoff.mockImplementation(async (fn) => await fn())
      
      const audioData = `data:audio/webm;base64,${btoa('fake-audio-data')}`
      const request = new Request('http://localhost/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audio: audioData,
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.text).toBe('Test transcription')
    })
  })
  
  describe('validation errors', () => {
    it('returns 400 for missing audio data', async () => {
      const request = new Request('http://localhost/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid audio data format')
    })
    
    it('returns 400 for invalid audio data type', async () => {
      const request = new Request('http://localhost/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audio: 12345, // not a string
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid audio data format')
    })
    
    it('returns 400 for invalid base64 string', async () => {
      const request = new Request('http://localhost/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audio: 'not-valid-base64!!!',
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid audio data format')
    })
  })
  
  describe('API key errors', () => {
    it('returns 500 when API key is missing', async () => {
      mockGetVoiceEnv.mockImplementation(() => {
        throw new Error('OPENAI_API_KEY environment variable is required')
      })
      
      const audioData = btoa('fake-audio-data')
      const request = new Request('http://localhost/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audio: audioData,
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
      const mockCreate = jest.fn().mockRejectedValue(
        Object.assign(new Error('Invalid API key'), {
          status: 401,
        })
      )
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          transcriptions: {
            create: mockCreate,
          },
        },
      } as any))
      
      // Make OpenAI.APIError available
      ;(OpenAI as any).APIError = class APIError extends Error {
        status: number
        constructor(message: string, status: number) {
          super(message)
          this.status = status
        }
      }
      
      mockRetryWithBackoff.mockImplementation(async (fn) => {
        const error = new (OpenAI as any).APIError('Invalid API key', 401)
        throw error
      })
      
      const audioData = btoa('fake-audio-data')
      const request = new Request('http://localhost/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audio: audioData,
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
      
      const audioData = btoa('fake-audio-data')
      const request = new Request('http://localhost/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audio: audioData,
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
      
      const audioData = btoa('fake-audio-data')
      const request = new Request('http://localhost/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audio: audioData,
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toContain('Speech recognition failed')
    })
  })
  
  describe('network errors', () => {
    it('returns 503 for network errors', async () => {
      mockRetryWithBackoff.mockImplementation(async () => {
        throw new Error('fetch failed')
      })
      
      const audioData = btoa('fake-audio-data')
      const request = new Request('http://localhost/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audio: audioData,
        }),
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(503)
      expect(data.error).toContain('Connection lost')
    })
  })
  
  describe('retry logic', () => {
    it('calls retryWithBackoff with correct configuration', async () => {
      const mockCreate = jest.fn().mockResolvedValue('Success')
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          transcriptions: {
            create: mockCreate,
          },
        },
      } as any))
      
      mockRetryWithBackoff.mockImplementation(async (fn) => await fn())
      
      const audioData = btoa('fake-audio-data')
      const request = new Request('http://localhost/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audio: audioData,
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
})
