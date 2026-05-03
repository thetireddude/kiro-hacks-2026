/**
 * Custom hook for managing voice conversation state and flow
 * 
 * This hook handles:
 * - Maintaining conversation history (max 50 messages)
 * - Sending messages to /api/chat for AI response generation
 * - Managing conversation state transitions (listening → processing → thinking → speaking)
 * - Handling interruptions (cancel pending requests and stop audio)
 * - Clearing conversation history
 * - Coordinating with voice synthesis hook for TTS
 * - Error handling with retry support
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 6.4, 7.4, 12.1, 12.5**
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { VoiceError, VoiceErrorCode } from '@/lib/errors';
import { retryWithBackoff, RetryOptions } from '@/lib/retry';
import { useVoiceSynthesis } from './useVoiceSynthesis';
import { useAudioOutput } from './useAudioOutput';
import type { ConversationMessage, ConversationState as ConversationStateType } from '@/lib/voice/types';

/**
 * Conversation state
 */
interface ConversationState {
  messages: ConversationMessage[];
  currentState: 'listening' | 'processing' | 'thinking' | 'speaking';
  error: VoiceError | null;
  isGenerating: boolean;
}

/**
 * Conversation actions
 */
interface ConversationActions {
  sendMessage: (text: string) => Promise<void>;
  interrupt: () => void;
  clearHistory: () => void;
}

/**
 * Retry configuration for chat API calls
 * 
 * **Validates: Requirement 3.4** - Retry on failure with exponential backoff
 */
const RETRY_CONFIG: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,      // 1 second
  maxDelay: 10000,      // 10 seconds
  backoffMultiplier: 2, // 1s, 2s, 4s
};

/**
 * Maximum conversation history length
 * 
 * **Validates: Requirement 12.5** - Limit conversation history to 50 messages
 */
const MAX_CONVERSATION_LENGTH = 50;

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Custom hook for managing voice conversation
 * 
 * @returns Conversation state and actions
 * 
 * @example
 * ```typescript
 * function VoiceConversationPage() {
 *   const {
 *     messages,
 *     currentState,
 *     error,
 *     isGenerating,
 *     sendMessage,
 *     interrupt,
 *     clearHistory
 *   } = useConversation();
 *   
 *   const handleUserMessage = async (text: string) => {
 *     try {
 *       await sendMessage(text);
 *     } catch (err) {
 *       console.error('Failed to send message:', err);
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <ConversationTranscript messages={messages} />
 *       <VoiceActivityIndicator state={currentState} />
 *       {error && <ErrorDisplay error={error} />}
 *       <button onClick={interrupt}>Interrupt</button>
 *       <button onClick={clearHistory}>Clear</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useConversation(): ConversationState & ConversationActions {
  // **Validates: Requirement 12.1** - Maintain conversation history during session
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  
  // **Validates: Requirement 6.1, 6.2, 6.3, 6.4** - Track conversation state
  const [currentState, setCurrentState] = useState<ConversationStateType>('listening');
  
  const [error, setError] = useState<VoiceError | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Refs for managing async operations
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInterruptedRef = useRef<boolean>(false);

  // Initialize voice synthesis and audio output hooks
  const { synthesize, cancel: cancelSynthesis } = useVoiceSynthesis();
  
  // **Validates: Requirement 6.4** - Return to listening state after AI finishes speaking
  const handlePlaybackComplete = useCallback(() => {
    setCurrentState('listening');
  }, []);

  // **Validates: Requirement 7.4** - Handle interruption during playback
  const handlePlaybackInterrupted = useCallback(() => {
    console.log('Audio playback interrupted');
    isInterruptedRef.current = true;
  }, []);

  const { play: playAudio, stop: stopAudio, isPlaying } = useAudioOutput(
    handlePlaybackComplete,
    handlePlaybackInterrupted
  );

  /**
   * Add a message to conversation history
   * 
   * **Validates: Requirement 12.5** - Limit history to 50 messages
   */
  const addMessage = useCallback((role: 'user' | 'assistant', content: string): ConversationMessage => {
    const message: ConversationMessage = {
      id: generateMessageId(),
      role,
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => {
      const updated = [...prev, message];
      
      // **Validates: Requirement 12.5** - Maintain max 50 messages
      if (updated.length > MAX_CONVERSATION_LENGTH) {
        return updated.slice(updated.length - MAX_CONVERSATION_LENGTH);
      }
      
      return updated;
    });

    return message;
  }, []);

  /**
   * Call chat API to generate AI response
   * 
   * **Validates: Requirement 3.1** - Send message to OpenAI API for response generation
   * **Validates: Requirement 3.3** - Maintain conversation context across turns
   * **Validates: Requirement 3.5** - Use API key from environment variables
   */
  const callChatAPI = useCallback(async (
    message: string,
    history: ConversationMessage[],
    signal: AbortSignal
  ): Promise<string> => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
      }),
      signal, // Support cancellation
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Chat API failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }, []);

  /**
   * Send a message and get AI response
   * 
   * **Validates: Requirement 3.1** - Send user message to chat API
   * **Validates: Requirement 3.2** - Add AI response to conversation history
   * **Validates: Requirement 3.3** - Maintain conversation context
   * **Validates: Requirement 3.4** - Display error and allow retry on failure
   * **Validates: Requirement 6.2** - Indicate user has the turn while speaking
   * **Validates: Requirement 6.3** - Indicate AI has the turn while generating/speaking
   */
  const sendMessage = useCallback(async (text: string): Promise<void> => {
    // Validate input
    if (!text || text.trim().length === 0) {
      const voiceError = new VoiceError(
        'Empty message provided',
        VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
        false,
        'No message to send.'
      );
      setError(voiceError);
      throw voiceError;
    }

    // Reset interruption flag
    isInterruptedRef.current = false;

    // Create abort controller for cancellation support
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // **Validates: Requirement 6.2** - Set state to processing (user turn)
      setCurrentState('processing');
      setError(null);

      // Add user message to history
      addMessage('user', text);

      // **Validates: Requirement 6.3** - Set state to thinking (AI turn)
      setCurrentState('thinking');
      setIsGenerating(true);

      // Get current conversation history for context
      const currentHistory = messages;

      // **Validates: Requirement 3.1, 3.3** - Call chat API with message and history
      // **Validates: Requirement 3.4** - Retry with exponential backoff
      const aiResponse = await retryWithBackoff(
        () => callChatAPI(text, currentHistory, abortController.signal),
        RETRY_CONFIG
      );

      // Check if interrupted during generation
      if (isInterruptedRef.current || abortController.signal.aborted) {
        console.log('Message generation was interrupted');
        setIsGenerating(false);
        setCurrentState('listening');
        return;
      }

      // **Validates: Requirement 3.2** - Add AI response to conversation history
      addMessage('assistant', aiResponse);

      setIsGenerating(false);

      // **Validates: Requirement 6.3** - Set state to speaking (AI turn)
      setCurrentState('speaking');

      // Synthesize AI response to speech
      const audioBuffer = await synthesize(aiResponse);

      // Check if interrupted during synthesis
      if (isInterruptedRef.current || abortController.signal.aborted) {
        console.log('Synthesis was interrupted');
        setCurrentState('listening');
        return;
      }

      // Play synthesized audio
      await playAudio(audioBuffer);

      // State transition to 'listening' is handled by playback completion callback
    } catch (err) {
      setIsGenerating(false);

      // Handle abort (cancellation/interruption)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Message sending was cancelled');
        setCurrentState('listening');
        return;
      }

      // **Validates: Requirement 3.4** - Handle errors and allow retry
      const voiceError = err instanceof VoiceError
        ? err
        : new VoiceError(
            err instanceof Error ? err.message : 'Failed to generate response',
            VoiceErrorCode.NETWORK_ERROR,
            true,
            'Unable to generate AI response. Please try again.'
          );
      
      setError(voiceError);
      setCurrentState('listening');
      console.error('Conversation error:', err);
      
      throw voiceError;
    } finally {
      // Clean up abort controller
      abortControllerRef.current = null;
    }
  }, [messages, addMessage, callChatAPI, synthesize, playAudio]);

  /**
   * Interrupt current conversation flow
   * 
   * **Validates: Requirement 7.2** - Stop audio playback immediately
   * **Validates: Requirement 7.3** - Cancel pending AI response generation
   * **Validates: Requirement 7.4** - Transfer control to user
   * **Validates: Requirement 7.5** - Preserve conversation history up to interruption
   */
  const interrupt = useCallback((): void => {
    console.log('Interrupting conversation');
    
    // Set interruption flag
    isInterruptedRef.current = true;

    // **Validates: Requirement 7.3** - Cancel pending AI response generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Cancel synthesis if in progress
    cancelSynthesis();

    // **Validates: Requirement 7.2** - Stop audio playback immediately
    if (isPlaying) {
      stopAudio();
    }

    // **Validates: Requirement 7.4** - Transfer control to user (set state to listening)
    setCurrentState('listening');
    setIsGenerating(false);
    setError(null);

    // **Validates: Requirement 7.5** - Conversation history is preserved (no changes to messages)
  }, [cancelSynthesis, stopAudio, isPlaying]);

  /**
   * Clear conversation history
   * 
   * **Validates: Requirement 12.2** - Clear conversation history when navigating away
   * **Validates: Requirement 12.3** - Start new conversation session
   */
  const clearHistory = useCallback((): void => {
    // Stop any ongoing operations
    interrupt();

    // Clear all messages
    setMessages([]);
    setError(null);
    setCurrentState('listening');
    
    console.log('Conversation history cleared');
  }, [interrupt]);

  return {
    // State
    messages,
    currentState,
    error,
    isGenerating,
    
    // Actions
    sendMessage,
    interrupt,
    clearHistory,
  };
}
