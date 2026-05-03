'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { VoiceError, VoiceErrorCode } from '@/lib/errors';
import { useAudioInput } from '@/hooks/useAudioInput';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useConversation } from '@/hooks/useConversation';
import { useVoiceSynthesis } from '@/hooks/useVoiceSynthesis';
import { useAudioOutput } from '@/hooks/useAudioOutput';
import { ConversationTranscript } from '@/components/voice/ConversationTranscript';
import { VoiceActivityIndicator } from '@/components/voice/VoiceActivityIndicator';
import { ErrorDisplay } from '@/components/voice/ErrorDisplay';

/**
 * Voice Conversation Page
 * 
 * Main page component that orchestrates the voice conversation interface.
 * 
 * Responsibilities:
 * - Check browser compatibility on mount (MediaDevices, SpeechRecognition, AudioContext)
 * - Request microphone permissions
 * - Orchestrate all custom hooks: useAudioInput, useSpeechRecognition, useConversation, useVoiceSynthesis, useAudioOutput
 * - Render VoiceActivityIndicator, ConversationTranscript, and ErrorDisplay components
 * - Handle browser compatibility errors
 * - Handle permission errors
 * - Display loading states during initialization
 * - Implement responsive layout with Tailwind CSS
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 6.4, 6.5, 9.2, 11.1, 11.2, 11.3, 11.4, 11.5, 14.1, 14.2, 14.3, 14.4, 14.5**
 */
export default function VoiceConversationPage(): JSX.Element {
  // Initialize all custom hooks
  const audioInput = useAudioInput();
  const speechRecognition = useSpeechRecognition();
  const conversation = useConversation();
  const voiceSynthesis = useVoiceSynthesis();
  const audioOutput = useAudioOutput();

  // Local state for page-level concerns
  const [isInitializing, setIsInitializing] = useState(true);
  const [browserCompatibilityError, setBrowserCompatibilityError] = useState<VoiceError | null>(null);
  const [permissionError, setPermissionError] = useState<VoiceError | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  /**
   * Check browser compatibility on mount
   * 
   * **Validates: Requirement 14.1, 14.2, 14.3, 14.4, 14.5** - Check for required browser APIs
   */
  useEffect(() => {
    const checkBrowserCompatibility = async (): Promise<void> => {
      try {
        // Check for MediaDevices API (required for microphone access)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const error = new VoiceError(
            'MediaDevices API not supported',
            VoiceErrorCode.BROWSER_NOT_SUPPORTED,
            false,
            'Your browser does not support voice conversations. Please use Chrome 120+, Firefox 120+, Safari 17+, or Edge 120+.'
          );
          setBrowserCompatibilityError(error);
          setIsInitializing(false);
          return;
        }

        // Check for AudioContext (required for audio playback)
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          const error = new VoiceError(
            'AudioContext not supported',
            VoiceErrorCode.BROWSER_NOT_SUPPORTED,
            false,
            'Your browser does not support audio playback. Please use Chrome 120+, Firefox 120+, Safari 17+, or Edge 120+.'
          );
          setBrowserCompatibilityError(error);
          setIsInitializing(false);
          return;
        }

        // Check for SpeechRecognition API (optional - we have server fallback)
        const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
        if (!hasSpeechRecognition) {
          console.log('Browser Speech Recognition not supported, will use server fallback');
        }

        // Browser is compatible - proceed with permission request
        setBrowserCompatibilityError(null);
        setIsInitializing(false);
      } catch (err) {
        const error = new VoiceError(
          'Browser compatibility check failed',
          VoiceErrorCode.BROWSER_NOT_SUPPORTED,
          false,
          'Unable to verify browser compatibility. Please refresh the page.'
        );
        setBrowserCompatibilityError(error);
        setIsInitializing(false);
      }
    };

    checkBrowserCompatibility();
  }, []);

  /**
   * Request microphone permission on mount (after compatibility check)
   * 
   * **Validates: Requirement 1.1** - Request microphone permission from browser
   * **Validates: Requirement 1.3** - Handle permission denial gracefully
   */
  useEffect(() => {
    if (isInitializing || browserCompatibilityError) {
      return;
    }

    const requestMicrophonePermission = async (): Promise<void> => {
      try {
        const hasPermission = await audioInput.requestPermission();
        
        if (!hasPermission) {
          // Permission was denied
          if (audioInput.error) {
            setPermissionError(audioInput.error as VoiceError);
          }
        } else {
          // Permission granted
          setPermissionError(null);
        }
      } catch (err) {
        console.error('Failed to request microphone permission:', err);
        const error = new VoiceError(
          'Permission request failed',
          VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
          true,
          'Unable to request microphone access. Please try again.'
        );
        setPermissionError(error);
      }
    };

    requestMicrophonePermission();
  }, [isInitializing, browserCompatibilityError, audioInput]);

  /**
   * Handle user starting to speak
   * 
   * **Validates: Requirement 1.4** - Capture audio data continuously
   * **Validates: Requirement 6.2** - Indicate user has the turn while speaking
   */
  const handleStartSpeaking = useCallback(async (): Promise<void> => {
    try {
      // Start audio capture
      await audioInput.startCapture();
      
      // Start speech recognition
      speechRecognition.startListening();
    } catch (err) {
      console.error('Failed to start speaking:', err);
      if (audioInput.error) {
        setPermissionError(audioInput.error as VoiceError);
      }
    }
  }, [audioInput, speechRecognition]);

  /**
   * Handle user stopping speaking
   * 
   * **Validates: Requirement 2.1, 2.2** - Send transcribed text to conversation manager
   */
  const handleStopSpeaking = useCallback(async (): Promise<void> => {
    try {
      // Stop audio capture
      audioInput.stopCapture();
      
      // Stop speech recognition
      speechRecognition.stopListening();

      // If we have a final transcript, send it to the conversation
      if (speechRecognition.transcript && speechRecognition.transcript.trim()) {
        try {
          await conversation.sendMessage(speechRecognition.transcript);
          speechRecognition.resetTranscript();
        } catch (err) {
          console.error('Failed to send message:', err);
          // Error is already handled in useConversation hook
        }
      }
    } catch (err) {
      console.error('Failed to stop speaking:', err);
    }
  }, [audioInput, speechRecognition, conversation]);

  /**
   * Handle interruption (user speaks while AI is speaking)
   * 
   * **Validates: Requirement 7.1, 7.2, 7.3, 7.4** - Interrupt AI response
   */
  const handleInterrupt = useCallback((): void => {
    console.log('User interrupted AI response');
    conversation.interrupt();
    speechRecognition.resetTranscript();
  }, [conversation, speechRecognition]);

  /**
   * Handle retry for recoverable errors
   */
  const handleRetryError = useCallback((): void => {
    setPermissionError(null);
    setDismissedError(null);
    
    // Re-request permission
    audioInput.requestPermission().catch(err => {
      console.error('Failed to retry permission request:', err);
    });
  }, [audioInput]);

  /**
   * Handle dismissing errors
   */
  const handleDismissError = useCallback((errorCode?: string): void => {
    if (errorCode) {
      setDismissedError(errorCode);
    }
    setPermissionError(null);
  }, []);

  /**
   * Determine current error to display
   */
  const currentError = browserCompatibilityError || permissionError || conversation.error;

  /**
   * Determine if user can start speaking
   */
  const canStartSpeaking = 
    !isInitializing &&
    !browserCompatibilityError &&
    !permissionError &&
    audioInput.hasPermission &&
    conversation.currentState === 'listening' &&
    !audioInput.isCapturing;

  /**
   * Determine if user is currently speaking
   */
  const isUserSpeaking = audioInput.isCapturing && speechRecognition.isListening;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Voice Conversation
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Speak naturally to have a conversation with AI about news topics
          </p>
        </div>

        {/* Loading State */}
        {isInitializing && (
          <div className="flex items-center justify-center py-12 md:py-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-100 mb-4">
                <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
              <p className="text-gray-600 font-medium">Initializing voice conversation...</p>
            </div>
          </div>
        )}

        {/* Browser Compatibility Error */}
        {!isInitializing && browserCompatibilityError && (
          <div className="mb-6">
            <ErrorDisplay
              error={browserCompatibilityError}
              onDismiss={() => handleDismissError(browserCompatibilityError.code)}
            />
          </div>
        )}

        {/* Permission Error */}
        {!isInitializing && !browserCompatibilityError && permissionError && (
          <div className="mb-6">
            <ErrorDisplay
              error={permissionError}
              onRetry={handleRetryError}
              onDismiss={() => handleDismissError(permissionError.code)}
            />
          </div>
        )}

        {/* Main Content (only show if no critical errors) */}
        {!isInitializing && !browserCompatibilityError && !permissionError && (
          <div className="space-y-6">
            {/* Conversation Error */}
            {conversation.error && (
              <ErrorDisplay
                error={conversation.error}
                onRetry={() => {
                  // Clear error and allow retry
                  conversation.clearHistory();
                }}
                onDismiss={() => handleDismissError(conversation.error?.code)}
              />
            )}

            {/* Main Layout: Responsive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Conversation Transcript (full width on mobile, 2/3 on desktop) */}
              <div className="lg:col-span-2">
                <ConversationTranscript
                  messages={conversation.messages}
                  isLoading={conversation.isGenerating}
                />
              </div>

              {/* Right Column: Voice Activity and Controls (full width on mobile, 1/3 on desktop) */}
              <div className="space-y-6">
                {/* Voice Activity Indicator */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <VoiceActivityIndicator
                      state={conversation.currentState}
                      volume={audioInput.volume}
                    />
                    
                    {/* State Label */}
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 capitalize">
                        {conversation.currentState === 'listening' && 'Ready to listen'}
                        {conversation.currentState === 'processing' && 'Processing your speech'}
                        {conversation.currentState === 'thinking' && 'Generating response'}
                        {conversation.currentState === 'speaking' && 'Playing response'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="space-y-3">
                    {/* Start Speaking Button */}
                    <button
                      onClick={handleStartSpeaking}
                      disabled={!canStartSpeaking}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        canStartSpeaking
                          ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      aria-label="Start speaking"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path d="M10 1a4 4 0 00-4 4v5a4 4 0 008 0V5a4 4 0 00-4-4zM3 14.5a7 7 0 1014 0H3z" />
                      </svg>
                      Start Speaking
                    </button>

                    {/* Stop Speaking Button */}
                    <button
                      onClick={handleStopSpeaking}
                      disabled={!isUserSpeaking}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        isUserSpeaking
                          ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      aria-label="Stop speaking"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h12v12H4V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Stop Speaking
                    </button>

                    {/* Interrupt Button (only show when AI is speaking) */}
                    {conversation.currentState === 'speaking' && (
                      <button
                        onClick={handleInterrupt}
                        className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 bg-amber-600 text-white hover:bg-amber-700 active:scale-95"
                        aria-label="Interrupt AI response"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Interrupt
                      </button>
                    )}

                    {/* Clear History Button */}
                    <button
                      onClick={() => conversation.clearHistory()}
                      className="w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95"
                      aria-label="Clear conversation history"
                    >
                      Clear History
                    </button>
                  </div>
                </div>

                {/* Status Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Microphone:</span>
                      <span className={audioInput.hasPermission ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {audioInput.hasPermission ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Messages:</span>
                      <span className="text-gray-900 font-medium">{conversation.messages.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Speech Recognition:</span>
                      <span className={speechRecognition.isSupported ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                        {speechRecognition.isSupported ? 'Native' : 'Server'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transcript Display (mobile-friendly) */}
            {speechRecognition.transcript && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:hidden">
                <p className="text-sm text-gray-600 mb-2">Your speech:</p>
                <p className="text-gray-900">{speechRecognition.transcript}</p>
              </div>
            )}

            {speechRecognition.interimTranscript && (
              <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4 lg:hidden">
                <p className="text-sm text-blue-600 mb-2">Interim:</p>
                <p className="text-blue-900 italic">{speechRecognition.interimTranscript}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 md:mt-12 text-center text-xs md:text-sm text-gray-500">
          <p>
            Voice conversations are powered by OpenAI's speech recognition and text-to-speech APIs.
          </p>
        </div>
      </div>
    </div>
  );
}
