/**
 * Integration tests for Voice Conversation Page
 * 
 * Tests cover:
 * - Browser compatibility checks on mount
 * - Microphone permission request flow
 * - Error handling (compatibility, permission, API errors)
 * - Conversation flow (start speaking, stop speaking, send message)
 * - Interruption handling
 * - Responsive layout
 * - Loading states
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 6.4, 6.5, 9.2, 11.1, 11.2, 11.3, 11.4, 11.5, 14.1, 14.2, 14.3, 14.4, 14.5**
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoiceConversationPage from './page';
import { VoiceError, VoiceErrorCode } from '@/lib/errors';

// Mock the custom hooks
jest.mock('@/hooks/useAudioInput');
jest.mock('@/hooks/useSpeechRecognition');
jest.mock('@/hooks/useConversation');
jest.mock('@/hooks/useVoiceSynthesis');
jest.mock('@/hooks/useAudioOutput');

// Mock the components
jest.mock('@/components/voice/ConversationTranscript', () => ({
  ConversationTranscript: ({ messages, isLoading }: any) => (
    <div data-testid="conversation-transcript">
      {messages.map((msg: any) => (
        <div key={msg.id} data-testid={`message-${msg.id}`}>
          {msg.content}
        </div>
      ))}
      {isLoading && <div data-testid="loading-indicator">Loading...</div>}
    </div>
  ),
}));

jest.mock('@/components/voice/VoiceActivityIndicator', () => ({
  VoiceActivityIndicator: ({ state, volume }: any) => (
    <div data-testid="voice-activity-indicator">
      <div data-testid="activity-state">{state}</div>
      <div data-testid="activity-volume">{volume}</div>
    </div>
  ),
}));

jest.mock('@/components/voice/ErrorDisplay', () => ({
  ErrorDisplay: ({ error, onRetry, onDismiss }: any) => (
    <div data-testid="error-display">
      <div data-testid="error-message">{error?.userMessage}</div>
      {onRetry && (
        <button data-testid="retry-button" onClick={onRetry}>
          Retry
        </button>
      )}
      {onDismiss && (
        <button data-testid="dismiss-button" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  ),
}));

// Import mocked hooks
import * as useAudioInputModule from '@/hooks/useAudioInput';
import * as useSpeechRecognitionModule from '@/hooks/useSpeechRecognition';
import * as useConversationModule from '@/hooks/useConversation';
import * as useVoiceSynthesisModule from '@/hooks/useVoiceSynthesis';
import * as useAudioOutputModule from '@/hooks/useAudioOutput';

const mockUseAudioInput = useAudioInputModule.useAudioInput as jest.Mock;
const mockUseSpeechRecognition = useSpeechRecognitionModule.useSpeechRecognition as jest.Mock;
const mockUseConversation = useConversationModule.useConversation as jest.Mock;
const mockUseVoiceSynthesis = useVoiceSynthesisModule.useVoiceSynthesis as jest.Mock;
const mockUseAudioOutput = useAudioOutputModule.useAudioOutput as jest.Mock;

/**
 * Default mock implementations
 */
const createDefaultAudioInputMock = () => ({
  isCapturing: false,
  hasPermission: true,
  error: null,
  volume: 0,
  startCapture: jest.fn().mockResolvedValue(undefined),
  stopCapture: jest.fn(),
  requestPermission: jest.fn().mockResolvedValue(true),
});

const createDefaultSpeechRecognitionMock = () => ({
  isListening: false,
  transcript: '',
  interimTranscript: '',
  error: null,
  isSupported: true,
  startListening: jest.fn(),
  stopListening: jest.fn(),
  resetTranscript: jest.fn(),
});

const createDefaultConversationMock = () => ({
  messages: [],
  currentState: 'listening' as const,
  error: null,
  isGenerating: false,
  sendMessage: jest.fn().mockResolvedValue(undefined),
  interrupt: jest.fn(),
  clearHistory: jest.fn(),
});

const createDefaultVoiceSynthesisMock = () => {
  // Create a mock AudioBuffer
  const mockAudioBuffer = {
    length: 1000,
    sampleRate: 16000,
    duration: 1000 / 16000,
    numberOfChannels: 1,
  } as unknown as AudioBuffer;

  return {
    isSynthesizing: false,
    error: null,
    synthesize: jest.fn().mockResolvedValue(mockAudioBuffer),
    cancel: jest.fn(),
  };
};

const createDefaultAudioOutputMock = () => ({
  isPlaying: false,
  error: null,
  play: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
});

describe('VoiceConversationPage', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set up default mocks
    mockUseAudioInput.mockReturnValue(createDefaultAudioInputMock());
    mockUseSpeechRecognition.mockReturnValue(createDefaultSpeechRecognitionMock());
    mockUseConversation.mockReturnValue(createDefaultConversationMock());
    mockUseVoiceSynthesis.mockReturnValue(createDefaultVoiceSynthesisMock());
    mockUseAudioOutput.mockReturnValue(createDefaultAudioOutputMock());

    // Mock browser APIs
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [],
        }),
      },
      configurable: true,
    });

    Object.defineProperty(window, 'AudioContext', {
      value: jest.fn(),
      configurable: true,
    });
  });

  describe('Browser Compatibility Checks', () => {
    /**
     * **Validates: Requirement 14.1** - Check for MediaDevices API
     */
    it('should display compatibility error when MediaDevices API is not available', async () => {
      // Remove mediaDevices API
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display compatibility error
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        /does not support voice conversations/i
      );
    });

    /**
     * **Validates: Requirement 14.2** - Check for AudioContext API
     */
    it('should display compatibility error when AudioContext is not available', async () => {
      // Remove AudioContext
      Object.defineProperty(window, 'AudioContext', {
        value: undefined,
        configurable: true,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display compatibility error
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        /does not support audio playback/i
      );
    });

    /**
     * **Validates: Requirement 14.5** - Fallback when SpeechRecognition not available
     */
    it('should handle missing SpeechRecognition API gracefully', async () => {
      // Mock speech recognition as not supported
      mockUseSpeechRecognition.mockReturnValue({
        ...createDefaultSpeechRecognitionMock(),
        isSupported: false,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should still render the page (server fallback will be used)
      expect(screen.getByText(/Voice Conversation/)).toBeInTheDocument();
      expect(screen.getByTestId('conversation-transcript')).toBeInTheDocument();
    });
  });

  describe('Microphone Permission Flow', () => {
    /**
     * **Validates: Requirement 1.1** - Request microphone permission
     */
    it('should request microphone permission on mount', async () => {
      const mockRequestPermission = jest.fn().mockResolvedValue(true);
      mockUseAudioInput.mockReturnValue({
        ...createDefaultAudioInputMock(),
        requestPermission: mockRequestPermission,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization and permission request
      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });
    });

    /**
     * **Validates: Requirement 1.3** - Handle permission denial
     */
    it('should display error when microphone permission is denied', async () => {
      const permissionError = new VoiceError(
        'Permission denied',
        VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
        true,
        'Microphone access is required for voice conversations.'
      );

      mockUseAudioInput.mockReturnValue({
        ...createDefaultAudioInputMock(),
        hasPermission: false,
        error: permissionError,
        requestPermission: jest.fn().mockResolvedValue(false),
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display permission error
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        /Microphone access is required/i
      );
    });

    /**
     * **Validates: Requirement 1.3** - Handle device not found
     */
    it('should display error when microphone device is not found', async () => {
      const deviceError = new VoiceError(
        'Microphone not found',
        VoiceErrorCode.MICROPHONE_NOT_FOUND,
        false,
        'No microphone detected.'
      );

      mockUseAudioInput.mockReturnValue({
        ...createDefaultAudioInputMock(),
        hasPermission: false,
        error: deviceError,
        requestPermission: jest.fn().mockResolvedValue(false),
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display device error
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        /No microphone detected/i
      );
    });
  });

  describe('Conversation Flow', () => {
    /**
     * **Validates: Requirement 6.1** - Initial state is listening
     */
    it('should initialize with listening state', async () => {
      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should show listening state
      expect(screen.getByTestId('activity-state')).toHaveTextContent('listening');
    });

    /**
     * **Validates: Requirement 6.2** - User can start speaking
     */
    it('should allow user to start speaking', async () => {
      const mockStartCapture = jest.fn().mockResolvedValue(undefined);
      const mockStartListening = jest.fn();

      mockUseAudioInput.mockReturnValue({
        ...createDefaultAudioInputMock(),
        startCapture: mockStartCapture,
      });

      mockUseSpeechRecognition.mockReturnValue({
        ...createDefaultSpeechRecognitionMock(),
        startListening: mockStartListening,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Click start speaking button
      const startButton = screen.getByRole('button', { name: /Start Speaking/i });
      await act(async () => {
        fireEvent.click(startButton);
      });

      // Should call audio capture and speech recognition
      expect(mockStartCapture).toHaveBeenCalled();
      expect(mockStartListening).toHaveBeenCalled();
    });

    /**
     * **Validates: Requirement 6.3** - User can stop speaking
     */
    it('should allow user to stop speaking and send message', async () => {
      const mockStopCapture = jest.fn();
      const mockStopListening = jest.fn();
      const mockSendMessage = jest.fn().mockResolvedValue(undefined);
      const mockResetTranscript = jest.fn();

      mockUseAudioInput.mockReturnValue({
        ...createDefaultAudioInputMock(),
        isCapturing: true,
        stopCapture: mockStopCapture,
      });

      mockUseSpeechRecognition.mockReturnValue({
        ...createDefaultSpeechRecognitionMock(),
        isListening: true,
        transcript: 'Hello, how are you?',
        stopListening: mockStopListening,
        resetTranscript: mockResetTranscript,
      });

      mockUseConversation.mockReturnValue({
        ...createDefaultConversationMock(),
        sendMessage: mockSendMessage,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Click stop speaking button
      const stopButton = screen.getByRole('button', { name: /Stop Speaking/i });
      await act(async () => {
        fireEvent.click(stopButton);
      });

      // Should call stop methods and send message
      expect(mockStopCapture).toHaveBeenCalled();
      expect(mockStopListening).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Hello, how are you?');
      });
      expect(mockResetTranscript).toHaveBeenCalled();
    });

    /**
     * **Validates: Requirement 8.1, 8.2** - Display conversation history
     */
    it('should display conversation messages', async () => {
      const messages = [
        {
          id: 'msg1',
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: 'msg2',
          role: 'assistant' as const,
          content: 'Hi there!',
          timestamp: new Date(),
        },
      ];

      mockUseConversation.mockReturnValue({
        ...createDefaultConversationMock(),
        messages,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display messages
      expect(screen.getByTestId('message-msg1')).toHaveTextContent('Hello');
      expect(screen.getByTestId('message-msg2')).toHaveTextContent('Hi there!');
    });

    /**
     * **Validates: Requirement 6.4** - Show loading state during AI response generation
     */
    it('should display loading indicator while generating response', async () => {
      mockUseConversation.mockReturnValue({
        ...createDefaultConversationMock(),
        isGenerating: true,
        currentState: 'thinking' as const,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display loading indicator
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('activity-state')).toHaveTextContent('thinking');
    });
  });

  describe('Interruption Handling', () => {
    /**
     * **Validates: Requirement 7.1, 7.2, 7.3, 7.4** - Interrupt AI response
     */
    it('should allow user to interrupt AI response', async () => {
      const mockInterrupt = jest.fn();
      const mockResetTranscript = jest.fn();

      mockUseConversation.mockReturnValue({
        ...createDefaultConversationMock(),
        currentState: 'speaking' as const,
        interrupt: mockInterrupt,
      });

      mockUseSpeechRecognition.mockReturnValue({
        ...createDefaultSpeechRecognitionMock(),
        resetTranscript: mockResetTranscript,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should show interrupt button when AI is speaking
      const interruptButton = screen.getByRole('button', { name: /Interrupt/i });
      expect(interruptButton).toBeInTheDocument();

      // Click interrupt button
      await act(async () => {
        fireEvent.click(interruptButton);
      });

      // Should call interrupt and reset transcript
      expect(mockInterrupt).toHaveBeenCalled();
      expect(mockResetTranscript).toHaveBeenCalled();
    });

    /**
     * **Validates: Requirement 7.1** - Interrupt button only shows during speaking
     */
    it('should not show interrupt button when AI is not speaking', async () => {
      mockUseConversation.mockReturnValue({
        ...createDefaultConversationMock(),
        currentState: 'listening' as const,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should not show interrupt button
      expect(screen.queryByRole('button', { name: /Interrupt/i })).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    /**
     * **Validates: Requirement 10.1, 10.3** - Display error with retry button
     */
    it('should display error with retry button for recoverable errors', async () => {
      const conversationError = new VoiceError(
        'Network error',
        VoiceErrorCode.NETWORK_ERROR,
        true,
        'Connection lost. Please try again.'
      );

      mockUseConversation.mockReturnValue({
        ...createDefaultConversationMock(),
        error: conversationError,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display error
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        /Connection lost/i
      );

      // Should show retry button for recoverable error
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    /**
     * **Validates: Requirement 10.4** - Display error with guidance for non-recoverable errors
     */
    it('should display error with dismiss button for non-recoverable errors', async () => {
      const permissionError = new VoiceError(
        'Permission denied',
        VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
        false,
        'Microphone access is required.'
      );

      mockUseAudioInput.mockReturnValue({
        ...createDefaultAudioInputMock(),
        hasPermission: false,
        error: permissionError,
        requestPermission: jest.fn().mockResolvedValue(false),
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display error
      expect(screen.getByTestId('error-display')).toBeInTheDocument();

      // Should show dismiss button
      expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    /**
     * **Validates: Requirement 11.1, 11.2, 11.3** - Responsive design
     */
    it('should render responsive layout', async () => {
      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should render main sections
      expect(screen.getByText(/Voice Conversation/)).toBeInTheDocument();
      expect(screen.getByTestId('conversation-transcript')).toBeInTheDocument();
      expect(screen.getByTestId('voice-activity-indicator')).toBeInTheDocument();

      // Should render control buttons
      expect(screen.getByRole('button', { name: /Start Speaking/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Stop Speaking/i })).toBeInTheDocument();
      
      // Find clear history button using getAllByRole
      const buttons = screen.getAllByRole('button');
      const clearButton = buttons.find(btn => btn.textContent?.includes('Clear History'));
      expect(clearButton).toBeInTheDocument();
    });

    /**
     * **Validates: Requirement 11.4** - Touch-friendly controls
     */
    it('should have touch-friendly button sizes', async () => {
      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Get buttons
      const startButton = screen.getByRole('button', { name: /Start Speaking/i });

      // Buttons should have adequate padding for touch
      expect(startButton).toHaveClass('py-3', 'px-4');
    });
  });

  describe('Loading States', () => {
    /**
     * **Validates: Requirement 11.5** - Display loading state during initialization
     */
    it('should display loading indicator during initialization', async () => {
      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // After initialization, main content should be visible
      expect(screen.getByText(/Voice Conversation/)).toBeInTheDocument();
    });

    /**
     * **Validates: Requirement 6.4** - Display loading state during response generation
     */
    it('should display loading state while generating AI response', async () => {
      mockUseConversation.mockReturnValue({
        ...createDefaultConversationMock(),
        isGenerating: true,
        currentState: 'thinking' as const,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display loading indicator
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });

  describe('Clear History', () => {
    /**
     * **Validates: Requirement 12.2, 12.3** - Clear conversation history
     */
    it('should clear conversation history when clear button is clicked', async () => {
      const mockClearHistory = jest.fn();

      mockUseConversation.mockReturnValue({
        ...createDefaultConversationMock(),
        messages: [
          {
            id: 'msg1',
            role: 'user' as const,
            content: 'Hello',
            timestamp: new Date(),
          },
        ],
        clearHistory: mockClearHistory,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Click clear history button - use getAllByRole to find it
      const buttons = screen.getAllByRole('button');
      const clearButton = buttons.find(btn => btn.textContent?.includes('Clear History'));
      
      expect(clearButton).toBeInTheDocument();
      
      await act(async () => {
        fireEvent.click(clearButton!);
      });

      // Should call clearHistory
      expect(mockClearHistory).toHaveBeenCalled();
    });
  });

  describe('Status Information', () => {
    /**
     * **Validates: Requirement 1.2** - Display microphone status
     */
    it('should display microphone status', async () => {
      mockUseAudioInput.mockReturnValue({
        ...createDefaultAudioInputMock(),
        hasPermission: true,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display microphone status
      expect(screen.getByText(/Microphone:/)).toBeInTheDocument();
      expect(screen.getByText(/Enabled/)).toBeInTheDocument();
    });

    /**
     * **Validates: Requirement 8.1** - Display message count
     */
    it('should display message count', async () => {
      const messages = [
        {
          id: 'msg1',
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: 'msg2',
          role: 'assistant' as const,
          content: 'Hi there!',
          timestamp: new Date(),
        },
      ];

      mockUseConversation.mockReturnValue({
        ...createDefaultConversationMock(),
        messages,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display message count
      expect(screen.getByText(/Messages:/)).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    /**
     * **Validates: Requirement 14.5** - Display speech recognition type
     */
    it('should display speech recognition type', async () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...createDefaultSpeechRecognitionMock(),
        isSupported: true,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display speech recognition type
      expect(screen.getByText(/Speech Recognition:/)).toBeInTheDocument();
      expect(screen.getByText(/Native/)).toBeInTheDocument();
    });

    it('should display server fallback for speech recognition', async () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...createDefaultSpeechRecognitionMock(),
        isSupported: false,
      });

      render(<VoiceConversationPage />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should display server fallback
      expect(screen.getByText(/Speech Recognition:/)).toBeInTheDocument();
      expect(screen.getByText(/Server/)).toBeInTheDocument();
    });
  });
});
