/**
 * Custom hook for speech recognition with browser API and server fallback
 * 
 * This hook handles:
 * - Browser Web Speech API integration (primary)
 * - Server-side transcription fallback via /api/transcribe
 * - Continuous recognition with interim and final results
 * - Retry logic with exponential backoff
 * - Recognition errors and clear error states
 * 
 * **Validates: Requirements 2.1, 2.2, 2.4, 2.5, 14.5**
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceError, VoiceErrorCode } from '@/lib/errors';
import { retryWithBackoff, RetryOptions } from '@/lib/retry';

/**
 * Speech recognition state
 */
interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: Error | null;
  isSupported: boolean;
}

/**
 * Speech recognition actions
 */
interface SpeechRecognitionActions {
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Browser SpeechRecognition types (not in TypeScript by default)
 */
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognitionInterface, ev: Event) => any) | null;
  onend: ((this: SpeechRecognitionInterface, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionEvent) => any) | null;
}

/**
 * Retry configuration for server-side transcription
 */
const RETRY_CONFIG: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Check if browser supports Web Speech API
 */
function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

/**
 * Get SpeechRecognition constructor (handles vendor prefixes)
 */
function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInterface) | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/**
 * Custom hook for speech recognition
 * 
 * @returns Speech recognition state and actions
 * 
 * @example
 * ```typescript
 * function VoiceComponent() {
 *   const { 
 *     isListening, 
 *     transcript, 
 *     interimTranscript, 
 *     isSupported,
 *     startListening, 
 *     stopListening,
 *     resetTranscript 
 *   } = useSpeechRecognition();
 *   
 *   if (!isSupported) {
 *     return <div>Speech recognition not supported</div>;
 *   }
 *   
 *   return (
 *     <div>
 *       <button onClick={startListening} disabled={isListening}>
 *         Start Listening
 *       </button>
 *       <button onClick={stopListening} disabled={!isListening}>
 *         Stop Listening
 *       </button>
 *       <p>Final: {transcript}</p>
 *       <p>Interim: {interimTranscript}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSpeechRecognition(): SpeechRecognitionState & SpeechRecognitionActions {
  // State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Refs for managing recognition resources
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isUsingFallbackRef = useRef(false);

  /**
   * Initialize speech recognition support check
   */
  useEffect(() => {
    const supported = isSpeechRecognitionSupported();
    setIsSupported(supported);
    
    // If browser API not supported, we'll use server fallback
    if (!supported) {
      console.log('Browser Speech Recognition not supported, will use server fallback');
      isUsingFallbackRef.current = true;
    }
  }, []);

  /**
   * Send audio to server for transcription (fallback method)
   * 
   * **Validates: Requirement 2.1** - Send audio data to API
   * **Validates: Requirement 2.4** - Retry up to 3 times with exponential backoff
   */
  const transcribeAudioOnServer = useCallback(async (audioBlob: Blob): Promise<string> => {
    const transcribe = async (): Promise<string> => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Transcription failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.text || '';
    };

    try {
      // **Validates: Requirement 2.4** - Retry with exponential backoff
      const result = await retryWithBackoff(transcribe, RETRY_CONFIG);
      return result;
    } catch (err) {
      // **Validates: Requirement 2.5** - Display error after all retries fail
      const voiceError = new VoiceError(
        err instanceof Error ? err.message : 'Transcription failed',
        VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
        true,
        'Unable to transcribe speech. Please try speaking again.'
      );
      setError(voiceError);
      console.error('Server transcription error:', err);
      throw voiceError;
    }
  }, []);

  /**
   * Start listening using browser Speech Recognition API
   * 
   * **Validates: Requirement 2.1** - Capture and transcribe user speech
   * **Validates: Requirement 2.2** - Provide transcribed text
   */
  const startBrowserRecognition = useCallback((): void => {
    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
    
    if (!SpeechRecognitionConstructor) {
      console.error('Speech Recognition constructor not available');
      return;
    }

    try {
      // Create new recognition instance
      const recognition = new SpeechRecognitionConstructor();
      
      // Configure recognition
      recognition.continuous = true; // Keep listening until explicitly stopped
      recognition.interimResults = true; // Get interim results as user speaks
      recognition.lang = 'en-US'; // Default to English
      recognition.maxAlternatives = 1; // Only need the best result

      // Handle recognition results
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = '';
        let finalText = '';

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;

          if (result.isFinal) {
            finalText += transcriptText + ' ';
          } else {
            interimText += transcriptText;
          }
        }

        // Update state with results
        if (finalText) {
          // **Validates: Requirement 2.2** - Provide transcribed text
          setTranscript(prev => {
            const combined = prev ? prev + ' ' + finalText : finalText;
            return combined.trim();
          });
          setInterimTranscript('');
        } else if (interimText) {
          setInterimTranscript(interimText);
        }

        setError(null);
      };

      // Handle recognition start
      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log('Speech recognition started');
      };

      // Handle recognition end
      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        console.log('Speech recognition ended');
      };

      // Handle recognition errors
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error, event.message);

        let voiceError: VoiceError;

        switch (event.error) {
          case 'no-speech':
            // User didn't speak - not really an error, just stop
            setIsListening(false);
            return;

          case 'audio-capture':
            voiceError = new VoiceError(
              'Audio capture failed',
              VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
              true,
              'Unable to capture audio. Please check your microphone.'
            );
            break;

          case 'not-allowed':
            voiceError = new VoiceError(
              'Microphone permission denied',
              VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
              true,
              'Microphone access is required for speech recognition.'
            );
            break;

          case 'network':
            voiceError = new VoiceError(
              'Network error during recognition',
              VoiceErrorCode.NETWORK_ERROR,
              true,
              'Network error occurred. Please check your connection and try again.'
            );
            break;

          case 'aborted':
            // Recognition was aborted intentionally - not an error
            setIsListening(false);
            return;

          default:
            voiceError = new VoiceError(
              `Speech recognition error: ${event.error}`,
              VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
              true,
              'Speech recognition failed. Please try again.'
            );
        }

        setError(voiceError);
        setIsListening(false);
      };

      // Start recognition
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      const voiceError = new VoiceError(
        err instanceof Error ? err.message : 'Failed to start speech recognition',
        VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
        true,
        'Unable to start speech recognition. Please try again.'
      );
      setError(voiceError);
      setIsListening(false);
      console.error('Failed to start browser recognition:', err);
    }
  }, []);

  /**
   * Start listening using server-side transcription (fallback)
   * 
   * **Validates: Requirement 14.5** - Fallback when browser API unavailable
   */
  const startServerRecognition = useCallback(async (): Promise<void> => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Create MediaRecorder to capture audio
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      audioChunksRef.current = [];

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop - send to server for transcription
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        try {
          const transcribedText = await transcribeAudioOnServer(audioBlob);
          setTranscript(prev => (prev + ' ' + transcribedText).trim());
          setError(null);
        } catch (err) {
          // Error already handled in transcribeAudioOnServer
          console.error('Transcription failed:', err);
        }

        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
        setIsListening(false);
      };

      // Start recording
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
      setError(null);
      console.log('Server-side recognition started');
    } catch (err) {
      const voiceError = new VoiceError(
        err instanceof Error ? err.message : 'Failed to start audio recording',
        VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
        true,
        'Unable to access microphone for speech recognition.'
      );
      setError(voiceError);
      setIsListening(false);
      console.error('Failed to start server recognition:', err);
    }
  }, [transcribeAudioOnServer]);

  /**
   * Start listening for speech
   * Uses browser API if supported, otherwise falls back to server transcription
   */
  const startListening = useCallback((): void => {
    if (isListening) {
      console.warn('Already listening');
      return;
    }

    // Use browser API if supported, otherwise use server fallback
    if (isSupported && !isUsingFallbackRef.current) {
      startBrowserRecognition();
    } else {
      startServerRecognition();
    }
  }, [isListening, isSupported, startBrowserRecognition, startServerRecognition]);

  /**
   * Stop listening for speech
   */
  const stopListening = useCallback((): void => {
    if (!isListening) {
      return;
    }

    // Stop browser recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    }

    // Stop server-side recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      } catch (err) {
        console.error('Error stopping media recorder:', err);
      }
    }

    setIsListening(false);
    setInterimTranscript('');
  }, [isListening]);

  /**
   * Reset transcript to empty
   */
  const resetTranscript = useCallback((): void => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clean up recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          console.error('Error aborting recognition:', err);
        }
        recognitionRef.current = null;
      }

      // Clean up media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error('Error stopping media recorder:', err);
        }
        mediaRecorderRef.current = null;
      }
    };
  }, []);

  return {
    // State
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    
    // Actions
    startListening,
    stopListening,
    resetTranscript,
  };
}
