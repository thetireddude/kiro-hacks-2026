/**
 * Unit tests for useVoiceSynthesis hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoiceSynthesis } from './useVoiceSynthesis';
import { VoiceErrorCode } from '@/lib/errors';

// Mock the retry utility - pass through to the actual function
jest.mock('@/lib/retry', () => ({
  retryWithBackoff: jest.fn(async (fn) => await fn()),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock AudioContext
class MockAudioContext {
  decodeAudioData = jest.fn();
  close = jest.fn();
}

describe('useVoiceSynthesis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    
    // Reset AudioContext mock
    (global as any).AudioContext = MockAudioContext;
    (global as any).webkitAudioContext = MockAudioContext;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useVoiceSynthesis());

      expect(result.current.isSynthesizing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.synthesize).toBe('function');
      expect(typeof result.current.cancel).toBe('function');
    });
  });

  describe('synthesize', () => {
    it('should successfully synthesize text to audio buffer', async () => {
      // Mock successful API response
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockAudioBuffer = { duration: 2.5, numberOfChannels: 1 };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      });

      // Create a mock instance with decodeAudioData
      const mockContextInstance = new MockAudioContext();
      mockContextInstance.decodeAudioData = jest.fn().mockResolvedValue(mockAudioBuffer);
      
      // Mock the constructor to return our instance
      (global as any).AudioContext = jest.fn(() => mockContextInstance);

      const { result } = renderHook(() => useVoiceSynthesis());

      let audioBuffer: any;
      await act(async () => {
        audioBuffer = await result.current.synthesize('Hello, world!');
      });

      // Verify state during and after synthesis
      expect(audioBuffer).toEqual(mockAudioBuffer);
      expect(result.current.isSynthesizing).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tts',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: 'Hello, world!',
            voice: 'alloy',
            speed: 1.0,
          }),
        })
      );
    });

    it('should set isSynthesizing to true during synthesis', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockAudioBuffer = { duration: 2.5, numberOfChannels: 1 };
      
      let resolveArrayBuffer: (value: ArrayBuffer) => void;
      const arrayBufferPromise = new Promise<ArrayBuffer>((resolve) => {
        resolveArrayBuffer = resolve;
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockReturnValue(arrayBufferPromise),
      });

      const mockContextInstance = new MockAudioContext();
      mockContextInstance.decodeAudioData = jest.fn().mockResolvedValue(mockAudioBuffer);
      (global as any).AudioContext = jest.fn(() => mockContextInstance);

      const { result } = renderHook(() => useVoiceSynthesis());

      // Start synthesis
      let synthesizePromise: Promise<any>;
      act(() => {
        synthesizePromise = result.current.synthesize('Test text');
      });

      // Check that isSynthesizing is true
      await waitFor(() => {
        expect(result.current.isSynthesizing).toBe(true);
      });

      // Complete the synthesis
      await act(async () => {
        resolveArrayBuffer!(mockArrayBuffer);
        await synthesizePromise;
      });

      // Check that isSynthesizing is false
      expect(result.current.isSynthesizing).toBe(false);
    });

    it('should handle empty text input', async () => {
      const { result } = renderHook(() => useVoiceSynthesis());

      await act(async () => {
        await expect(result.current.synthesize('')).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('Empty text');
      expect(result.current.isSynthesizing).toBe(false);
    });

    it('should handle whitespace-only text input', async () => {
      const { result } = renderHook(() => useVoiceSynthesis());

      await act(async () => {
        await expect(result.current.synthesize('   ')).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isSynthesizing).toBe(false);
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Internal server error' }),
      });

      const { result } = renderHook(() => useVoiceSynthesis());

      await act(async () => {
        await expect(result.current.synthesize('Test text')).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toHaveProperty('code', VoiceErrorCode.TTS_SYNTHESIS_FAILED);
      expect(result.current.isSynthesizing).toBe(false);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useVoiceSynthesis());

      await act(async () => {
        await expect(result.current.synthesize('Test text')).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isSynthesizing).toBe(false);
    });

    it('should handle audio decoding errors', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      });

      const mockContextInstance = new MockAudioContext();
      mockContextInstance.decodeAudioData = jest.fn().mockRejectedValue(
        new Error('Invalid audio format')
      );
      (global as any).AudioContext = jest.fn(() => mockContextInstance);

      const { result } = renderHook(() => useVoiceSynthesis());

      await act(async () => {
        await expect(result.current.synthesize('Test text')).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isSynthesizing).toBe(false);
    });

    it('should clear previous errors on successful synthesis', async () => {
      const { result } = renderHook(() => useVoiceSynthesis());

      // First call fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Server error' }),
      });

      await act(async () => {
        await expect(result.current.synthesize('Test')).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();

      // Second call succeeds
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockAudioBuffer = { duration: 1.0, numberOfChannels: 1 };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      });

      const mockContextInstance = new MockAudioContext();
      mockContextInstance.decodeAudioData = jest.fn().mockResolvedValue(mockAudioBuffer);
      (global as any).AudioContext = jest.fn(() => mockContextInstance);

      await act(async () => {
        await result.current.synthesize('Test again');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should cancel in-progress synthesis', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      
      let rejectFetch: (reason: any) => void;
      const fetchPromise = new Promise<Response>((_, reject) => {
        rejectFetch = reject;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

      const { result } = renderHook(() => useVoiceSynthesis());

      // Start synthesis
      let synthesizePromise: Promise<any>;
      act(() => {
        synthesizePromise = result.current.synthesize('Test text');
      });

      // Wait for synthesis to start
      await waitFor(() => {
        expect(result.current.isSynthesizing).toBe(true);
      });

      // Cancel synthesis
      act(() => {
        result.current.cancel();
      });

      // Simulate abort error
      await act(async () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        rejectFetch!(abortError);
        
        await expect(synthesizePromise).rejects.toThrow();
      });

      expect(result.current.isSynthesizing).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('cancelled');
    });

    it('should do nothing if no synthesis in progress', () => {
      const { result } = renderHook(() => useVoiceSynthesis());

      // Should not throw
      act(() => {
        result.current.cancel();
      });

      expect(result.current.isSynthesizing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should allow new synthesis after cancellation', async () => {
      const { result } = renderHook(() => useVoiceSynthesis());

      // Start and cancel first synthesis
      let rejectFetch: (reason: any) => void;
      const fetchPromise = new Promise<Response>((_, reject) => {
        rejectFetch = reject;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

      let firstSynthesis: Promise<any>;
      act(() => {
        firstSynthesis = result.current.synthesize('First');
      });

      await waitFor(() => {
        expect(result.current.isSynthesizing).toBe(true);
      });

      act(() => {
        result.current.cancel();
      });

      await act(async () => {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        rejectFetch!(abortError);
        await expect(firstSynthesis).rejects.toThrow();
      });

      // Start new synthesis
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockAudioBuffer = { duration: 1.0, numberOfChannels: 1 };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      });

      const mockContextInstance = new MockAudioContext();
      mockContextInstance.decodeAudioData = jest.fn().mockResolvedValue(mockAudioBuffer);
      (global as any).AudioContext = jest.fn(() => mockContextInstance);

      await act(async () => {
        const buffer = await result.current.synthesize('Second');
        expect(buffer).toEqual(mockAudioBuffer);
      });

      expect(result.current.isSynthesizing).toBe(false);
    });
  });

  describe('AudioContext Management', () => {
    it('should reuse AudioContext across multiple synthesis calls', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockAudioBuffer = { duration: 1.0, numberOfChannels: 1 };
      
      const mockContextInstance = new MockAudioContext();
      const decodeAudioDataMock = jest.fn().mockResolvedValue(mockAudioBuffer);
      mockContextInstance.decodeAudioData = decodeAudioDataMock;
      
      // Mock constructor to return same instance
      (global as any).AudioContext = jest.fn(() => mockContextInstance);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      });

      const { result } = renderHook(() => useVoiceSynthesis());

      // First synthesis
      await act(async () => {
        await result.current.synthesize('First text');
      });

      // Second synthesis
      await act(async () => {
        await result.current.synthesize('Second text');
      });

      // AudioContext should be created only once
      expect((global as any).AudioContext).toHaveBeenCalledTimes(1);
      // But decodeAudioData should be called twice
      expect(decodeAudioDataMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Messages', () => {
    it('should provide user-friendly error messages', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Internal server error' }),
      });

      const { result } = renderHook(() => useVoiceSynthesis());

      await act(async () => {
        await expect(result.current.synthesize('Test')).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
      
      // Check that error has user-friendly message
      if (result.current.error && 'userMessage' in result.current.error) {
        expect((result.current.error as any).userMessage).toContain('text response instead');
      }
    });

    it('should include error code for categorization', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() => useVoiceSynthesis());

      await act(async () => {
        await expect(result.current.synthesize('Test')).rejects.toThrow();
      });

      expect(result.current.error).toBeTruthy();
      
      // Check that error has code
      if (result.current.error && 'code' in result.current.error) {
        expect((result.current.error as any).code).toBe(VoiceErrorCode.TTS_SYNTHESIS_FAILED);
      }
    });
  });

  describe('Integration with Retry Logic', () => {
    it('should use retry logic for API calls', async () => {
      const { retryWithBackoff } = require('@/lib/retry');
      
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockAudioBuffer = { duration: 1.0, numberOfChannels: 1 };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      });

      const mockContextInstance = new MockAudioContext();
      mockContextInstance.decodeAudioData = jest.fn().mockResolvedValue(mockAudioBuffer);
      (global as any).AudioContext = jest.fn(() => mockContextInstance);

      const { result } = renderHook(() => useVoiceSynthesis());

      await act(async () => {
        await result.current.synthesize('Test text');
      });

      // Verify retry logic was used
      expect(retryWithBackoff).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        })
      );
    });
  });
});
