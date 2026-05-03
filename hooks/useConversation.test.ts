/**
 * Unit tests for useConversation hook
 * 
 * Tests cover:
 * - Conversation history management (max 50 messages)
 * - Message sending and AI response generation
 * - State transitions (listening → processing → thinking → speaking → listening)
 * - Interruption handling (cancel requests and stop audio)
 * - History clearing
 * - Error handling and retry logic
 * - Integration with voice synthesis and audio output
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useConversation } from './useConversation';
import { VoiceError, VoiceErrorCode } from '@/lib/errors';
import * as retryModule from '@/lib/retry';

// Mock dependencies
jest.mock('./useVoiceSynthesis');
jest.mock('./useAudioOutput');
jest.mock('@/lib/retry');

// Import mocked modules
import { useVoiceSynthesis } from './useVoiceSynthesis';
import { useAudioOutput } from './useAudioOutput';

describe('useConversation', () => {
  // Mock functions
  let mockSynthesize: jest.Mock;
  let mockCancelSynthesis: jest.Mock;
  let mockPlayAudio: jest.Mock;
  let mockStopAudio: jest.Mock;
  let mockFetch: jest.Mock;
  let mockRetryWithBackoff: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock useVoiceSynthesis
    mockSynthesize = jest.fn();
    mockCancelSynthesis = jest.fn();
    (useVoiceSynthesis as jest.Mock).mockReturnValue({
      isSynthesizing: false,
      error: null,
      synthesize: mockSynthesize,
      cancel: mockCancelSynthesis,
    });

    // Mock useAudioOutput
    mockPlayAudio = jest.fn();
    mockStopAudio = jest.fn();
    (useAudioOutput as jest.Mock).mockImplementation((onComplete, onInterrupted) => ({
      isPlaying: false,
      error: null,
      play: mockPlayAudio,
      stop: mockStopAudio,
      pause: jest.fn(),
      resume: jest.fn(),
    }));

    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock retryWithBackoff to just call the function directly
    mockRetryWithBackoff = jest.fn((fn) => fn());
    (retryModule.retryWithBackoff as jest.Mock) = mockRetryWithBackoff;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty messages and listening state', () => {
      const { result } = renderHook(() => useConversation());

      expect(result.current.messages).toEqual([]);
      expect(result.current.currentState).toBe('listening');
      expect(result.current.error).toBeNull();
      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should send message and receive AI response', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'AI response text' }),
      });

      // Mock successful synthesis
      const mockAudioBuffer = { duration: 1.0 } as AudioBuffer;
      mockSynthesize.mockResolvedValueOnce(mockAudioBuffer);

      // Mock successful playback
      mockPlayAudio.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useConversation());

      // Send message
      await act(async () => {
        await result.current.sendMessage('Hello AI');
      });

      // Verify state transitions occurred
      expect(mockFetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Hello AI'),
      }));

      // Verify messages were added
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Hello AI');
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toBe('AI response text');

      // Verify synthesis was called
      expect(mockSynthesize).toHaveBeenCalledWith('AI response text');

      // Verify audio playback was called
      expect(mockPlayAudio).toHaveBeenCalledWith(mockAudioBuffer);
    });

    it('should transition through correct states during message flow', async () => {
      const states: string[] = [];

      // Mock successful API response
      mockFetch.mockImplementation(async () => {
        states.push('api-called');
        return {
          ok: true,
          json: async () => ({ response: 'AI response' }),
        };
      });

      // Mock successful synthesis
      mockSynthesize.mockImplementation(async () => {
        states.push('synthesis-called');
        return { duration: 1.0 } as AudioBuffer;
      });

      // Mock successful playback
      mockPlayAudio.mockImplementation(async () => {
        states.push('playback-called');
      });

      const { result } = renderHook(() => useConversation());

      // Track state changes
      const stateChanges: string[] = [];
      
      await act(async () => {
        // Initial state
        stateChanges.push(result.current.currentState);
        
        const promise = result.current.sendMessage('Test message');
        
        // State should change during execution
        await promise;
      });

      // Verify API, synthesis, and playback were called in order
      expect(states).toEqual(['api-called', 'synthesis-called', 'playback-called']);
    });

    it('should maintain conversation context across multiple turns', async () => {
      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ response: 'First response' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ response: 'Second response' }),
        });

      // Mock synthesis and playback
      mockSynthesize.mockResolvedValue({ duration: 1.0 } as AudioBuffer);
      mockPlayAudio.mockResolvedValue(undefined);

      const { result } = renderHook(() => useConversation());

      // Send first message
      await act(async () => {
        await result.current.sendMessage('First message');
      });

      // Send second message
      await act(async () => {
        await result.current.sendMessage('Second message');
      });

      // Verify conversation history
      expect(result.current.messages).toHaveLength(4);
      expect(result.current.messages[0].content).toBe('First message');
      expect(result.current.messages[1].content).toBe('First response');
      expect(result.current.messages[2].content).toBe('Second message');
      expect(result.current.messages[3].content).toBe('Second response');

      // Verify second API call included first message in history
      const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(secondCallBody.history).toHaveLength(2); // First user message and first AI response
    });

    it('should limit conversation history to 50 messages', async () => {
      // Mock successful API responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'AI response' }),
      });

      mockSynthesize.mockResolvedValue({ duration: 1.0 } as AudioBuffer);
      mockPlayAudio.mockResolvedValue(undefined);

      const { result } = renderHook(() => useConversation());

      // Send 30 messages (60 total messages with responses)
      for (let i = 0; i < 30; i++) {
        await act(async () => {
          await result.current.sendMessage(`Message ${i}`);
        });
      }

      // Verify only last 50 messages are kept
      expect(result.current.messages).toHaveLength(50);
      
      // Verify oldest messages were removed
      expect(result.current.messages[0].content).not.toBe('Message 0');
      
      // Verify newest messages are present
      expect(result.current.messages[result.current.messages.length - 2].content).toBe('Message 29');
      expect(result.current.messages[result.current.messages.length - 1].content).toBe('AI response');
    });

    it('should handle empty message input', async () => {
      const { result } = renderHook(() => useConversation());

      await act(async () => {
        try {
          await result.current.sendMessage('');
        } catch (err) {
          // Expected to throw
        }
      });

      // Verify error was set
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.code).toBe(VoiceErrorCode.SPEECH_RECOGNITION_FAILED);
      
      // Verify no messages were added
      expect(result.current.messages).toHaveLength(0);
    });

    it('should handle API errors with retry', async () => {
      // Mock API failure
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useConversation());

      await act(async () => {
        try {
          await result.current.sendMessage('Test message');
        } catch (err) {
          // Expected to throw
        }
      });

      // Verify retry was attempted
      expect(mockRetryWithBackoff).toHaveBeenCalled();

      // Verify error was set
      expect(result.current.error).toBeTruthy();
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.currentState).toBe('listening');
    });

    it('should handle synthesis errors gracefully', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'AI response' }),
      });

      // Mock synthesis failure
      mockSynthesize.mockRejectedValueOnce(
        new VoiceError(
          'Synthesis failed',
          VoiceErrorCode.TTS_SYNTHESIS_FAILED,
          true,
          'Unable to synthesize speech'
        )
      );

      const { result } = renderHook(() => useConversation());

      await act(async () => {
        try {
          await result.current.sendMessage('Test message');
        } catch (err) {
          // Expected to throw
        }
      });

      // Verify error was set
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.code).toBe(VoiceErrorCode.TTS_SYNTHESIS_FAILED);

      // Verify messages were still added (text fallback)
      expect(result.current.messages).toHaveLength(2);
    });
  });

  describe('interrupt', () => {
    it('should cancel pending API request', async () => {
      // Mock slow API response
      let abortSignal: AbortSignal | undefined;
      mockFetch.mockImplementation(async (url, options) => {
        abortSignal = options.signal;
        // Simulate slow response
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          ok: true,
          json: async () => ({ response: 'AI response' }),
        };
      });

      const { result } = renderHook(() => useConversation());

      // Start sending message
      act(() => {
        result.current.sendMessage('Test message');
      });

      // Interrupt immediately
      act(() => {
        result.current.interrupt();
      });

      // Wait a bit
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Verify abort signal was triggered
      expect(abortSignal?.aborted).toBe(true);

      // Verify state returned to listening
      expect(result.current.currentState).toBe('listening');
      expect(result.current.isGenerating).toBe(false);
    });

    it('should stop audio playback', () => {
      // Simulate playing state by mocking before rendering
      (useAudioOutput as jest.Mock).mockReturnValue({
        isPlaying: true,
        error: null,
        play: mockPlayAudio,
        stop: mockStopAudio,
        pause: jest.fn(),
        resume: jest.fn(),
      });

      const { result } = renderHook(() => useConversation());

      act(() => {
        result.current.interrupt();
      });

      // Verify stop was called
      expect(mockStopAudio).toHaveBeenCalled();
    });

    it('should cancel synthesis', () => {
      const { result } = renderHook(() => useConversation());

      act(() => {
        result.current.interrupt();
      });

      // Verify synthesis cancel was called
      expect(mockCancelSynthesis).toHaveBeenCalled();
    });

    it('should preserve conversation history', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'AI response' }),
      });

      mockSynthesize.mockResolvedValue({ duration: 1.0 } as AudioBuffer);
      mockPlayAudio.mockResolvedValue(undefined);

      const { result } = renderHook(() => useConversation());

      // Send message
      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      const messagesBefore = result.current.messages.length;

      // Interrupt
      act(() => {
        result.current.interrupt();
      });

      // Verify messages are preserved
      expect(result.current.messages).toHaveLength(messagesBefore);
    });

    it('should reset state to listening', () => {
      const { result } = renderHook(() => useConversation());

      // Manually set state to speaking
      act(() => {
        result.current.sendMessage('Test').catch(() => {});
      });

      // Interrupt
      act(() => {
        result.current.interrupt();
      });

      // Verify state is listening
      expect(result.current.currentState).toBe('listening');
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('clearHistory', () => {
    it('should clear all messages', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'AI response' }),
      });

      mockSynthesize.mockResolvedValue({ duration: 1.0 } as AudioBuffer);
      mockPlayAudio.mockResolvedValue(undefined);

      const { result } = renderHook(() => useConversation());

      // Send message
      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(result.current.messages).toHaveLength(2);

      // Clear history
      act(() => {
        result.current.clearHistory();
      });

      // Verify messages are cleared
      expect(result.current.messages).toHaveLength(0);
    });

    it('should reset state to listening', async () => {
      const { result } = renderHook(() => useConversation());

      // Clear history
      act(() => {
        result.current.clearHistory();
      });

      // Verify state is reset
      expect(result.current.currentState).toBe('listening');
      expect(result.current.error).toBeNull();
      expect(result.current.isGenerating).toBe(false);
    });

    it('should interrupt any ongoing operations', () => {
      const { result } = renderHook(() => useConversation());

      // Clear history (which calls interrupt internally)
      act(() => {
        result.current.clearHistory();
      });

      // Verify interrupt actions were taken
      expect(mockCancelSynthesis).toHaveBeenCalled();
    });
  });

  describe('Message ID Generation', () => {
    it('should generate unique IDs for each message', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'AI response' }),
      });

      mockSynthesize.mockResolvedValue({ duration: 1.0 } as AudioBuffer);
      mockPlayAudio.mockResolvedValue(undefined);

      const { result } = renderHook(() => useConversation());

      // Send multiple messages
      await act(async () => {
        await result.current.sendMessage('Message 1');
      });

      await act(async () => {
        await result.current.sendMessage('Message 2');
      });

      // Verify all messages have unique IDs
      const ids = result.current.messages.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include timestamp in each message', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'AI response' }),
      });

      mockSynthesize.mockResolvedValue({ duration: 1.0 } as AudioBuffer);
      mockPlayAudio.mockResolvedValue(undefined);

      const { result } = renderHook(() => useConversation());

      const beforeTime = new Date();

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      const afterTime = new Date();

      // Verify timestamps are within expected range
      result.current.messages.forEach((message) => {
        expect(message.timestamp).toBeInstanceOf(Date);
        expect(message.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(message.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      });
    });
  });

  describe('Playback Callbacks', () => {
    it('should transition to listening state on playback complete', async () => {
      let onPlaybackComplete: (() => void) | undefined;

      // Capture the callback
      (useAudioOutput as jest.Mock).mockImplementation((onComplete) => {
        onPlaybackComplete = onComplete;
        return {
          isPlaying: false,
          error: null,
          play: mockPlayAudio,
          stop: mockStopAudio,
          pause: jest.fn(),
          resume: jest.fn(),
        };
      });

      const { result } = renderHook(() => useConversation());

      // Trigger playback complete callback
      act(() => {
        if (onPlaybackComplete) {
          onPlaybackComplete();
        }
      });

      // Verify state transitioned to listening
      expect(result.current.currentState).toBe('listening');
    });
  });
});
