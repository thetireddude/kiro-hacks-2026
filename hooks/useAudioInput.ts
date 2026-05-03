/**
 * Custom hook for managing audio input from the user's microphone
 * 
 * This hook handles:
 * - MediaStream lifecycle management
 * - Microphone permission requests and tracking
 * - Audio capture start/stop
 * - Real-time volume calculation for visualization
 * - Error handling for permission and device issues
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 13.1**
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceError, VoiceErrorCode } from '@/lib/errors';
import { calculateVolume } from '@/lib/audio/processor';

/**
 * Audio input state
 */
interface AudioInputState {
  isCapturing: boolean;
  hasPermission: boolean;
  error: Error | null;
  volume: number;
}

/**
 * Audio input actions
 */
interface AudioInputActions {
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  requestPermission: () => Promise<boolean>;
}

/**
 * Audio configuration for getUserMedia
 */
const AUDIO_CONFIG: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 16000, // Optimal for speech recognition
  },
};

/**
 * Volume calculation interval in milliseconds
 */
const VOLUME_UPDATE_INTERVAL = 100;

/**
 * Custom hook for managing audio input from microphone
 * 
 * @returns Audio input state and actions
 * 
 * @example
 * ```typescript
 * function VoiceComponent() {
 *   const { isCapturing, hasPermission, volume, startCapture, stopCapture } = useAudioInput();
 *   
 *   return (
 *     <div>
 *       <button onClick={startCapture} disabled={isCapturing}>
 *         Start Recording
 *       </button>
 *       <button onClick={stopCapture} disabled={!isCapturing}>
 *         Stop Recording
 *       </button>
 *       <div>Volume: {(volume * 100).toFixed(0)}%</div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAudioInput(): AudioInputState & AudioInputActions {
  // State
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [volume, setVolume] = useState(0);

  // Refs for managing audio resources
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Request microphone permission from the browser
   * 
   * **Validates: Requirement 1.1** - Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new VoiceError(
          'MediaDevices API not supported',
          VoiceErrorCode.BROWSER_NOT_SUPPORTED,
          false,
          'Your browser does not support microphone access. Please use Chrome 120+, Firefox 120+, Safari 17+, or Edge 120+.'
        );
      }

      // Request permission by attempting to get user media
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONFIG);
      
      // Permission granted - stop the stream immediately (we'll start a new one when capturing)
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      // Handle VoiceError (thrown by browser check above)
      if (err instanceof VoiceError) {
        setError(err);
        setHasPermission(false);
        return false;
      }
      
      // Handle different error types
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          // **Validates: Requirement 1.3** - Handle permission denial
          const voiceError = new VoiceError(
            'Microphone permission denied',
            VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
            true,
            'Microphone access is required for voice conversations. Please allow microphone access and try again.'
          );
          setError(voiceError);
          setHasPermission(false);
          return false;
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          // **Validates: Requirement 1.3** - Handle device not found
          const voiceError = new VoiceError(
            'Microphone not found',
            VoiceErrorCode.MICROPHONE_NOT_FOUND,
            false,
            'No microphone detected. Please connect a microphone to use voice conversations.'
          );
          setError(voiceError);
          setHasPermission(false);
          return false;
        } else {
          // Generic error
          const voiceError = new VoiceError(
            `Microphone access error: ${err.message}`,
            VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
            true,
            'Unable to access microphone. Please check your browser settings and try again.'
          );
          setError(voiceError);
          setHasPermission(false);
          return false;
        }
      }
      
      // Unknown error type
      const voiceError = new VoiceError(
        'Unknown microphone error',
        VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
        true,
        'An unexpected error occurred while accessing the microphone.'
      );
      setError(voiceError);
      setHasPermission(false);
      return false;
    }
  }, []);

  /**
   * Start capturing audio from the microphone
   * 
   * **Validates: Requirement 1.2** - Initialize audio capture
   * **Validates: Requirement 1.4** - Capture audio data continuously
   * **Validates: Requirement 13.1** - Provide volume levels for visualization
   */
  const startCapture = useCallback(async (): Promise<void> => {
    try {
      // Check if already capturing
      if (isCapturing) {
        return;
      }

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new VoiceError(
          'MediaDevices API not supported',
          VoiceErrorCode.BROWSER_NOT_SUPPORTED,
          false,
          'Your browser does not support microphone access. Please use Chrome 120+, Firefox 120+, Safari 17+, or Edge 120+.'
        );
      }

      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONFIG);
      mediaStreamRef.current = stream;

      // Create audio context for volume analysis
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      // Create analyser node for volume calculation
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Start volume monitoring
      const dataArray = new Float32Array(analyser.fftSize);
      volumeIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getFloatTimeDomainData(dataArray);
          const currentVolume = calculateVolume(dataArray);
          setVolume(currentVolume);
        }
      }, VOLUME_UPDATE_INTERVAL);

      setIsCapturing(true);
      setHasPermission(true);
      setError(null);
    } catch (err) {
      // **Validates: Requirement 1.5** - Handle audio capture errors
      
      // Handle VoiceError (thrown by browser check above)
      if (err instanceof VoiceError) {
        setError(err);
        setIsCapturing(false);
        console.error('Audio capture error:', err);
        return;
      }
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          const voiceError = new VoiceError(
            'Microphone permission denied',
            VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
            true,
            'Microphone access is required for voice conversations. Please allow microphone access and try again.'
          );
          setError(voiceError);
          setHasPermission(false);
          console.error('Microphone permission denied:', err);
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          const voiceError = new VoiceError(
            'Microphone not found',
            VoiceErrorCode.MICROPHONE_NOT_FOUND,
            false,
            'No microphone detected. Please connect a microphone to use voice conversations.'
          );
          setError(voiceError);
          setHasPermission(false);
          console.error('Microphone not found:', err);
        } else {
          const voiceError = new VoiceError(
            `Audio capture error: ${err.message}`,
            VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
            true,
            'Unable to start audio capture. Please check your browser settings and try again.'
          );
          setError(voiceError);
          console.error('Audio capture error:', err);
        }
      } else {
        const voiceError = new VoiceError(
          'Unknown audio capture error',
          VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
          true,
          'An unexpected error occurred while starting audio capture.'
        );
        setError(voiceError);
        console.error('Unknown audio capture error:', err);
      }
      
      setIsCapturing(false);
    }
  }, [isCapturing]);

  /**
   * Stop capturing audio and clean up resources
   */
  const stopCapture = useCallback((): void => {
    // Stop volume monitoring
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear analyser reference
    analyserRef.current = null;

    // Reset state
    setIsCapturing(false);
    setVolume(0);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    // State
    isCapturing,
    hasPermission,
    error,
    volume,
    
    // Actions
    startCapture,
    stopCapture,
    requestPermission,
  };
}
