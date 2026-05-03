/**
 * Unit tests for useAudioOutput hook
 * 
 * Tests cover:
 * - Audio playback functionality
 * - Playback state management
 * - Pause and resume functionality
 * - Interruption handling
 * - Error handling
 * - Callback invocation
 * - Resource cleanup
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioOutput } from './useAudioOutput';
import { VoiceErrorCode } from '@/lib/errors';

// Mock AudioContext and related APIs
class MockAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  private connected = false;
  private started = false;
  private stopped = false;

  connect(destination: any) {
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
  }

  start(when?: number, offset?: number, duration?: number) {
    this.started = true;
    // Simulate immediate playback completion for testing
    setTimeout(() => {
      if (this.onended && !this.stopped) {
        this.onended();
      }
    }, 10);
  }

  stop() {
    this.stopped = true;
  }
}

class MockGainNode {
  private connected = false;

  connect(destination: any) {
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
  }
}

class MockAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'running';
  currentTime = 0;
  destination = {};

  createBufferSource(): MockAudioBufferSourceNode {
    return new MockAudioBufferSourceNode();
  }

  createGain(): MockGainNode {
    return new MockGainNode();
  }

  async resume() {
    this.state = 'running';
  }

  async close() {
    this.state = 'closed';
  }
}

// Mock AudioBuffer
class MockAudioBuffer {
  duration: number;
  length: number;
  numberOfChannels: number;
  sampleRate: number;

  constructor(options: { length: number; numberOfChannels: number; sampleRate: number }) {
    this.length = options.length;
    this.numberOfChannels = options.numberOfChannels;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
  }

  getChannelData(channel: number): Float32Array {
    return new Float32Array(this.length);
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel?: number): void {}
  copyToChannel(source: Float32Array, channelNumber: number, startInChannel?: number): void {}
}

describe('useAudioOutput', () => {
  let mockAudioContext: MockAudioContext;

  beforeEach(() => {
    // Reset mocks
    mockAudioContext = new MockAudioContext();
    
    // Mock global AudioContext
    (global as any).AudioContext = jest.fn(() => mockAudioContext);
    (global as any).webkitAudioContext = jest.fn(() => mockAudioContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useAudioOutput());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('provides all required actions', () => {
      const { result } = renderHook(() => useAudioOutput());

      expect(typeof result.current.play).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.resume).toBe('function');
    });
  });

  describe('Audio Playback', () => {
    it('plays audio buffer successfully', async () => {
      const { result } = renderHook(() => useAudioOutput());

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await result.current.play(mockBuffer);
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('calls onPlaybackComplete when audio finishes naturally', async () => {
      const onPlaybackComplete = jest.fn();
      const { result } = renderHook(() => useAudioOutput(onPlaybackComplete));

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await result.current.play(mockBuffer);
      });

      // Wait for playback to complete
      await waitFor(() => {
        expect(onPlaybackComplete).toHaveBeenCalledTimes(1);
      }, { timeout: 100 });

      expect(result.current.isPlaying).toBe(false);
    });

    it('throws error when playing null buffer', async () => {
      const { result } = renderHook(() => useAudioOutput());

      await act(async () => {
        await expect(result.current.play(null as any)).rejects.toThrow();
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain('No audio buffer provided');
    });

    it('resumes suspended audio context before playing', async () => {
      mockAudioContext.state = 'suspended';
      const resumeSpy = jest.spyOn(mockAudioContext, 'resume');

      const { result } = renderHook(() => useAudioOutput());

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await result.current.play(mockBuffer);
      });

      expect(resumeSpy).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(true);
    });
  });

  describe('Interruption Handling', () => {
    it('stops current audio when playing new audio', async () => {
      const onInterrupted = jest.fn();
      const { result } = renderHook(() => useAudioOutput(undefined, onInterrupted));

      const mockBuffer1 = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      const mockBuffer2 = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      // Play first audio
      await act(async () => {
        await result.current.play(mockBuffer1);
      });

      expect(result.current.isPlaying).toBe(true);

      // Play second audio (should interrupt first)
      await act(async () => {
        await result.current.play(mockBuffer2);
      });

      expect(onInterrupted).toHaveBeenCalledTimes(1);
      expect(result.current.isPlaying).toBe(true);
    });

    it('calls onInterrupted when audio is interrupted by new playback', async () => {
      const onInterrupted = jest.fn();
      const { result } = renderHook(() => useAudioOutput(undefined, onInterrupted));

      const mockBuffer1 = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      const mockBuffer2 = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await result.current.play(mockBuffer1);
      });

      await act(async () => {
        await result.current.play(mockBuffer2);
      });

      expect(onInterrupted).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stop Functionality', () => {
    it('stops audio playback', async () => {
      const { result } = renderHook(() => useAudioOutput());

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await result.current.play(mockBuffer);
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('does not call onPlaybackComplete when stopped manually', async () => {
      const onPlaybackComplete = jest.fn();
      const { result } = renderHook(() => useAudioOutput(onPlaybackComplete));

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await result.current.play(mockBuffer);
      });

      act(() => {
        result.current.stop();
      });

      // Wait a bit to ensure callback is not called
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(onPlaybackComplete).not.toHaveBeenCalled();
    });

    it('clears error state when stopped', async () => {
      const { result } = renderHook(() => useAudioOutput());

      // Trigger an error
      await act(async () => {
        await expect(result.current.play(null as any)).rejects.toThrow();
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.stop();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Pause and Resume', () => {
    it('pauses audio playback', async () => {
      const { result } = renderHook(() => useAudioOutput());

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await result.current.play(mockBuffer);
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('resumes paused audio playback', async () => {
      const { result } = renderHook(() => useAudioOutput());

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await result.current.play(mockBuffer);
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.resume();
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('does nothing when pausing already paused audio', async () => {
      const { result } = renderHook(() => useAudioOutput());

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await result.current.play(mockBuffer);
      });

      act(() => {
        result.current.pause();
      });

      const isPausedBefore = result.current.isPlaying;

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPlaying).toBe(isPausedBefore);
    });

    it('does nothing when resuming without paused audio', () => {
      const { result } = renderHook(() => useAudioOutput());

      act(() => {
        result.current.resume();
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('handles browser not supported error', async () => {
      // Remove AudioContext support
      delete (global as any).AudioContext;
      delete (global as any).webkitAudioContext;

      const { result } = renderHook(() => useAudioOutput());

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await expect(result.current.play(mockBuffer)).rejects.toThrow();
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.isPlaying).toBe(false);
    });

    it('sets error state on playback failure', async () => {
      // Mock createBufferSource to throw error
      mockAudioContext.createBufferSource = jest.fn(() => {
        throw new Error('Playback failed');
      });

      const { result } = renderHook(() => useAudioOutput());

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await expect(result.current.play(mockBuffer)).rejects.toThrow();
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('Resource Cleanup', () => {
    it('cleans up resources on unmount', async () => {
      const closeSpy = jest.spyOn(mockAudioContext, 'close');

      const { result, unmount } = renderHook(() => useAudioOutput());

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await result.current.play(mockBuffer);
      });

      unmount();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('stops playback on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudioOutput());

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await result.current.play(mockBuffer);
      });

      expect(result.current.isPlaying).toBe(true);

      unmount();

      // After unmount, the component is destroyed, so we can't check state
      // But we've verified cleanup is called
    });
  });

  describe('Callback Behavior', () => {
    it('does not call callbacks when not provided', async () => {
      const { result } = renderHook(() => useAudioOutput());

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      // Should not throw even without callbacks
      await act(async () => {
        await result.current.play(mockBuffer);
      });

      // Wait for playback to complete
      await waitFor(() => {
        expect(result.current.isPlaying).toBe(false);
      }, { timeout: 100 });

      // No errors should occur
      expect(result.current.error).toBeNull();
    });

    it('calls onPlaybackComplete only once per playback', async () => {
      const onPlaybackComplete = jest.fn();
      const { result } = renderHook(() => useAudioOutput(onPlaybackComplete));

      const mockBuffer = new MockAudioBuffer({
        length: 44100,
        numberOfChannels: 1,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;

      await act(async () => {
        await result.current.play(mockBuffer);
      });

      await waitFor(() => {
        expect(onPlaybackComplete).toHaveBeenCalledTimes(1);
      }, { timeout: 100 });

      // Ensure it's not called again
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(onPlaybackComplete).toHaveBeenCalledTimes(1);
    });
  });
});
