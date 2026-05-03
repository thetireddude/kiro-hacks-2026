'use client';

import React from 'react';
import { VoiceError, isRecoverableError, formatErrorMessage } from '@/lib/errors';

interface ErrorDisplayProps {
  error: VoiceError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * ErrorDisplay Component
 * 
 * Displays user-friendly error messages with appropriate recovery options.
 * Shows retry button for recoverable errors and dismiss button for non-blocking errors.
 * Provides resolution guidance for non-recoverable errors.
 * 
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
}: ErrorDisplayProps): JSX.Element | null {
  if (!error) {
    return null;
  }

  const recoverable = isRecoverableError(error);
  const message = formatErrorMessage(error);
  const resolutionGuidance = getResolutionGuidance(error);

  return (
    <div
      className="w-full rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm"
      role="alert"
      aria-live="polite"
      aria-label={`Error: ${message}`}
    >
      {/* Error Header */}
      <div className="flex items-start gap-3">
        {/* Error Icon */}
        <div className="flex-shrink-0 pt-0.5">
          <svg
            className="h-5 w-5 text-red-600"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Error Content */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {recoverable ? 'Temporary Issue' : 'Unable to Continue'}
          </h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>

          {/* Resolution Guidance */}
          {resolutionGuidance && (
            <p className="mt-2 text-sm text-red-600">{resolutionGuidance}</p>
          )}
        </div>

        {/* Close Button (for non-recoverable errors) */}
        {!recoverable && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
            aria-label="Dismiss error"
          >
            <svg
              className="h-5 w-5"
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
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        {recoverable && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            aria-label="Retry the failed operation"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Retry
          </button>
        )}

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            aria-label="Dismiss error message"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Get resolution guidance based on error code
 */
function getResolutionGuidance(error: VoiceError): string | null {
  switch (error.code) {
    case 'MICROPHONE_PERMISSION_DENIED':
      return 'Please allow microphone access in your browser settings and refresh the page.';
    case 'MICROPHONE_NOT_FOUND':
      return 'Please connect a microphone to your device and refresh the page.';
    case 'BROWSER_NOT_SUPPORTED':
      return 'Please use Chrome 120+, Firefox 120+, Safari 17+, or Edge 120+.';
    case 'API_KEY_MISSING':
      return 'Voice conversations are not configured. Please contact support.';
    case 'API_AUTHENTICATION_FAILED':
      return 'Authentication failed. Please contact support.';
    case 'NETWORK_ERROR':
      return 'Check your internet connection and try again.';
    case 'API_RATE_LIMIT':
      return 'Voice services are busy. Please wait a moment and try again.';
    case 'SPEECH_RECOGNITION_FAILED':
      return 'Please speak clearly and try again.';
    case 'TTS_SYNTHESIS_FAILED':
      return 'Audio synthesis failed. The text response is shown instead.';
    case 'AUDIO_PLAYBACK_FAILED':
      return 'Audio playback failed. The text response is shown instead.';
    default:
      return null;
  }
}
