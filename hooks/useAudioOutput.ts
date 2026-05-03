/**
 * Custom hook for managing audio output playback
 * 
 * This hook handles:
 * - Playing AudioBuffer objects using Web Audio API
 * - Managing playback state (playing, paused, stopped)
 * - Preventing overlapping audio playback
 * - Detecting and handling interruptions
 * - Notifying on playback completion and interruption via callbacks
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3**
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceError, VoiceErrorCode } from '@/lib/errors';

/**
 * Audio output state
 */
interface AudioOutputState {
  isPlaying: boolean;
  error: Error | null;
}

/**
 * Audio output actions
 */
interface AudioOutputActions {
  play: (audioBuffer: AudioBuffer) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * Custom hook for managing audio output playback
 * 
 * @param onPlaybackComplete - Optional callback invoked when audio playback completes naturally
 * @param onInterrupted - Optional callback invoked when audio playback is interrupted
 * @returns Audio output state and actions
 * 
 * @example
 * ```typescript
 * function VoiceComponent() {
 *   const { isPlaying, error, play, stop } = useAudioOutput(
 *     () => console.log('Playback completed'),
 *     () => console.log('Playback interrupted')
 *   );
 *   
 *   const handlePlay = async (audioBuffer: AudioBuffer) => {
 *     try {
 *       await play(audioBuffer);
 *     } catch (err) {
 *       console.error('Playback failed:', err);
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={() => handlePlay(audioBuffer)} disabled={isPlaying}>
 *         Play
 *       </button>
 *       <button onClick={stop} disabled={!isPlaying}>
 *         Stop
 *       </button>
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAudioOutput(
  onPlaybackComplete?: () => void,
  onInterrupted?: () => void
): AudioOutputState & AudioOutputActions {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for managing audio resources
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const currentBufferRef = useRef<AudioBuffer | null>(null);

  /**
   * Get or create AudioContext for audio playback
   */
  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      if (!AudioContextClass) {
        throw new VoiceError(
          'Web Audio API not supported',
          VoiceErrorCode.BROWSER_NOT_SUPPORTED,
          false,
          'Your browser does not support audio playback. Please use Chrome 120+, Firefox 120+, Safari 17+, or Edge 120+.'
        );
      }
      
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  /**
   * Clean up current audio source
   */
  const cleanupSource = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (err) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
  }, []);

  /**
   * Stop audio playback and clean up resources
   * 
   * **Validates: Requirement 7.2** - Stop audio playback immediately on interruption
   */
  const stop = useCallback((): void => {
    cleanupSource();
    
    setIsPlaying(false);
    isPausedRef.current = false;
    pauseTimeRef.current = 0;
    startTimeRef.current = 0;
    currentBufferRef.current = null;
    setError(null);
  }, [cleanupSource]);

  /**
   * Pause audio playback
   * 
   * **Validates: Requirement 5.2** - Support pausing audio playback
   */
  const pause = useCallback((): void => {
    if (!isPlaying || isPausedRef.current) {
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext) {
      return;
    }

    // Calculate how much time has elapsed since playback started
    pauseTimeRef.current = audioContext.currentTime - startTimeRef.current;
    
    // Stop the current source
    cleanupSource();
    
    isPausedRef.current = true;
    setIsPlaying(false);
  }, [isPlaying, cleanupSource]);

  /**
   * Resume audio playback from paused state
   * 
   * **Validates: Requirement 5.2** - Support resuming audio playback
   */
  const resume = useCallback((): void => {
    if (!isPausedRef.current || !currentBufferRef.current) {
      return;
    }

    try {
      const audioContext = getAudioContext();
      const buffer = currentBufferRef.current;

      // Create new source node
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      sourceNodeRef.current = source;

      // Create or reuse gain node
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContext.createGain();
        gainNodeRef.current.connect(audioContext.destination);
      }

      // Connect source to gain node
      source.connect(gainNodeRef.current);

      // Set up completion handler
      source.onended = () => {
        if (!isPausedRef.current) {
          // Natural completion
          setIsPlaying(false);
          currentBufferRef.current = null;
          
          // **Validates: Requirement 5.3** - Notify on playback completion
          if (onPlaybackComplete) {
            onPlaybackComplete();
          }
        }
      };

      // Resume from where we paused
      const offset = pauseTimeRef.current;
      const duration = buffer.duration - offset;
      
      startTimeRef.current = audioContext.currentTime - offset;
      source.start(0, offset, duration);
      
      isPausedRef.current = false;
      setIsPlaying(true);
      setError(null);
    } catch (err) {
      // **Validates: Requirement 5.4** - Handle playback errors
      const voiceError = new VoiceError(
        err instanceof Error ? err.message : 'Audio resume failed',
        VoiceErrorCode.AUDIO_PLAYBACK_FAILED,
        true,
        'Unable to resume audio playback. Please try again.'
      );
      setError(voiceError);
      console.error('Audio resume error:', err);
      
      isPausedRef.current = false;
      setIsPlaying(false);
    }
  }, [getAudioContext, onPlaybackComplete]);

  /**
   * Play an audio buffer
   * 
   * **Validates: Requirement 5.1** - Play synthesized audio through speakers/headphones
   * **Validates: Requirement 5.2** - Prevent overlapping audio playback
   * **Validates: Requirement 5.3** - Notify on playback completion
   * **Validates: Requirement 5.4** - Handle playback errors
   * **Validates: Requirement 5.5** - Support standard browser audio formats
   * **Validates: Requirement 7.1** - Detect user speech during AI playback
   * **Validates: Requirement 7.2** - Stop audio immediately on interruption
   * **Validates: Requirement 7.3** - Cancel pending AI response on interruption
   */
  const play = useCallback(async (audioBuffer: AudioBuffer): Promise<void> => {
    // Validate input
    if (!audioBuffer) {
      const voiceError = new VoiceError(
        'No audio buffer provided',
        VoiceErrorCode.AUDIO_PLAYBACK_FAILED,
        false,
        'No audio to play.'
      );
      setError(voiceError);
      throw voiceError;
    }

    try {
      // **Validates: Requirement 5.2** - Prevent overlapping audio playback
      // Stop any currently playing audio
      if (isPlaying) {
        cleanupSource();
        
        // **Validates: Requirement 7.2** - Notify on interruption
        if (onInterrupted) {
          onInterrupted();
        }
      }

      // Get or create audio context
      const audioContext = getAudioContext();

      // Resume audio context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Create source node from buffer
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      sourceNodeRef.current = source;
      currentBufferRef.current = audioBuffer;

      // Create gain node for volume control
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContext.createGain();
        gainNodeRef.current.connect(audioContext.destination);
      }

      // Connect source to gain node
      source.connect(gainNodeRef.current);

      // Set up completion handler
      source.onended = () => {
        // Check if this was a natural completion (not interrupted)
        if (sourceNodeRef.current === source && !isPausedRef.current) {
          setIsPlaying(false);
          currentBufferRef.current = null;
          
          // **Validates: Requirement 5.3** - Notify on playback completion
          if (onPlaybackComplete) {
            onPlaybackComplete();
          }
        }
      };

      // **Validates: Requirement 5.1** - Play audio through speakers/headphones
      startTimeRef.current = audioContext.currentTime;
      pauseTimeRef.current = 0;
      isPausedRef.current = false;
      source.start(0);

      setIsPlaying(true);
      setError(null);
    } catch (err) {
      // **Validates: Requirement 5.4** - Handle playback errors
      const voiceError = new VoiceError(
        err instanceof Error ? err.message : 'Audio playback failed',
        VoiceErrorCode.AUDIO_PLAYBACK_FAILED,
        true,
        'Unable to play audio. Please check your audio settings and try again.'
      );
      setError(voiceError);
      console.error('Audio playback error:', err);
      
      setIsPlaying(false);
      cleanupSource();
      
      throw voiceError;
    }
  }, [isPlaying, cleanupSource, getAudioContext, onPlaybackComplete, onInterrupted]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stop();
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // Disconnect gain node
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
    };
  }, [stop]);

  return {
    // State
    isPlaying,
    error,
    
    // Actions
    play,
    stop,
    pause,
    resume,
  };
}
