import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay } from './ErrorDisplay';
import { VoiceError, VoiceErrorCode } from '@/lib/errors';

/**
 * Test suite for ErrorDisplay component
 * 
 * Tests all error types, user interactions, and accessibility features
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */

describe('ErrorDisplay', () => {
  describe('Rendering', () => {
    it('renders nothing when error is null', () => {
      const { container } = render(
        <ErrorDisplay error={null} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders error alert when error is provided', () => {
      const error = new VoiceError(
        'Microphone access denied',
        VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
        false,
        'Microphone access is required for voice conversations.'
      );

      render(<ErrorDisplay error={error} />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Microphone access is required for voice conversations.')).toBeInTheDocument();
    });

    it('displays error icon', () => {
      const error = new VoiceError(
        'Test error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Network error occurred'
      );

      render(<ErrorDisplay error={error} />);
      
      const svg = screen.getByRole('alert').querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Recoverable Errors', () => {
    it('shows retry button for recoverable errors', () => {
      const error = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost. Please try again.'
      );

      render(
        <ErrorDisplay 
          error={error} 
          onRetry={() => {}}
        />
      );

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const onRetry = jest.fn();
      const error = new VoiceError(
        'API rate limit',
        VoiceErrorCode.API_RATE_LIMIT,
        true,
        'Rate limit exceeded'
      );

      render(
        <ErrorDisplay 
          error={error} 
          onRetry={onRetry}
        />
      );

      fireEvent.click(screen.getByText('Retry'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('displays "Temporary Issue" header for recoverable errors', () => {
      const error = new VoiceError(
        'Speech recognition failed',
        VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
        true,
        'Could not understand speech'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Temporary Issue')).toBeInTheDocument();
    });

    it('shows dismiss button for recoverable errors', () => {
      const error = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost'
      );

      render(
        <ErrorDisplay 
          error={error} 
          onDismiss={() => {}}
        />
      );

      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });
  });

  describe('Non-Recoverable Errors', () => {
    it('displays "Unable to Continue" header for non-recoverable errors', () => {
      const error = new VoiceError(
        'Microphone not found',
        VoiceErrorCode.MICROPHONE_NOT_FOUND,
        false,
        'No microphone detected'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Unable to Continue')).toBeInTheDocument();
    });

    it('does not show retry button for non-recoverable errors', () => {
      const error = new VoiceError(
        'Browser not supported',
        VoiceErrorCode.BROWSER_NOT_SUPPORTED,
        false,
        'Your browser does not support voice conversations'
      );

      render(
        <ErrorDisplay 
          error={error} 
          onRetry={() => {}}
        />
      );

      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('shows close button for non-recoverable errors with onDismiss', () => {
      const error = new VoiceError(
        'API key missing',
        VoiceErrorCode.API_KEY_MISSING,
        false,
        'Voice conversations are not configured'
      );

      render(
        <ErrorDisplay 
          error={error} 
          onDismiss={() => {}}
        />
      );

      const closeButton = screen.getByLabelText('Dismiss error');
      expect(closeButton).toBeInTheDocument();
    });

    it('calls onDismiss when close button is clicked', () => {
      const onDismiss = jest.fn();
      const error = new VoiceError(
        'API authentication failed',
        VoiceErrorCode.API_AUTHENTICATION_FAILED,
        false,
        'Authentication failed'
      );

      render(
        <ErrorDisplay 
          error={error} 
          onDismiss={onDismiss}
        />
      );

      fireEvent.click(screen.getByLabelText('Dismiss error'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Resolution Guidance', () => {
    it('shows guidance for microphone permission denied', () => {
      const error = new VoiceError(
        'Permission denied',
        VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
        false,
        'Microphone access is required'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/allow microphone access in your browser settings/i)).toBeInTheDocument();
    });

    it('shows guidance for microphone not found', () => {
      const error = new VoiceError(
        'No microphone',
        VoiceErrorCode.MICROPHONE_NOT_FOUND,
        false,
        'No microphone detected'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/connect a microphone to your device/i)).toBeInTheDocument();
    });

    it('shows guidance for browser not supported', () => {
      const error = new VoiceError(
        'Browser not supported',
        VoiceErrorCode.BROWSER_NOT_SUPPORTED,
        false,
        'Your browser does not support voice conversations'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/Chrome 120\+, Firefox 120\+, Safari 17\+, or Edge 120\+/i)).toBeInTheDocument();
    });

    it('shows guidance for API key missing', () => {
      const error = new VoiceError(
        'API key missing',
        VoiceErrorCode.API_KEY_MISSING,
        false,
        'Voice conversations are not configured'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/contact support/i)).toBeInTheDocument();
    });

    it('shows guidance for API authentication failed', () => {
      const error = new VoiceError(
        'Auth failed',
        VoiceErrorCode.API_AUTHENTICATION_FAILED,
        false,
        'Authentication failed'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/Authentication failed.*contact support/i)).toBeInTheDocument();
    });

    it('shows guidance for network error', () => {
      const error = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/Check your internet connection/i)).toBeInTheDocument();
    });

    it('shows guidance for API rate limit', () => {
      const error = new VoiceError(
        'Rate limit',
        VoiceErrorCode.API_RATE_LIMIT,
        true,
        'Rate limit exceeded'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/Voice services are busy/i)).toBeInTheDocument();
    });

    it('shows guidance for speech recognition failed', () => {
      const error = new VoiceError(
        'Recognition failed',
        VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
        true,
        'Could not understand speech'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/speak clearly and try again/i)).toBeInTheDocument();
    });

    it('shows guidance for TTS synthesis failed', () => {
      const error = new VoiceError(
        'Synthesis failed',
        VoiceErrorCode.TTS_SYNTHESIS_FAILED,
        true,
        'Audio synthesis failed'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/Audio synthesis failed.*text response/i)).toBeInTheDocument();
    });

    it('shows guidance for audio playback failed', () => {
      const error = new VoiceError(
        'Playback failed',
        VoiceErrorCode.AUDIO_PLAYBACK_FAILED,
        true,
        'Audio playback failed'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/Audio playback failed.*text response/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = jest.fn();
      const error = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost'
      );

      render(
        <ErrorDisplay 
          error={error} 
          onDismiss={onDismiss}
        />
      );

      fireEvent.click(screen.getByText('Dismiss'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not show dismiss button when onDismiss is not provided', () => {
      const error = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
    });

    it('does not show retry button when onRetry is not provided', () => {
      const error = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('shows both retry and dismiss buttons when both callbacks are provided', () => {
      const onRetry = jest.fn();
      const onDismiss = jest.fn();
      const error = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost'
      );

      render(
        <ErrorDisplay 
          error={error} 
          onRetry={onRetry}
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for alert role', () => {
      const error = new VoiceError(
        'Test error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Test error message'
      );

      render(<ErrorDisplay error={error} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('role', 'alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('has descriptive aria-label for alert', () => {
      const error = new VoiceError(
        'Test error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost'
      );

      render(<ErrorDisplay error={error} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-label', 'Error: Connection lost');
    });

    it('has aria-label for retry button', () => {
      const error = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost'
      );

      render(
        <ErrorDisplay 
          error={error} 
          onRetry={() => {}}
        />
      );

      const retryButton = screen.getByLabelText('Retry the failed operation');
      expect(retryButton).toBeInTheDocument();
    });

    it('has aria-label for dismiss button', () => {
      const error = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost'
      );

      render(
        <ErrorDisplay 
          error={error} 
          onDismiss={() => {}}
        />
      );

      const dismissButton = screen.getByLabelText('Dismiss error message');
      expect(dismissButton).toBeInTheDocument();
    });

    it('has aria-hidden for decorative SVGs', () => {
      const error = new VoiceError(
        'Test error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Test error message'
      );

      render(<ErrorDisplay error={error} />);

      const svgs = screen.getByRole('alert').querySelectorAll('svg');
      svgs.forEach(svg => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Error Message Display', () => {
    it('displays user-friendly error message from VoiceError', () => {
      const error = new VoiceError(
        'Internal error code',
        VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
        true,
        'Could not understand what you said. Please try again.'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Could not understand what you said. Please try again.')).toBeInTheDocument();
    });

    it('displays different messages for different error codes', () => {
      const error1 = new VoiceError(
        'Error 1',
        VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
        false,
        'Microphone access required'
      );

      const error2 = new VoiceError(
        'Error 2',
        VoiceErrorCode.BROWSER_NOT_SUPPORTED,
        false,
        'Browser not supported'
      );

      const { rerender } = render(<ErrorDisplay error={error1} />);
      expect(screen.getByText('Microphone access required')).toBeInTheDocument();

      rerender(<ErrorDisplay error={error2} />);
      expect(screen.getByText('Browser not supported')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies correct styling classes for error container', () => {
      const error = new VoiceError(
        'Test error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Test error message'
      );

      render(<ErrorDisplay error={error} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('rounded-lg', 'border', 'border-red-200', 'bg-red-50', 'p-4', 'shadow-sm');
    });

    it('applies correct styling for retry button', () => {
      const error = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost'
      );

      render(
        <ErrorDisplay 
          error={error} 
          onRetry={() => {}}
        />
      );

      const retryButton = screen.getByText('Retry');
      expect(retryButton).toHaveClass('bg-red-600', 'text-white', 'hover:bg-red-700');
    });

    it('applies correct styling for dismiss button', () => {
      const error = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost'
      );

      render(
        <ErrorDisplay 
          error={error} 
          onDismiss={() => {}}
        />
      );

      const dismissButton = screen.getByText('Dismiss');
      expect(dismissButton).toHaveClass('border', 'border-red-300', 'bg-white', 'text-red-700', 'hover:bg-red-50');
    });
  });

  describe('Edge Cases', () => {
    it('handles error with very long message', () => {
      const longMessage = 'A'.repeat(500);
      const error = new VoiceError(
        'Long error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        longMessage
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles rapid error changes', () => {
      const error1 = new VoiceError(
        'Error 1',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'First error'
      );

      const error2 = new VoiceError(
        'Error 2',
        VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
        true,
        'Second error'
      );

      const { rerender } = render(<ErrorDisplay error={error1} />);
      expect(screen.getByText('First error')).toBeInTheDocument();

      rerender(<ErrorDisplay error={error2} />);
      expect(screen.getByText('Second error')).toBeInTheDocument();
      expect(screen.queryByText('First error')).not.toBeInTheDocument();
    });

    it('handles error clearing (null error)', () => {
      const error = new VoiceError(
        'Test error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Test error message'
      );

      const { rerender, container } = render(<ErrorDisplay error={error} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();

      rerender(<ErrorDisplay error={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('handles missing optional callbacks gracefully', () => {
      const error = new VoiceError(
        'Test error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Test error message'
      );

      render(<ErrorDisplay error={error} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
      expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
    });
  });

  describe('All Error Types', () => {
    const errorTypes = [
      {
        code: VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
        recoverable: false,
        message: 'Microphone permission denied'
      },
      {
        code: VoiceErrorCode.MICROPHONE_NOT_FOUND,
        recoverable: false,
        message: 'Microphone not found'
      },
      {
        code: VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
        recoverable: true,
        message: 'Speech recognition failed'
      },
      {
        code: VoiceErrorCode.API_KEY_MISSING,
        recoverable: false,
        message: 'API key missing'
      },
      {
        code: VoiceErrorCode.API_AUTHENTICATION_FAILED,
        recoverable: false,
        message: 'API authentication failed'
      },
      {
        code: VoiceErrorCode.API_RATE_LIMIT,
        recoverable: true,
        message: 'API rate limit'
      },
      {
        code: VoiceErrorCode.NETWORK_ERROR,
        recoverable: true,
        message: 'Network error'
      },
      {
        code: VoiceErrorCode.TTS_SYNTHESIS_FAILED,
        recoverable: true,
        message: 'TTS synthesis failed'
      },
      {
        code: VoiceErrorCode.AUDIO_PLAYBACK_FAILED,
        recoverable: true,
        message: 'Audio playback failed'
      },
      {
        code: VoiceErrorCode.BROWSER_NOT_SUPPORTED,
        recoverable: false,
        message: 'Browser not supported'
      },
    ];

    errorTypes.forEach(({ code, recoverable, message }) => {
      it(`handles ${code} error correctly`, () => {
        const error = new VoiceError(
          message,
          code,
          recoverable,
          `User-friendly: ${message}`
        );

        render(
          <ErrorDisplay 
            error={error} 
            onRetry={() => {}}
            onDismiss={() => {}}
          />
        );

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(`User-friendly: ${message}`)).toBeInTheDocument();

        if (recoverable) {
          expect(screen.getByText('Temporary Issue')).toBeInTheDocument();
          expect(screen.getByText('Retry')).toBeInTheDocument();
        } else {
          expect(screen.getByText('Unable to Continue')).toBeInTheDocument();
          expect(screen.queryByText('Retry')).not.toBeInTheDocument();
        }
      });
    });
  });
});
