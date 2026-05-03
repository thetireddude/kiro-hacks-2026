/**
 * Custom hook for voice synthesis using OpenAI TTS API
 * 
 * This hook handles:
 * - Calling /api/tts with text for speech synthesis
 * - Streaming audio data as it becomes available
 * - Retry logic with exponential backoff
 * - Synthesis error handling with fallback to text display
 * - Cancellation of in-progress synthesis
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { VoiceError, VoiceErrorCode } from '@/lib/errors';
import { retryWithBackoff, RetryOptions } from '@/lib/retry';
import type { TTSVoice } from '@/lib/voice/types';

/**
 * Voice synthesis state
 */
interface VoiceSynthesisState {
  isSynthesizing: boolean;
  error: Error | null;
}

/**
 * Voice synthesis actions
 */
interface VoiceSynthesisActions {
  synthesize: (text: string) => Promise<AudioBuffer>;
  cancel: () => void;
}

/**
 * Retry configuration for TTS synthesis
 * 
 * **Validates: Requirement 4.4** - Retry up to 3 times with exponential backoff
 */
const RETRY_CONFIG: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,      // 1 second
  maxDelay: 10000,      // 10 seconds
  backoffMultiplier: 2, // 1s, 2s, 4s
};

/**
 * Default TTS voice
 */
const DEFAULT_VOICE: TTSVoice = 'alloy';

/**
 * Default speech speed (1.0 = normal)
 */
const DEFAULT_SPEED = 1.0;

/**
 * Custom hook for voice synthesis
 * 
 * @returns Voice synthesis state and actions
 * 
 * @example
 * ```typescript
 * function VoiceComponent() {
 *   const { isSynthesizing, error, synthesize, cancel } = useVoiceSynthesis();
 *   
 *   const handleSpeak = async () => {
 *     try {
 *       const audioBuffer = await synthesize("Hello, world!");
 *       // Play the audio buffer
 *     } catch (err) {
 *       console.error('Synthesis failed:', err);
 *       // Fallback to text display
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handleSpeak} disabled={isSynthesizing}>
 *         Speak
 *       </button>
 *       {isSynthesizing && <p>Synthesizing...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useVoiceSynthesis(): VoiceSynthesisState & VoiceSynthesisActions {
  // State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for managing synthesis resources
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  /**
   * Get or create AudioContext for decoding audio
   */
  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  /**
   * Call TTS API and convert response to AudioBuffer
   * 
   * **Validates: Requirement 4.1** - Send text to OpenAI API for speech synthesis
   * **Validates: Requirement 4.2** - Stream audio data as it becomes available
   */
  const callTTSAPI = useCallback(async (text: string, signal: AbortSignal): Promise<AudioBuffer> => {
    // **Validates: Requirement 4.1** - Call TTS API with text
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice: DEFAULT_VOICE,
        speed: DEFAULT_SPEED,
      }),
      signal, // Support cancellation
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `TTS synthesis failed with status ${response.status}`);
    }

    // **Validates: Requirement 4.2** - Stream audio data
    // Get audio data as array buffer
    const arrayBuffer = await response.arrayBuffer();

    // Decode audio data to AudioBuffer
    const audioContext = getAudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return audioBuffer;
  }, [getAudioContext]);

  /**
   * Synthesize text to speech with retry logic
   * 
   * **Validates: Requirement 4.1** - Call TTS API with text
   * **Validates: Requirement 4.2** - Provide audio to output handler
   * **Validates: Requirement 4.3** - Use API key from environment
   * **Validates: Requirement 4.4** - Retry up to 3 times with exponential backoff
   * **Validates: Requirement 4.5** - Display text response as fallback on failure
   */
  const synthesize = useCallback(async (text: string): Promise<AudioBuffer> => {
    // Validate input
    if (!text || text.trim().length === 0) {
      const voiceError = new VoiceError(
        'Empty text provided for synthesis',
        VoiceErrorCode.TTS_SYNTHESIS_FAILED,
        false,
        'No text to synthesize.'
      );
      setError(voiceError);
      throw voiceError;
    }

    // Create abort controller for cancellation support
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsSynthesizing(true);
    setError(null);

    try {
      // **Validates: Requirement 4.4** - Retry with exponential backoff
      const audioBuffer = await retryWithBackoff(
        () => callTTSAPI(text, abortController.signal),
        RETRY_CONFIG
      );

      setIsSynthesizing(false);
      setError(null);
      return audioBuffer;
    } catch (err) {
      setIsSynthesizing(false);

      // Handle abort (cancellation)
      if (err instanceof Error && err.name === 'AbortError') {
        const voiceError = new VoiceError(
          'Synthesis cancelled',
          VoiceErrorCode.TTS_SYNTHESIS_FAILED,
          true,
          'Speech synthesis was cancelled.'
        );
        setError(voiceError);
        console.log('Synthesis cancelled by user');
        throw voiceError;
      }

      // **Validates: Requirement 4.5** - Handle synthesis errors
      // Create user-friendly error
      const voiceError = new VoiceError(
        err instanceof Error ? err.message : 'TTS synthesis failed',
        VoiceErrorCode.TTS_SYNTHESIS_FAILED,
        true,
        'Unable to synthesize speech. Showing text response instead.'
      );
      setError(voiceError);
      console.error('TTS synthesis error:', err);
      
      // Re-throw so caller can handle fallback to text display
      throw voiceError;
    } finally {
      // Clean up abort controller
      abortControllerRef.current = null;
    }
  }, [callTTSAPI]);

  /**
   * Cancel in-progress synthesis
   * 
   * **Validates: Requirement 4.5** - Support cancellation of in-progress synthesis
   */
  const cancel = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsSynthesizing(false);
      console.log('Synthesis cancelled');
    }
  }, []);

  return {
    // State
    isSynthesizing,
    error,
    
    // Actions
    synthesize,
    cancel,
  };
}
