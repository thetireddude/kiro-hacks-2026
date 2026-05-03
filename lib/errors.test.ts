/**
 * Unit tests for error handling utilities
 * 
 * **Validates: Requirements 10.1, 10.4**
 * 
 * Tests cover:
 * - VoiceError construction and properties
 * - formatErrorMessage for all error codes
 * - isRecoverableError classification
 */

import {
  VoiceError,
  VoiceErrorCode,
  formatErrorMessage,
  isRecoverableError,
} from './errors';

describe('VoiceError', () => {
  describe('construction', () => {
    it('creates error with all required properties', () => {
      const error = new VoiceError(
        'Technical message',
        VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
        false,
        'User-friendly message'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(VoiceError);
      expect(error.name).toBe('VoiceError');
      expect(error.message).toBe('Technical message');
      expect(error.code).toBe(VoiceErrorCode.MICROPHONE_PERMISSION_DENIED);
      expect(error.recoverable).toBe(false);
      expect(error.userMessage).toBe('User-friendly message');
    });

    it('maintains proper stack trace', () => {
      const error = new VoiceError(
        'Test error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Network issue'
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('VoiceError');
    });

    it('creates recoverable error', () => {
      const error = new VoiceError(
        'Recoverable issue',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Please try again'
      );

      expect(error.recoverable).toBe(true);
    });

    it('creates non-recoverable error', () => {
      const error = new VoiceError(
        'Non-recoverable issue',
        VoiceErrorCode.BROWSER_NOT_SUPPORTED,
        false,
        'Browser not supported'
      );

      expect(error.recoverable).toBe(false);
    });
  });

  describe('error codes', () => {
    it('has MICROPHONE_PERMISSION_DENIED code', () => {
      expect(VoiceErrorCode.MICROPHONE_PERMISSION_DENIED).toBe('MICROPHONE_PERMISSION_DENIED');
    });

    it('has MICROPHONE_NOT_FOUND code', () => {
      expect(VoiceErrorCode.MICROPHONE_NOT_FOUND).toBe('MICROPHONE_NOT_FOUND');
    });

    it('has SPEECH_RECOGNITION_FAILED code', () => {
      expect(VoiceErrorCode.SPEECH_RECOGNITION_FAILED).toBe('SPEECH_RECOGNITION_FAILED');
    });

    it('has API_KEY_MISSING code', () => {
      expect(VoiceErrorCode.API_KEY_MISSING).toBe('API_KEY_MISSING');
    });

    it('has API_AUTHENTICATION_FAILED code', () => {
      expect(VoiceErrorCode.API_AUTHENTICATION_FAILED).toBe('API_AUTHENTICATION_FAILED');
    });

    it('has API_RATE_LIMIT code', () => {
      expect(VoiceErrorCode.API_RATE_LIMIT).toBe('API_RATE_LIMIT');
    });

    it('has NETWORK_ERROR code', () => {
      expect(VoiceErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
    });

    it('has TTS_SYNTHESIS_FAILED code', () => {
      expect(VoiceErrorCode.TTS_SYNTHESIS_FAILED).toBe('TTS_SYNTHESIS_FAILED');
    });

    it('has AUDIO_PLAYBACK_FAILED code', () => {
      expect(VoiceErrorCode.AUDIO_PLAYBACK_FAILED).toBe('AUDIO_PLAYBACK_FAILED');
    });

    it('has BROWSER_NOT_SUPPORTED code', () => {
      expect(VoiceErrorCode.BROWSER_NOT_SUPPORTED).toBe('BROWSER_NOT_SUPPORTED');
    });
  });
});

describe('formatErrorMessage', () => {
  it('returns userMessage when provided', () => {
    const error = new VoiceError(
      'Technical error message',
      VoiceErrorCode.NETWORK_ERROR,
      true,
      'User-friendly network error'
    );

    expect(formatErrorMessage(error)).toBe('User-friendly network error');
  });

  it('returns technical message when userMessage is empty string', () => {
    const error = new VoiceError(
      'Technical message',
      VoiceErrorCode.NETWORK_ERROR,
      true,
      ''
    );

    expect(formatErrorMessage(error)).toBe('Technical message');
  });

  it('formats MICROPHONE_PERMISSION_DENIED error', () => {
    const error = new VoiceError(
      'Permission denied',
      VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
      false,
      'Microphone access is required for voice conversations. Please allow microphone access and try again.'
    );

    expect(formatErrorMessage(error)).toBe(
      'Microphone access is required for voice conversations. Please allow microphone access and try again.'
    );
  });

  it('formats MICROPHONE_NOT_FOUND error', () => {
    const error = new VoiceError(
      'No microphone',
      VoiceErrorCode.MICROPHONE_NOT_FOUND,
      false,
      'No microphone detected. Please connect a microphone to use voice conversations.'
    );

    expect(formatErrorMessage(error)).toBe(
      'No microphone detected. Please connect a microphone to use voice conversations.'
    );
  });

  it('formats SPEECH_RECOGNITION_FAILED error', () => {
    const error = new VoiceError(
      'Recognition failed',
      VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
      true,
      "Couldn't understand that. Please try speaking again."
    );

    expect(formatErrorMessage(error)).toBe(
      "Couldn't understand that. Please try speaking again."
    );
  });

  it('formats API_KEY_MISSING error', () => {
    const error = new VoiceError(
      'API key not configured',
      VoiceErrorCode.API_KEY_MISSING,
      false,
      'Voice conversations are not configured. Please contact support.'
    );

    expect(formatErrorMessage(error)).toBe(
      'Voice conversations are not configured. Please contact support.'
    );
  });

  it('formats API_AUTHENTICATION_FAILED error', () => {
    const error = new VoiceError(
      'Auth failed',
      VoiceErrorCode.API_AUTHENTICATION_FAILED,
      false,
      'Unable to connect to voice services. Please contact support.'
    );

    expect(formatErrorMessage(error)).toBe(
      'Unable to connect to voice services. Please contact support.'
    );
  });

  it('formats API_RATE_LIMIT error', () => {
    const error = new VoiceError(
      'Rate limit exceeded',
      VoiceErrorCode.API_RATE_LIMIT,
      true,
      'Voice services are temporarily busy. Please wait a moment and try again.'
    );

    expect(formatErrorMessage(error)).toBe(
      'Voice services are temporarily busy. Please wait a moment and try again.'
    );
  });

  it('formats NETWORK_ERROR error', () => {
    const error = new VoiceError(
      'Network failure',
      VoiceErrorCode.NETWORK_ERROR,
      true,
      'Connection lost. Retrying...'
    );

    expect(formatErrorMessage(error)).toBe('Connection lost. Retrying...');
  });

  it('formats TTS_SYNTHESIS_FAILED error', () => {
    const error = new VoiceError(
      'TTS failed',
      VoiceErrorCode.TTS_SYNTHESIS_FAILED,
      true,
      'Audio unavailable. Showing text response instead.'
    );

    expect(formatErrorMessage(error)).toBe(
      'Audio unavailable. Showing text response instead.'
    );
  });

  it('formats AUDIO_PLAYBACK_FAILED error', () => {
    const error = new VoiceError(
      'Playback failed',
      VoiceErrorCode.AUDIO_PLAYBACK_FAILED,
      true,
      'Unable to play audio. Showing text response instead.'
    );

    expect(formatErrorMessage(error)).toBe(
      'Unable to play audio. Showing text response instead.'
    );
  });

  it('formats BROWSER_NOT_SUPPORTED error', () => {
    const error = new VoiceError(
      'Browser incompatible',
      VoiceErrorCode.BROWSER_NOT_SUPPORTED,
      false,
      "Your browser doesn't support voice conversations. Please use Chrome 120+, Firefox 120+, Safari 17+, or Edge 120+."
    );

    expect(formatErrorMessage(error)).toBe(
      "Your browser doesn't support voice conversations. Please use Chrome 120+, Firefox 120+, Safari 17+, or Edge 120+."
    );
  });
});

describe('isRecoverableError', () => {
  describe('recoverable errors', () => {
    it('identifies SPEECH_RECOGNITION_FAILED as recoverable', () => {
      const error = new VoiceError(
        'Recognition failed',
        VoiceErrorCode.SPEECH_RECOGNITION_FAILED,
        true,
        'Try again'
      );

      expect(isRecoverableError(error)).toBe(true);
    });

    it('identifies API_RATE_LIMIT as recoverable', () => {
      const error = new VoiceError(
        'Rate limited',
        VoiceErrorCode.API_RATE_LIMIT,
        true,
        'Wait and retry'
      );

      expect(isRecoverableError(error)).toBe(true);
    });

    it('identifies NETWORK_ERROR as recoverable', () => {
      const error = new VoiceError(
        'Network issue',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Retrying'
      );

      expect(isRecoverableError(error)).toBe(true);
    });

    it('identifies TTS_SYNTHESIS_FAILED as recoverable', () => {
      const error = new VoiceError(
        'TTS failed',
        VoiceErrorCode.TTS_SYNTHESIS_FAILED,
        true,
        'Fallback available'
      );

      expect(isRecoverableError(error)).toBe(true);
    });

    it('identifies AUDIO_PLAYBACK_FAILED as recoverable', () => {
      const error = new VoiceError(
        'Playback failed',
        VoiceErrorCode.AUDIO_PLAYBACK_FAILED,
        true,
        'Text fallback'
      );

      expect(isRecoverableError(error)).toBe(true);
    });
  });

  describe('non-recoverable errors', () => {
    it('identifies MICROPHONE_PERMISSION_DENIED as non-recoverable', () => {
      const error = new VoiceError(
        'Permission denied',
        VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
        false,
        'Grant permission'
      );

      expect(isRecoverableError(error)).toBe(false);
    });

    it('identifies MICROPHONE_NOT_FOUND as non-recoverable', () => {
      const error = new VoiceError(
        'No mic',
        VoiceErrorCode.MICROPHONE_NOT_FOUND,
        false,
        'Connect microphone'
      );

      expect(isRecoverableError(error)).toBe(false);
    });

    it('identifies API_KEY_MISSING as non-recoverable', () => {
      const error = new VoiceError(
        'No API key',
        VoiceErrorCode.API_KEY_MISSING,
        false,
        'Configuration error'
      );

      expect(isRecoverableError(error)).toBe(false);
    });

    it('identifies API_AUTHENTICATION_FAILED as non-recoverable', () => {
      const error = new VoiceError(
        'Auth failed',
        VoiceErrorCode.API_AUTHENTICATION_FAILED,
        false,
        'Invalid credentials'
      );

      expect(isRecoverableError(error)).toBe(false);
    });

    it('identifies BROWSER_NOT_SUPPORTED as non-recoverable', () => {
      const error = new VoiceError(
        'Browser incompatible',
        VoiceErrorCode.BROWSER_NOT_SUPPORTED,
        false,
        'Upgrade browser'
      );

      expect(isRecoverableError(error)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('respects recoverable flag even with typically non-recoverable error code', () => {
      // Edge case: error code suggests non-recoverable, but flag says recoverable
      const error = new VoiceError(
        'Permission temporarily denied',
        VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
        true, // marked as recoverable
        'Try again'
      );

      expect(isRecoverableError(error)).toBe(true);
    });

    it('respects non-recoverable flag even with typically recoverable error code', () => {
      // Edge case: error code suggests recoverable, but flag says non-recoverable
      const error = new VoiceError(
        'Permanent network failure',
        VoiceErrorCode.NETWORK_ERROR,
        false, // marked as non-recoverable
        'Cannot recover'
      );

      expect(isRecoverableError(error)).toBe(false);
    });
  });
});
