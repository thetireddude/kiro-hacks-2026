/**
 * Unit tests for useSpeechRecognition hook
 * 
 * Tests cover:
 * - Browser Speech Recognition API integration
 * - Server-side transcription fallback
 * - Continuous recognition with interim and final results
 * - Retry logic with exponential backoff
 * - Error handling for various failure scenarios
 * - Resource cleanup
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { VoiceErrorCode } from '@/lib/errors';
import * as retry from '@/lib/retry';

// Mock the retry module
jest.mock('@/lib/retry');

describe('useSpeechRecognition', () => {
  let mockSpeechRecognition: any;
  let mockRecognitionInstance: any;
  let mockGetUserMedia: jest.Mock;
  let mockMediaRecorder: any;
  let mockMediaStream: MediaStream;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock MediaStream
    const mockTrack = {
      stop: jest.fn(),
      kind: 'audio',
      enabled: true,
    };
    mockMediaStream = {
      getTracks: jest.fn(() => [mockTrack]),
      getAudioTracks: jest.fn(() => [mockTrack]),
      active: true,
    } as any;

    // Mock getUserMedia
    mockGetUserMedia = jest.fn().mockResolvedValue(mockMediaStream);
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: mockGetUserMedia,
      },
    });

    // Mock SpeechRecognition instance
    mockRecognitionInstance = {
      continuous: false,
      interimResults: false,
      lang: '',
      maxAlternatives: 1,
      start: jest.fn(),
      stop: jest.fn(),
      abort: jest.fn(),
      onstart: null,
      onend: null,
      onerror: null,
      onresult: null,
    };

    // Mock SpeechRecognition constructor
    mockSpeechRecognition = jest.fn(() => mockRecognitionInstance);
    (global as any).SpeechRecognition = mockSpeechRecognition;
    (global as any).webkitSpeechRecognition = mockSpeechRecognition;

    // Mock MediaRecorder
    mockMediaRecorder = {
      start: jest.fn(),
      stop: jest.fn(),
      state: 'inactive',
      ondataavailable: null,
      onstop: null,
    };
    (global as any).MediaRecorder = jest.fn(() => mockMediaRecorder);

    // Mock fetch for server transcription
    global.fetch = jest.fn();

    // Mock retryWithBackoff to just call the function once
    (retry.retryWithBackoff as jest.Mock).mockImplementation(async (fn) => await fn());
  });

  afterEach(() => {
    delete (global as any).SpeechRecognition;
    delete (global as any).webkitSpeechRecognition;
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      expect(result.current.isListening).toBe(false);
      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.isSupported).toBe(true);
    });

    it('should provide all required actions', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      expect(typeof result.current.startListening).toBe('function');
      expect(typeof result.current.stopListening).toBe('function');
      expect(typeof result.current.resetTranscript).toBe('function');
    });

    it('should detect when browser does not support Speech Recognition', () => {
      delete (global as any).SpeechRecognition;
      delete (global as any).webkitSpeechRecognition;

      const { result } = renderHook(() => useSpeechRecognition());

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('Browser Speech Recognition', () => {
    it('should start browser recognition successfully', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      expect(mockSpeechRecognition).toHaveBeenCalled();
      expect(mockRecognitionInstance.start).toHaveBeenCalled();
      expect(mockRecognitionInstance.continuous).toBe(true);
      expect(mockRecognitionInstance.interimResults).toBe(true);
      expect(mockRecognitionInstance.lang).toBe('en-US');
    });

    it('should handle recognition start event', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      // Simulate onstart event
      act(() => {
        mockRecognitionInstance.onstart();
      });

      expect(result.current.isListening).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle final recognition results', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      // Simulate recognition result
      const mockEvent = {
        resultIndex: 0,
        results: [
          {
            0: { transcript: 'Hello world', confidence: 0.9 },
            isFinal: true,
            length: 1,
          },
        ],
        length: 1,
      };

      act(() => {
        mockRecognitionInstance.onresult(mockEvent);
      });

      expect(result.current.transcript).toBe('Hello world');
      expect(result.current.interimTranscript).toBe('');
    });

    it('should handle interim recognition results', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      // Simulate interim result
      const mockEvent = {
        resultIndex: 0,
        results: [
          {
            0: { transcript: 'Hello', confidence: 0.7 },
            isFinal: false,
            length: 1,
          },
        ],
        length: 1,
      };

      act(() => {
        mockRecognitionInstance.onresult(mockEvent);
      });

      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('Hello');
    });

    it('should accumulate multiple final results', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      // First result
      act(() => {
        mockRecognitionInstance.onresult({
          resultIndex: 0,
          results: [
            {
              0: { transcript: 'Hello', confidence: 0.9 },
              isFinal: true,
              length: 1,
            },
          ],
          length: 1,
        });
      });

      expect(result.current.transcript).toBe('Hello');

      // Second result
      act(() => {
        mockRecognitionInstance.onresult({
          resultIndex: 1,
          results: [
            {
              0: { transcript: 'Hello', confidence: 0.9 },
              isFinal: true,
              length: 1,
            },
            {
              0: { transcript: 'world', confidence: 0.9 },
              isFinal: true,
              length: 1,
            },
          ],
          length: 2,
        });
      });

      expect(result.current.transcript).toBe('Hello world');
    });

    it('should handle recognition end event', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognitionInstance.onstart();
      });

      act(() => {
        mockRecognitionInstance.onend();
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.interimTranscript).toBe('');
    });

    it('should handle no-speech error gracefully', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognitionInstance.onerror({ error: 'no-speech', message: '' });
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.error).toBeNull(); // no-speech is not an error
    });

    it('should handle audio-capture error', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognitionInstance.onerror({ error: 'audio-capture', message: 'Audio capture failed' });
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect((result.current.error as any).code).toBe(VoiceErrorCode.MICROPHONE_PERMISSION_DENIED);
    });

    it('should handle not-allowed error', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognitionInstance.onerror({ error: 'not-allowed', message: 'Permission denied' });
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect((result.current.error as any).code).toBe(VoiceErrorCode.MICROPHONE_PERMISSION_DENIED);
    });

    it('should handle network error', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognitionInstance.onerror({ error: 'network', message: 'Network error' });
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect((result.current.error as any).code).toBe(VoiceErrorCode.NETWORK_ERROR);
    });

    it('should handle aborted error gracefully', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognitionInstance.onerror({ error: 'aborted', message: '' });
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.error).toBeNull(); // aborted is intentional, not an error
    });

    it('should handle generic recognition errors', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognitionInstance.onerror({ error: 'service-not-allowed', message: 'Service error' });
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect((result.current.error as any).code).toBe(VoiceErrorCode.SPEECH_RECOGNITION_FAILED);
    });
  });

  describe('Server-Side Transcription Fallback', () => {
    beforeEach(() => {
      // Remove browser Speech Recognition support
      delete (global as any).SpeechRecognition;
      delete (global as any).webkitSpeechRecognition;
    });

    it('should use server fallback when browser API not supported', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      expect(result.current.isSupported).toBe(false);

      await act(async () => {
        result.current.startListening();
      });

      expect(mockGetUserMedia).toHaveBeenCalled();
      expect((global as any).MediaRecorder).toHaveBeenCalled();
    });

    it('should start MediaRecorder for server transcription', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        result.current.startListening();
      });

      expect(mockMediaRecorder.start).toHaveBeenCalled();
      expect(result.current.isListening).toBe(true);
    });

    it('should send audio to server when recording stops', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'Transcribed text' }),
      });

      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        result.current.startListening();
      });

      // Simulate data available
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      act(() => {
        mockMediaRecorder.ondataavailable({ data: audioBlob });
      });

      // Simulate recording stop
      await act(async () => {
        await mockMediaRecorder.onstop();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/transcribe',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      expect(result.current.transcript).toContain('Transcribed text');
    });

    it('should retry server transcription on failure', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'Success' }) });

      (retry.retryWithBackoff as jest.Mock).mockImplementation(async (fn) => {
        // First call fails
        try {
          await mockFn();
        } catch (err) {
          // Second call succeeds
          return await mockFn();
        }
      });

      (global.fetch as jest.Mock).mockImplementation(mockFn);

      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        result.current.startListening();
      });

      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      act(() => {
        mockMediaRecorder.ondataavailable({ data: audioBlob });
      });

      await act(async () => {
        await mockMediaRecorder.onstop();
      });

      expect(retry.retryWithBackoff).toHaveBeenCalled();
    });

    it('should handle server transcription failure after retries', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      (retry.retryWithBackoff as jest.Mock).mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        result.current.startListening();
      });

      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      act(() => {
        mockMediaRecorder.ondataavailable({ data: audioBlob });
      });

      await act(async () => {
        await mockMediaRecorder.onstop();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect((result.current.error as any).code).toBe(VoiceErrorCode.SPEECH_RECOGNITION_FAILED);
      });
    });

    it('should handle microphone permission denial for server fallback', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);

      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect((result.current.error as any).code).toBe(VoiceErrorCode.MICROPHONE_PERMISSION_DENIED);
    });
  });

  describe('stopListening', () => {
    it('should stop browser recognition', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognitionInstance.onstart();
      });

      act(() => {
        result.current.stopListening();
      });

      expect(mockRecognitionInstance.stop).toHaveBeenCalled();
      expect(result.current.isListening).toBe(false);
      expect(result.current.interimTranscript).toBe('');
    });

    it('should stop server-side recording', async () => {
      delete (global as any).SpeechRecognition;
      delete (global as any).webkitSpeechRecognition;

      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        result.current.startListening();
      });

      mockMediaRecorder.state = 'recording';

      act(() => {
        result.current.stopListening();
      });

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should handle stop when not listening', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.stopListening();
      });

      expect(result.current.isListening).toBe(false);
    });

    it('should handle errors when stopping recognition', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      mockRecognitionInstance.stop.mockImplementation(() => {
        throw new Error('Stop failed');
      });

      expect(() => {
        act(() => {
          result.current.stopListening();
        });
      }).not.toThrow();
    });
  });

  describe('resetTranscript', () => {
    it('should reset transcript and interim transcript', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      // Add some transcript
      act(() => {
        mockRecognitionInstance.onresult({
          resultIndex: 0,
          results: [
            {
              0: { transcript: 'Hello world', confidence: 0.9 },
              isFinal: true,
              length: 1,
            },
          ],
          length: 1,
        });
      });

      expect(result.current.transcript).toBe('Hello world');

      act(() => {
        result.current.resetTranscript();
      });

      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('');
      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should clean up browser recognition on unmount', () => {
      const { result, unmount } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      unmount();

      expect(mockRecognitionInstance.abort).toHaveBeenCalled();
    });

    it('should clean up server recording on unmount', async () => {
      delete (global as any).SpeechRecognition;
      delete (global as any).webkitSpeechRecognition;

      const { result, unmount } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        result.current.startListening();
      });

      mockMediaRecorder.state = 'recording';

      unmount();

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should not error when unmounting without listening', () => {
      const { unmount } = renderHook(() => useSpeechRecognition());

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should not start listening if already listening', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      // Simulate onstart to set isListening to true
      act(() => {
        mockRecognitionInstance.onstart();
      });

      expect(result.current.isListening).toBe(true);

      const firstCallCount = mockRecognitionInstance.start.mock.calls.length;

      act(() => {
        result.current.startListening();
      });

      expect(mockRecognitionInstance.start).toHaveBeenCalledTimes(firstCallCount);
    });

    it('should handle empty transcription results', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockRecognitionInstance.onresult({
          resultIndex: 0,
          results: [
            {
              0: { transcript: '', confidence: 0.0 },
              isFinal: true,
              length: 1,
            },
          ],
          length: 1,
        });
      });

      expect(result.current.transcript).toBe('');
    });

    it('should handle multiple interim results before final', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      // First interim
      act(() => {
        mockRecognitionInstance.onresult({
          resultIndex: 0,
          results: [
            {
              0: { transcript: 'Hel', confidence: 0.5 },
              isFinal: false,
              length: 1,
            },
          ],
          length: 1,
        });
      });

      expect(result.current.interimTranscript).toBe('Hel');

      // Second interim
      act(() => {
        mockRecognitionInstance.onresult({
          resultIndex: 0,
          results: [
            {
              0: { transcript: 'Hello', confidence: 0.7 },
              isFinal: false,
              length: 1,
            },
          ],
          length: 1,
        });
      });

      expect(result.current.interimTranscript).toBe('Hello');

      // Final
      act(() => {
        mockRecognitionInstance.onresult({
          resultIndex: 0,
          results: [
            {
              0: { transcript: 'Hello world', confidence: 0.9 },
              isFinal: true,
              length: 1,
            },
          ],
          length: 1,
        });
      });

      expect(result.current.transcript).toBe('Hello world');
      expect(result.current.interimTranscript).toBe('');
    });
  });
});
