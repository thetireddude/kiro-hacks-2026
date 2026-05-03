# Implementation Plan: Voice Conversation Page

## Overview

This implementation plan breaks down the voice-first conversation interface into discrete, actionable coding tasks. The feature enables full-duplex natural conversations using OpenAI's APIs with real-time speech recognition, AI response generation, and text-to-speech synthesis.

The implementation follows a bottom-up approach: starting with foundational utilities and types, building custom hooks for audio and conversation management, creating React components for the UI, implementing API routes for OpenAI integration, and finally wiring everything together with integration testing.

## Tasks

### Phase 1: Foundation and Type Definitions

- [x] 1. Set up project structure and core type definitions
  - Create directory structure: `app/voice/`, `components/voice/`, `hooks/`, `lib/voice/`, `lib/audio/`
  - Define core types in `lib/voice/types.ts`: `ConversationMessage`, `ConversationState`, `VoiceActivity`, `AudioConfig`, `TTSVoice`, `SpeechRecognitionResult`, `ApiResponse`
  - Define error types in `lib/errors.ts`: `VoiceError`, `VoiceErrorCode` enum, error utility functions
  - Set up environment variable types for OpenAI configuration
  - _Requirements: 9.1, 9.3, 9.4_

- [x] 1.1 Write unit tests for error handling utilities
  - Test `formatErrorMessage` for all error codes
  - Test `isRecoverableError` classification
  - Test `VoiceError` construction and properties
  - _Requirements: 10.1, 10.4_

### Phase 2: Utility Functions

- [x] 2. Implement audio processing utilities
  - [x] 2.1 Create audio processor functions in `lib/audio/processor.ts`
    - Implement `calculateVolume` to compute volume from audio data
    - Implement `detectVoiceActivity` for voice activity detection
    - Implement `prepareAudioForTranscription` for audio format conversion
    - _Requirements: 1.4, 13.1_
  
  - [x] 2.2 Write unit tests for audio processing
    - Test `calculateVolume` with silent, normal, and loud audio
    - Test `detectVoiceActivity` with various threshold values
    - Test `prepareAudioForTranscription` format conversion
    - _Requirements: 1.4_

- [x] 3. Implement retry logic utility
  - [x] 3.1 Create retry function in `lib/retry.ts`
    - Implement `retryWithBackoff` with exponential backoff
    - Support configurable max attempts, base delay, max delay, and backoff multiplier
    - _Requirements: 2.4, 4.4, 10.3_
  
  - [x] 3.2 Write unit tests for retry logic
    - Test immediate success (no retry)
    - Test retry on failure with eventual success
    - Test max attempts exceeded
    - Test exponential backoff timing
    - _Requirements: 2.4, 4.4_

### Phase 3: Custom Hooks - Audio Input

- [x] 4. Implement audio input hook
  - [x] 4.1 Create `useAudioInput` hook in `hooks/useAudioInput.ts`
    - Manage MediaStream lifecycle with `getUserMedia`
    - Implement permission request and tracking
    - Implement audio capture start/stop
    - Calculate volume levels for visualization
    - Handle microphone errors (permission denied, device not found)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 13.1_
  
  - [x] 4.2 Write integration tests for useAudioInput
    - Mock `navigator.mediaDevices.getUserMedia`
    - Test permission request flow
    - Test audio capture start/stop
    - Test permission denial handling
    - Test device not found handling
    - _Requirements: 1.1, 1.2, 1.3_

### Phase 4: Custom Hooks - Speech Recognition

- [x] 5. Implement speech recognition hook
  - [x] 5.1 Create `useSpeechRecognition` hook in `hooks/useSpeechRecognition.ts`
    - Implement browser Web Speech API integration (primary)
    - Implement fallback to `/api/transcribe` when browser API unavailable
    - Handle continuous recognition with interim and final results
    - Implement retry logic with exponential backoff
    - Handle recognition errors and provide clear error states
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 14.5_
  
  - [x] 5.2 Write integration tests for useSpeechRecognition
    - Mock `SpeechRecognition` API
    - Test continuous recognition
    - Test interim and final results
    - Test fallback to server API
    - Test error handling and retry logic
    - _Requirements: 2.1, 2.2, 2.4_

### Phase 5: Custom Hooks - Voice Synthesis

- [x] 6. Implement voice synthesis hook
  - [x] 6.1 Create `useVoiceSynthesis` hook in `hooks/useVoiceSynthesis.ts`
    - Call `/api/tts` with text for OpenAI TTS synthesis
    - Stream audio data as it becomes available
    - Implement retry logic with exponential backoff
    - Handle synthesis errors with fallback to text display
    - Support cancellation of in-progress synthesis
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 6.2 Write integration tests for useVoiceSynthesis
    - Mock fetch for `/api/tts` endpoint
    - Test successful synthesis
    - Test retry logic on failure
    - Test cancellation
    - Test error handling
    - _Requirements: 4.1, 4.4, 4.5_

### Phase 6: Custom Hooks - Audio Output

- [x] 7. Implement audio output hook
  - [x] 7.1 Create `useAudioOutput` hook in `hooks/useAudioOutput.ts`
    - Play audio buffers using HTML5 Audio API
    - Manage playback state (playing, paused, stopped)
    - Prevent overlapping audio playback
    - Detect and handle interruptions
    - Notify on playback completion and interruption via callbacks
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3_
  
  - [x] 7.2 Write integration tests for useAudioOutput
    - Mock `Audio` constructor and methods
    - Test audio playback
    - Test interruption detection
    - Test playback completion callback
    - Test error handling
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

### Phase 7: Custom Hooks - Conversation Management

- [x] 8. Implement conversation management hook
  - [x] 8.1 Create `useConversation` hook in `hooks/useConversation.ts`
    - Maintain conversation history (max 50 messages)
    - Implement `sendMessage` to call `/api/chat` with message and history
    - Manage conversation state transitions: listening → processing → thinking → speaking → listening
    - Implement `interrupt` to cancel pending requests and stop audio
    - Implement `clearHistory` to reset conversation
    - Coordinate with voice synthesis hook for TTS
    - Handle conversation errors with retry support
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 6.4, 7.4, 12.1, 12.5_
  
  - [x] 8.2 Write integration tests for useConversation
    - Mock `/api/chat` endpoint
    - Test message sending and history management
    - Test conversation state transitions
    - Test interruption handling
    - Test history limit (50 messages)
    - Test error handling and retry
    - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.2, 12.1, 12.5_

### Phase 8: API Routes

- [x] 9. Implement transcription API route
  - [x] 9.1 Create `/api/transcribe` route in `app/api/transcribe/route.ts`
    - Accept audio blob and optional language hint
    - Validate audio data format
    - Call OpenAI Whisper API for speech-to-text
    - Implement retry logic with exponential backoff
    - Return transcribed text or error response
    - Use `OPENAI_API_KEY` from environment variables
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 9.3, 9.5_
  
  - [x] 9.2 Write integration tests for transcription API
    - Mock OpenAI client
    - Test successful transcription
    - Test error handling
    - Test retry logic
    - Test invalid audio format handling
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [x] 10. Implement chat API route
  - [x] 10.1 Create `/api/chat` route in `app/api/chat/route.ts`
    - Accept user message and conversation history
    - Validate request data
    - Format conversation history for OpenAI Chat Completions API
    - Call OpenAI Chat Completions API
    - Return AI response text or error response
    - Use `OPENAI_API_KEY` from environment variables
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.1, 9.3, 9.5_
  
  - [x] 10.2 Write integration tests for chat API
    - Mock OpenAI client
    - Test successful response generation
    - Test conversation context handling
    - Test error handling
    - Test rate limiting scenarios
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 11. Implement TTS API route
  - [x] 11.1 Create `/api/tts` route in `app/api/tts/route.ts`
    - Accept text, optional voice selection, and optional speed
    - Validate text input
    - Call OpenAI TTS API for speech synthesis
    - Stream audio data back to client
    - Implement retry logic with exponential backoff
    - Return audio in mp3 format
    - Use `OPENAI_API_KEY` from environment variables
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 9.1, 9.3, 9.5, 15.4_
  
  - [x] 11.2 Write integration tests for TTS API
    - Mock OpenAI client
    - Test successful synthesis
    - Test audio streaming
    - Test error handling
    - Test different voice options
    - Test speed parameter
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

### Phase 9: React Components - UI Elements

- [-] 12. Implement voice activity indicator component
  - [x] 12.1 Create `VoiceActivityIndicator` in `components/voice/VoiceActivityIndicator.tsx`
    - Display animated indicator for current conversation state
    - Show volume levels during listening state
    - Provide distinct visual feedback for: listening, processing, thinking, speaking
    - Use animated visual elements (consider Motion Primitives or Magic UI for animations)
    - Style with Tailwind CSS
    - _Requirements: 6.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [-] 13. Implement conversation transcript component
  - [x] 13.1 Create `ConversationTranscript` in `components/voice/ConversationTranscript.tsx`
    - Display message history with user and AI messages
    - Show timestamps for each message
    - Visually distinguish user vs AI messages
    - Auto-scroll to latest message
    - Handle loading states
    - Style with Tailwind CSS for responsive design
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 11.1, 11.2, 11.3_

- [-] 14. Implement error display component
  - [x] 14.1 Create `ErrorDisplay` in `components/voice/ErrorDisplay.tsx`
    - Display user-friendly error messages
    - Provide retry button when error is recoverable
    - Provide dismiss button for non-blocking errors
    - Show resolution guidance for non-recoverable errors
    - Style with Tailwind CSS
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

### Phase 10: Main Page Component

- [-] 15. Implement voice conversation page
  - [x] 15.1 Create main page component in `app/voice/page.tsx`
    - Check browser compatibility on mount (MediaDevices, SpeechRecognition, AudioContext)
    - Request microphone permissions
    - Orchestrate all custom hooks: `useAudioInput`, `useSpeechRecognition`, `useConversation`, `useVoiceSynthesis`, `useAudioOutput`
    - Render `VoiceActivityIndicator`, `ConversationTranscript`, and `ErrorDisplay` components
    - Handle browser compatibility errors
    - Handle permission errors
    - Display loading states during initialization
    - Implement responsive layout with Tailwind CSS
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 6.4, 6.5, 9.2, 11.1, 11.2, 11.3, 11.4, 11.5, 14.1, 14.2, 14.3, 14.4, 14.5_

### Phase 11: Integration and Wiring

- [-] 16. Wire conversation flow end-to-end
  - [x] 16.1 Implement complete conversation flow
    - Connect audio input → speech recognition → conversation manager → chat API
    - Connect chat API response → voice synthesis → audio output
    - Implement turn-taking state management throughout the flow
    - Ensure proper error propagation and handling at each step
    - Verify conversation history persistence during session
    - _Requirements: 1.4, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 5.1, 6.1, 6.2, 6.3, 6.4, 12.1_

- [x] 17. Implement interruption handling
  - [x] 17.1 Wire interruption flow
    - Detect user speech during AI audio playback
    - Stop audio playback immediately on interruption
    - Cancel pending AI response generation
    - Transfer control back to user (set state to listening)
    - Preserve conversation history up to interruption point
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 18. Checkpoint - Ensure all tests pass
  - Run all unit tests and verify they pass
  - Run all integration tests and verify they pass
  - Test the complete conversation flow manually in browser
  - Verify error handling works for common scenarios
  - Ask the user if questions arise

### Phase 12: Testing and Validation

- [-] 19. Write end-to-end tests for critical flows
  - [~] 19.1 Write E2E test for happy path conversation
    - User grants microphone permission
    - User speaks a message
    - Transcribed text appears
    - AI thinking indicator shows
    - AI response is heard
    - Conversation history updates
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1, 6.1, 8.1_
  
  - [~] 19.2 Write E2E test for interruption flow
    - User speaks and gets AI response
    - AI starts speaking
    - User interrupts by speaking
    - AI stops immediately
    - User's new message is processed
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [~] 19.3 Write E2E test for error recovery
    - Simulate network error during API call
    - Error message displayed with retry button
    - User clicks retry
    - Request succeeds
    - Conversation continues
    - _Requirements: 10.1, 10.2, 10.3_

- [-] 20. Create manual testing checklist
  - Document browser compatibility testing steps (Chrome, Firefox, Safari, Edge)
  - Document device testing steps (desktop, laptop, mobile, tablet)
  - Document network condition testing (fast, slow, intermittent)
  - Document audio quality testing steps
  - Document edge case testing scenarios
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 15.1, 15.2, 15.3, 15.4_

### Phase 13: Final Validation

- [-] 21. Performance optimization and validation
  - [~] 21.1 Verify latency targets
    - Measure speech recognition latency (target: <500ms)
    - Measure AI response generation latency (target: <2s)
    - Measure TTS synthesis latency (target: <500ms)
    - Measure audio playback latency (target: <200ms)
    - Measure total turn latency (target: <3s)
    - Optimize any bottlenecks found
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 22. Final checkpoint - Complete system validation
  - Verify all API routes are working correctly
  - Verify all error scenarios are handled gracefully
  - Verify browser compatibility across target browsers
  - Verify responsive design on mobile and desktop
  - Verify conversation session management works correctly
  - Test with real OpenAI API (not mocks)
  - Ensure all tests pass
  - Ask the user if questions arise or if ready for deployment

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints (tasks 18, 22) ensure incremental validation and provide opportunities for user feedback
- The implementation follows a bottom-up approach: utilities → hooks → components → page → integration
- All OpenAI API calls go through server-side routes to protect API keys
- Browser compatibility is checked at runtime with clear error messages for unsupported browsers
- The design uses TypeScript throughout for type safety
- Styling uses Tailwind CSS v4 utility classes exclusively
- Animation components should leverage Motion Primitives or Magic UI per project guidelines
