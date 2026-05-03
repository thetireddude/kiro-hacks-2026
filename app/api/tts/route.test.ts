/**
 * Integration tests for POST /api/tts
 * 
 * Tests the TTS API route for:
 * - Successful synthesis with different voices and speeds
 * - Audio streaming and format
 * - Error handling (validation errors, network errors)
 * - Voice and speed parameter validation
 */

import { POST } from './route'
import OpenAI from 'openai'

// Mock dependencies
jest.mock('openai')
jest.mock('@/lib/voice/env')
jest.mock('@/lib/retry')

import { getVoiceEnv } from '@/lib/voice/env'
import { retryWithBackoff } from '@/lib/retry'

describe('POST /api/tts', () => {
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
    
    // Default mock for retry - just call the function
    mockRetryWithBackoff.mockImplementation(async (fn) => await fn())
  })

  describe('Successful synthesis', () => {
    it('synthesizes speech with default voice and speed', async () => {
      // Mock OpenAI client
      const mockAudioBuffer = new ArrayBuffer(1024)
      const mockCreate = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      })
      
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          speech: {
            create: mockCreate,
          },
        },
      } as any))

      // Create request
      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, this is a test message.',
        }),
      })

      // Call API
      const response = await POST(request)

      // Verify response
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('audio/mpeg')
      expect(response.headers.get('Content-Length')).toBe('1024')

      // Verify OpenAI was called correctly
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'tts-1',
        voice: 'alloy',
        input: 'Hello, this is a test message.',
        speed: 1.0,
        response_format: 'mp3',
      })
    })

    it('synthesizes speech with custom voice', async () => {
      const mockAudioBuffer = new ArrayBuffer(2048)
      const mockCreate = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      })
      
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          speech: {
            create: mockCreate,
          },
        },
      } as any))

      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test with nova voice',
          voice: 'nova',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: 'nova',
        })
      )
    })

    it('synthesizes speech with custom speed', async () => {
      const mockAudioBuffer = new ArrayBuffer(512)
      const mockCreate = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      })
      
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          speech: {
            create: mockCreate,
          },
        },
      } as any))

      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test with faster speed',
          speed: 1.5,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          speed: 1.5,
        })
      )
    })

    it('synthesizes speech with all parameters specified', async () => {
      const mockAudioBuffer = new ArrayBuffer(3000)
      const mockCreate = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      })
      
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          speech: {
            create: mockCreate,
          },
        },
      } as any))

      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Complete test message',
          voice: 'echo',
          speed: 0.8,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'tts-1',
        voice: 'echo',
        input: 'Complete test message',
        speed: 0.8,
        response_format: 'mp3',
      })
    })

    it('supports all valid voice options', async () => {
      const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']

      for (const voice of validVoices) {
        jest.clearAllMocks()
        mockGetVoiceEnv.mockReturnValue({
          OPENAI_API_KEY: 'test-api-key',
          OPENAI_ORG_ID: 'test-org-id',
          TTS_VOICE: 'alloy',
          TTS_SPEED: '1.0',
          MAX_CONVERSATION_LENGTH: '50',
        })
        mockRetryWithBackoff.mockImplementation(async (fn) => await fn())

        const mockAudioBuffer = new ArrayBuffer(1024)
        const mockCreate = jest.fn().mockResolvedValue({
          arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
        })
        
        ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
          audio: {
            speech: {
              create: mockCreate,
            },
          },
        } as any))

        const request = new Request('http://localhost/api/tts', {
          method: 'POST',
          body: JSON.stringify({
            text: `Test with ${voice} voice`,
            voice,
          }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            voice,
          })
        )
      }
    })

    it('supports speed range from 0.25 to 4.0', async () => {
      const speeds = [0.25, 0.5, 1.0, 2.0, 4.0]

      for (const speed of speeds) {
        jest.clearAllMocks()
        mockGetVoiceEnv.mockReturnValue({
          OPENAI_API_KEY: 'test-api-key',
          OPENAI_ORG_ID: 'test-org-id',
          TTS_VOICE: 'alloy',
          TTS_SPEED: '1.0',
          MAX_CONVERSATION_LENGTH: '50',
        })
        mockRetryWithBackoff.mockImplementation(async (fn) => await fn())

        const mockAudioBuffer = new ArrayBuffer(1024)
        const mockCreate = jest.fn().mockResolvedValue({
          arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
        })
        
        ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
          audio: {
            speech: {
              create: mockCreate,
            },
          },
        } as any))

        const request = new Request('http://localhost/api/tts', {
          method: 'POST',
          body: JSON.stringify({
            text: 'Test message',
            speed,
          }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            speed,
          })
        )
      }
    })
  })

  describe('Validation errors', () => {
    it('rejects empty text', async () => {
      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: '',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid request format')
    })

    it('rejects missing text', async () => {
      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          voice: 'nova',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid request format')
    })

    it('rejects invalid voice', async () => {
      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test message',
          voice: 'invalid-voice',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid request format')
    })

    it('rejects speed below 0.25', async () => {
      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test message',
          speed: 0.1,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid request format')
    })

    it('rejects speed above 4.0', async () => {
      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test message',
          speed: 5.0,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid request format')
    })

    it('rejects non-numeric speed', async () => {
      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test message',
          speed: 'fast',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid request format')
    })

    it('rejects invalid JSON', async () => {
      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Error handling', () => {
    it('handles generic error from OpenAI', async () => {
      const mockCreate = jest.fn().mockRejectedValue(
        new Error('Something went wrong')
      )
      
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          speech: {
            create: mockCreate,
          },
        },
      } as any))

      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test message',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Failed to synthesize speech')
    })

    it('handles network error', async () => {
      const mockCreate = jest.fn().mockRejectedValue(
        new Error('fetch failed')
      )
      
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          speech: {
            create: mockCreate,
          },
        },
      } as any))

      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test message',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(503)
      const data = await response.json()
      expect(data.error).toContain('Connection lost')
    })

    it('handles missing API key', async () => {
      mockGetVoiceEnv.mockImplementation(() => {
        throw new Error('OPENAI_API_KEY environment variable is required')
      })

      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test message',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Voice services are not configured')
    })
  })

  describe('Response headers', () => {
    it('sets correct content type header', async () => {
      const mockAudioBuffer = new ArrayBuffer(1024)
      const mockCreate = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      })
      
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          speech: {
            create: mockCreate,
          },
        },
      } as any))

      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test message',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('audio/mpeg')
    })

    it('sets correct content length header', async () => {
      const mockAudioBuffer = new ArrayBuffer(5000)
      const mockCreate = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      })
      
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          speech: {
            create: mockCreate,
          },
        },
      } as any))

      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test message',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Length')).toBe('5000')
    })

    it('sets cache control header', async () => {
      const mockAudioBuffer = new ArrayBuffer(1024)
      const mockCreate = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer),
      })
      
      ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        audio: {
          speech: {
            create: mockCreate,
          },
        },
      } as any))

      const request = new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Test message',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    })
  })
})
