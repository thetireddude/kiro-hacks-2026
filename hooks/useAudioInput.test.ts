/**
 * Unit tests for useAudioInput hook
 * 
 * Tests cover:
 * - Permission request and tracking
 * - Audio capture start/stop
 * - Volume calculation and updates
 * - Error handling (permission denied, device not found)
 * - Resource cleanup
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioInput } from './useAudioInput';
import { VoiceErrorCode } from '@/lib/errors';
import * as audioProcessor from '@/lib/audio/processor';

// Mock the audio processor module
jest.mock('@/lib/audio/processor');

describe('useAudioInput', () => {
  let mockGetUserMedia: jest.Mock;
  let mockMediaStream: MediaStream;
  let mockAudioContext: any;
  let mockAnalyser: any;
  let mockSource: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

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
      value: {
        getUserMedia: mockGetUserMedia,
      },
    });

    // Mock AudioContext
    mockSource = {
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    mockAnalyser = {
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      getFloatTimeDomainData: jest.fn((dataArray: Float32Array) => {
        // Fill with sample data
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = 0.5;
        }
      }),
    };

    mockAudioContext = {
      createAnalyser: jest.fn(() => mockAnalyser),
      createMediaStreamSource: jest.fn(() => mockSource),
      close: jest.fn().mockResolvedValue(undefined),
      state: 'running',
    };

    (global as any).AudioContext = jest.fn(() => mockAudioContext);
    (global as any).webkitAudioContext = jest.fn(() => mockAudioContext);

    // Mock calculateVolume
    (audioProcessor.calculateVolume as jest.Mock).mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useAudioInput());

      expect(result.current.isCapturing).toBe(false);
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.volume).toBe(0);
    });

    it('should provide all required actions', () => {
      const { result } = renderHook(() => useAudioInput());

      expect(typeof result.current.startCapture).toBe('function');
      expect(typeof result.current.stopCapture).toBe('function');
      expect(typeof result.current.requestPermission).toBe('function');
    });
  });

  describe('requestPermission', () => {
    it('should request microphone permission successfully', async () => {
      const { result } = renderHook(() => useAudioInput());

      let permissionGranted: boolean = false;
      await act(async () => {
        permissionGranted = await result.current.requestPermission();
      });

      expect(permissionGranted).toBe(true);
      expect(result.current.hasPermission).toBe(true);
      expect(result.current.error).toBeNull();
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
    });

    it('should stop the stream after permission check', async () => {
      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled();
    });

    it('should handle permission denial', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);

      const { result } = renderHook(() => useAudioInput());

      let permissionGranted: boolean = true;
      await act(async () => {
        permissionGranted = await result.current.requestPermission();
      });

      expect(permissionGranted).toBe(false);
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect((result.current.error as any).code).toBe(VoiceErrorCode.MICROPHONE_PERMISSION_DENIED);
    });

    it('should handle microphone not found', async () => {
      const notFoundError = new Error('Device not found');
      notFoundError.name = 'NotFoundError';
      mockGetUserMedia.mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useAudioInput());

      let permissionGranted: boolean = true;
      await act(async () => {
        permissionGranted = await result.current.requestPermission();
      });

      expect(permissionGranted).toBe(false);
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect((result.current.error as any).code).toBe(VoiceErrorCode.MICROPHONE_NOT_FOUND);
    });

    it('should handle browser not supported', async () => {
      // Remove mediaDevices API
      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        value: undefined,
      });

      const { result } = renderHook(() => useAudioInput());

      let permissionGranted: boolean = true;
      await act(async () => {
        permissionGranted = await result.current.requestPermission();
      });

      expect(permissionGranted).toBe(false);
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect((result.current.error as any).code).toBe(VoiceErrorCode.BROWSER_NOT_SUPPORTED);
    });
  });

  describe('startCapture', () => {
    it('should start audio capture successfully', async () => {
      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(result.current.isCapturing).toBe(true);
      expect(result.current.hasPermission).toBe(true);
      expect(result.current.error).toBeNull();
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    it('should create audio context and analyser', async () => {
      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockMediaStream);
      expect(mockSource.connect).toHaveBeenCalledWith(mockAnalyser);
    });

    it('should configure analyser correctly', async () => {
      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(mockAnalyser.fftSize).toBe(2048);
      expect(mockAnalyser.smoothingTimeConstant).toBe(0.8);
    });

    it('should start volume monitoring', async () => {
      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      // Fast-forward time to trigger volume updates
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(audioProcessor.calculateVolume).toHaveBeenCalled();
      expect(result.current.volume).toBe(0.5);
    });

    it('should update volume periodically', async () => {
      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      // Fast-forward time multiple times
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(audioProcessor.calculateVolume).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(audioProcessor.calculateVolume).toHaveBeenCalledTimes(2);

      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(audioProcessor.calculateVolume).toHaveBeenCalledTimes(3);
    });

    it('should not start capture if already capturing', async () => {
      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      const firstCallCount = mockGetUserMedia.mock.calls.length;

      await act(async () => {
        await result.current.startCapture();
      });

      expect(mockGetUserMedia).toHaveBeenCalledTimes(firstCallCount);
    });

    it('should handle permission denial during capture', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);

      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(result.current.isCapturing).toBe(false);
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect((result.current.error as any).code).toBe(VoiceErrorCode.MICROPHONE_PERMISSION_DENIED);
    });

    it('should handle device not found during capture', async () => {
      const notFoundError = new Error('Device not found');
      notFoundError.name = 'NotFoundError';
      mockGetUserMedia.mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(result.current.isCapturing).toBe(false);
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect((result.current.error as any).code).toBe(VoiceErrorCode.MICROPHONE_NOT_FOUND);
    });

    it('should handle browser not supported during capture', async () => {
      // Remove mediaDevices API
      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        value: undefined,
      });

      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(result.current.isCapturing).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect((result.current.error as any).code).toBe(VoiceErrorCode.BROWSER_NOT_SUPPORTED);
    });
  });

  describe('stopCapture', () => {
    it('should stop audio capture and clean up resources', async () => {
      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      act(() => {
        result.current.stopCapture();
      });

      expect(result.current.isCapturing).toBe(false);
      expect(result.current.volume).toBe(0);
      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should stop volume monitoring', async () => {
      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      // Volume should update while capturing
      act(() => {
        jest.advanceTimersByTime(100);
      });
      const callCountWhileCapturing = (audioProcessor.calculateVolume as jest.Mock).mock.calls.length;

      act(() => {
        result.current.stopCapture();
      });

      // Volume should not update after stopping
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect((audioProcessor.calculateVolume as jest.Mock).mock.calls.length).toBe(callCountWhileCapturing);
    });

    it('should handle stop when not capturing', () => {
      const { result } = renderHook(() => useAudioInput());

      act(() => {
        result.current.stopCapture();
      });

      expect(result.current.isCapturing).toBe(false);
      expect(result.current.volume).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      unmount();

      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should not error when unmounting without capture', () => {
      const { unmount } = renderHook(() => useAudioInput());

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Volume Calculation', () => {
    it('should calculate volume from audio data', async () => {
      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockAnalyser.getFloatTimeDomainData).toHaveBeenCalled();
      expect(audioProcessor.calculateVolume).toHaveBeenCalled();
      expect(result.current.volume).toBe(0.5);
    });

    it('should update volume with different values', async () => {
      (audioProcessor.calculateVolume as jest.Mock)
        .mockReturnValueOnce(0.2)
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.8);

      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(result.current.volume).toBe(0.2);

      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(result.current.volume).toBe(0.5);

      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(result.current.volume).toBe(0.8);
    });
  });

  describe('Error Handling', () => {
    it('should log errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);

      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Generic error');
      mockGetUserMedia.mockRejectedValue(genericError);

      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(result.current.isCapturing).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it('should handle non-Error exceptions', async () => {
      mockGetUserMedia.mockRejectedValue('String error');

      const { result } = renderHook(() => useAudioInput());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(result.current.isCapturing).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it('should clear error on successful capture', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValueOnce(permissionError);

      const { result } = renderHook(() => useAudioInput());

      // First attempt fails
      await act(async () => {
        await result.current.startCapture();
      });
      expect(result.current.error).toBeTruthy();

      // Second attempt succeeds
      mockGetUserMedia.mockResolvedValue(mockMediaStream);
      await act(async () => {
        await result.current.startCapture();
      });
      expect(result.current.error).toBeNull();
    });
  });
});
