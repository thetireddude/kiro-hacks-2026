# Design Document: Voice Conversation Page

## Overview

The Voice Conversation Page provides a full-duplex, voice-first conversational interface for the New News hackathon prototype. This feature enables users to have natural spoken conversations with an AI agent about news topics, similar to ChatGPT's voice mode.

### Key Capabilities

- **Real-time voice input**: Continuous audio capture from the user's microphone with browser-based speech recognition
- **AI conversation**: Context-aware response generation using OpenAI's chat completion API
- **Natural voice output**: Text-to-speech synthesis using OpenAI's TTS API with streaming audio playback
- **Turn-taking management**: Clear visual and behavioral indicators for conversation flow
- **Interruption support**: Users can interrupt AI responses naturally by speaking
- **Conversation history**: Visual transcript with timestamps and role differentiation
- **Error resilience**: Retry logic, fallback mechanisms, and clear error messaging

### Design Principles

1. **Voice-first, text-visible**: Optimize for spoken interaction while maintaining a readable transcript
2. **Low latency**: Minimize delays between user speech and AI response to maintain conversational flow
3. **Progressive enhancement**: Gracefully degrade when browser APIs are unavailable
4. **Security-first**: All OpenAI API calls through server-side routes; no client-side API key exposure
5. **Responsive design**: Support both mobile and desktop with touch-friendly controls

## Architecture

### System Components

```mermaid
graph TB
    subgraph Client["Client Layer (Browser)"]
        UI[Voice Conversation UI]
        AudioIn[Audio Input Handler]
        AudioOut[Audio Output Handler]
        STT[Speech Recognition]
        ConvMgr[Conversation Manager]
        TurnCtrl[Turn-Taking Controller]
        IntHandler[Interruption Handler]
    end
    
    subgraph Server["Server Layer (Next.js API Routes)"]
        TranscribeAPI[/api/transcribe]
        ChatAPI[/api/chat]
        TTSAPI[/api/tts]
    end
    
    subgraph External["External Services"]
        OpenAI[OpenAI API]
    end
    
    UI --> AudioIn
    UI --> AudioOut
    UI --> ConvMgr
    AudioIn --> STT
    STT --> ConvMgr
    ConvMgr --> TurnCtrl
    ConvMgr --> ChatAPI
    ConvMgr --> TTSAPI
    AudioOut --> IntHandler
    IntHandler --> TurnCtrl
    
    TranscribeAPI --> OpenAI
    ChatAPI --> OpenAI
    TTSAPI --> OpenAI
    
    STT -.fallback.-> TranscribeAPI
```

### Component Responsibilities

#### Client Components

**VoiceConversationPage** (`app/voice/page.tsx`)
- Root page component orchestrating the voice conversation interface
- Manages overall application state and coordinates child components
- Handles browser compatibility checks and permission requests
- Displays error states and loading indicators

**AudioInputHandler** (hook: `useAudioInput`)
- Captures microphone audio using Web Audio API
- Manages MediaStream lifecycle and permissions
- Detects voice activity for turn-taking
- Provides audio data to speech recognition

**SpeechRecognitionService** (hook: `useSpeechRecognition`)
- Primary: Uses browser's Web Speech API (SpeechRecognition)
- Fallback: Sends audio chunks to `/api/transcribe` for OpenAI Whisper processing
- Handles continuous recognition with interim results
- Implements retry logic with exponential backoff

**ConversationManager** (hook: `useConversation`)
- Maintains conversation history (messages array)
- Sends user messages to `/api/chat` for AI response generation
- Manages conversation context (last 50 messages)
- Coordinates between speech recognition and TTS synthesis

**VoiceSynthesisService** (hook: `useVoiceSynthesis`)
- Sends AI text responses to `/api/tts` for OpenAI TTS synthesis
- Streams audio data as it becomes available
- Implements retry logic with exponential backoff
- Provides fallback to text display on synthesis failure

**AudioOutputHandler** (hook: `useAudioOutput`)
- Plays synthesized audio using HTML5 Audio API
- Manages audio playback queue
- Prevents overlapping audio playback
- Notifies turn-taking controller on playback completion

**TurnTakingController** (state management in `useConversation`)
- Tracks current conversation state: `listening`, `processing`, `thinking`, `speaking`
- Provides visual indicators for each state
- Manages transitions between states
- Coordinates with interruption handler

**InterruptionHandler** (integrated in `useAudioOutput` and `useConversation`)
- Detects user speech during AI playback
- Immediately stops audio playback
- Cancels pending AI response generation
- Transfers control back to user

#### Server Components

**Transcription API Route** (`app/api/transcribe/route.ts`)
- Receives audio data from client (fallback path)
- Calls OpenAI Whisper API for speech-to-text
- Returns transcribed text
- Implements rate limiting and error handling

**Chat API Route** (`app/api/chat/route.ts`)
- Receives user message and conversation history
- Calls OpenAI Chat Completions API
- Returns AI-generated response
- Maintains conversation context

**TTS API Route** (`app/api/tts/route.ts`)
- Receives text from AI response
- Calls OpenAI TTS API for speech synthesis
- Streams audio data back to client
- Supports multiple voice options

### Data Flow

#### User Speech → AI Response Flow

1. User speaks → AudioInputHandler captures audio
2. SpeechRecognitionService transcribes speech (browser API or fallback to `/api/transcribe`)
3. ConversationManager receives transcribed text
4. ConversationManager sends message + history to `/api/chat`
5. Chat API returns AI response text
6. ConversationManager adds response to history
7. VoiceSynthesisService sends text to `/api/tts`
8. TTS API streams audio back
9. AudioOutputHandler plays audio
10. TurnTakingController updates state throughout

#### Interruption Flow

1. User starts speaking while AI is playing audio
2. AudioInputHandler detects voice activity
3. InterruptionHandler triggers
4. AudioOutputHandler stops playback immediately
5. ConversationManager cancels pending requests
6. TurnTakingController sets state to `listening`
7. Normal flow resumes from step 2

## Components and Interfaces

### React Components

#### VoiceConversationPage

```typescript
// app/voice/page.tsx
export default function VoiceConversationPage(): JSX.Element

// Responsibilities:
// - Check browser compatibility
// - Request microphone permissions
// - Render conversation UI
// - Display error states
```

#### ConversationTranscript

```typescript
// components/voice/ConversationTranscript.tsx
interface ConversationTranscriptProps {
  messages: ConversationMessage[]
  isLoading: boolean
}

export function ConversationTranscript(props: ConversationTranscriptProps): JSX.Element

// Responsibilities:
// - Display message history
// - Auto-scroll to latest message
// - Show timestamps
// - Differentiate user vs AI messages
```

#### VoiceActivityIndicator

```typescript
// components/voice/VoiceActivityIndicator.tsx
interface VoiceActivityIndicatorProps {
  state: ConversationState
  volume?: number
}

export function VoiceActivityIndicator(props: VoiceActivityIndicatorProps): JSX.Element

// Responsibilities:
// - Display animated indicator for current state
// - Show volume levels during listening
// - Provide visual feedback for all states
```

#### ErrorDisplay

```typescript
// components/voice/ErrorDisplay.tsx
interface ErrorDisplayProps {
  error: VoiceError | null
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorDisplay(props: ErrorDisplayProps): JSX.Element

// Responsibilities:
// - Display user-friendly error messages
// - Provide retry button when applicable
// - Show resolution guidance
```

### Custom Hooks

#### useAudioInput

```typescript
// hooks/useAudioInput.ts
interface AudioInputState {
  isCapturing: boolean
  hasPermission: boolean
  error: Error | null
  volume: number
}

interface AudioInputActions {
  startCapture: () => Promise<void>
  stopCapture: () => void
  requestPermission: () => Promise<boolean>
}

export function useAudioInput(): AudioInputState & AudioInputActions

// Responsibilities:
// - Manage MediaStream lifecycle
// - Request and track microphone permissions
// - Provide audio data stream
// - Calculate volume levels for visualization
```

#### useSpeechRecognition

```typescript
// hooks/useSpeechRecognition.ts
interface SpeechRecognitionState {
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: Error | null
  isSupported: boolean
}

interface SpeechRecognitionActions {
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

export function useSpeechRecognition(): SpeechRecognitionState & SpeechRecognitionActions

// Responsibilities:
// - Use browser SpeechRecognition API when available
// - Fallback to server-side transcription
// - Provide interim and final transcripts
// - Handle continuous recognition
```

#### useConversation

```typescript
// hooks/useConversation.ts
interface ConversationState {
  messages: ConversationMessage[]
  currentState: 'listening' | 'processing' | 'thinking' | 'speaking'
  error: VoiceError | null
  isGenerating: boolean
}

interface ConversationActions {
  sendMessage: (text: string) => Promise<void>
  interrupt: () => void
  clearHistory: () => void
}

export function useConversation(): ConversationState & ConversationActions

// Responsibilities:
// - Maintain conversation history (max 50 messages)
// - Send messages to chat API
// - Manage conversation state transitions
// - Handle interruptions
// - Coordinate with TTS synthesis
```

#### useVoiceSynthesis

```typescript
// hooks/useVoiceSynthesis.ts
interface VoiceSynthesisState {
  isSynthesizing: boolean
  error: Error | null
}

interface VoiceSynthesisActions {
  synthesize: (text: string) => Promise<AudioBuffer>
  cancel: () => void
}

export function useVoiceSynthesis(): VoiceSynthesisState & VoiceSynthesisActions

// Responsibilities:
// - Call TTS API with text
// - Stream audio data
// - Implement retry logic
// - Handle synthesis errors
```

#### useAudioOutput

```typescript
// hooks/useAudioOutput.ts
interface AudioOutputState {
  isPlaying: boolean
  error: Error | null
}

interface AudioOutputActions {
  play: (audioBuffer: AudioBuffer) => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
}

export function useAudioOutput(
  onPlaybackComplete?: () => void,
  onInterrupted?: () => void
): AudioOutputState & AudioOutputActions

// Responsibilities:
// - Play audio buffers
// - Manage playback state
// - Detect and handle interruptions
// - Notify on playback events
```

### API Routes

#### POST /api/transcribe

```typescript
// app/api/transcribe/route.ts
interface TranscribeRequest {
  audio: Blob // audio data in supported format
  language?: string // optional language hint
}

interface TranscribeResponse {
  text: string
  error?: string
}

export async function POST(request: Request): Promise<Response>

// Responsibilities:
// - Validate audio data
// - Call OpenAI Whisper API
// - Return transcribed text
// - Handle errors with retry logic
```

#### POST /api/chat

```typescript
// app/api/chat/route.ts
interface ChatRequest {
  message: string
  history: ConversationMessage[]
}

interface ChatResponse {
  response: string
  error?: string
}

export async function POST(request: Request): Promise<Response>

// Responsibilities:
// - Validate request data
// - Format conversation history for OpenAI
// - Call OpenAI Chat Completions API
// - Return AI response
// - Handle errors
```

#### POST /api/tts

```typescript
// app/api/tts/route.ts
interface TTSRequest {
  text: string
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number // 0.25 to 4.0
}

export async function POST(request: Request): Promise<Response>

// Responsibilities:
// - Validate text input
// - Call OpenAI TTS API
// - Stream audio data back to client
// - Handle errors with retry logic
// - Return audio in supported format (mp3)
```

### Utility Functions

#### Audio Processing

```typescript
// lib/audio/processor.ts

/**
 * Convert audio blob to format suitable for OpenAI Whisper
 */
export function prepareAudioForTranscription(blob: Blob): Promise<Blob>

/**
 * Calculate volume level from audio data for visualization
 */
export function calculateVolume(audioData: Float32Array): number

/**
 * Detect voice activity in audio stream
 */
export function detectVoiceActivity(
  audioData: Float32Array,
  threshold: number
): boolean
```

#### Retry Logic

```typescript
// lib/retry.ts

interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T>
```

#### Error Handling

```typescript
// lib/errors.ts

export class VoiceError extends Error {
  constructor(
    message: string,
    public code: VoiceErrorCode,
    public recoverable: boolean,
    public userMessage: string
  )
}

export enum VoiceErrorCode {
  MICROPHONE_PERMISSION_DENIED = 'MICROPHONE_PERMISSION_DENIED',
  MICROPHONE_NOT_FOUND = 'MICROPHONE_NOT_FOUND',
  SPEECH_RECOGNITION_FAILED = 'SPEECH_RECOGNITION_FAILED',
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_AUTHENTICATION_FAILED = 'API_AUTHENTICATION_FAILED',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TTS_SYNTHESIS_FAILED = 'TTS_SYNTHESIS_FAILED',
  AUDIO_PLAYBACK_FAILED = 'AUDIO_PLAYBACK_FAILED',
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
}

/**
 * Convert error to user-friendly message
 */
export function formatErrorMessage(error: VoiceError): string

/**
 * Determine if error is recoverable
 */
export function isRecoverableError(error: VoiceError): boolean
```

## Data Models

### Core Types

```typescript
// lib/voice/types.ts

/**
 * Conversation message in the history
 */
export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  audioUrl?: string // optional reference to audio for playback
}

/**
 * Current state of the conversation
 */
export type ConversationState = 
  | 'listening'    // Waiting for user input
  | 'processing'   // Transcribing user speech
  | 'thinking'     // Generating AI response
  | 'speaking'     // Playing AI audio response

/**
 * Voice activity detection result
 */
export interface VoiceActivity {
  isActive: boolean
  volume: number
  timestamp: number
}

/**
 * Audio configuration
 */
export interface AudioConfig {
  sampleRate: number
  channelCount: number
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}

/**
 * TTS voice options
 */
export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

/**
 * Speech recognition result
 */
export interface SpeechRecognitionResult {
  transcript: string
  isFinal: boolean
  confidence: number
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
    recoverable: boolean
  }
}
```

### State Management

```typescript
// State shape for the voice conversation feature

interface VoiceConversationState {
  // Conversation
  messages: ConversationMessage[]
  conversationState: ConversationState
  
  // Audio input
  isCapturing: boolean
  hasMicrophonePermission: boolean
  currentVolume: number
  
  // Speech recognition
  isListening: boolean
  currentTranscript: string
  interimTranscript: string
  
  // AI response
  isGeneratingResponse: boolean
  
  // Audio output
  isPlayingAudio: boolean
  currentAudioId: string | null
  
  // Errors
  errors: {
    microphone?: VoiceError
    recognition?: VoiceError
    generation?: VoiceError
    synthesis?: VoiceError
    playback?: VoiceError
  }
  
  // Configuration
  selectedVoice: TTSVoice
  speechSpeed: number
  
  // Browser support
  browserSupport: {
    mediaDevices: boolean
    speechRecognition: boolean
    audioContext: boolean
  }
}
```

### Environment Configuration

```typescript
// Environment variables required for the feature

interface VoiceConversationEnv {
  OPENAI_API_KEY: string // Required: OpenAI API key
  OPENAI_ORG_ID?: string // Optional: OpenAI organization ID
  TTS_VOICE?: TTSVoice   // Optional: Default TTS voice (default: 'alloy')
  TTS_SPEED?: string     // Optional: Default speech speed (default: '1.0')
  MAX_CONVERSATION_LENGTH?: string // Optional: Max messages (default: '50')
}
```


## Error Handling

### Error Categories

#### 1. Permission Errors

**Microphone Permission Denied**
- **Trigger**: User denies microphone access or revokes permission
- **Handling**: Display clear message explaining microphone is required
- **Recovery**: Provide button to re-request permission
- **User Message**: "Microphone access is required for voice conversations. Please allow microphone access and try again."

**Microphone Not Found**
- **Trigger**: No microphone device available on system
- **Handling**: Display message indicating hardware requirement
- **Recovery**: None (hardware issue)
- **User Message**: "No microphone detected. Please connect a microphone to use voice conversations."

#### 2. Browser Compatibility Errors

**Speech Recognition Not Supported**
- **Trigger**: Browser doesn't support Web Speech API
- **Handling**: Automatically fall back to server-side transcription
- **Recovery**: Transparent fallback (no user action needed)
- **User Message**: None (handled transparently)

**Audio Context Not Supported**
- **Trigger**: Browser doesn't support Web Audio API
- **Handling**: Display compatibility error
- **Recovery**: Suggest upgrading browser
- **User Message**: "Your browser doesn't support voice conversations. Please use Chrome 120+, Firefox 120+, Safari 17+, or Edge 120+."

#### 3. API Errors

**API Key Missing**
- **Trigger**: OPENAI_API_KEY environment variable not set
- **Handling**: Display configuration error on page load
- **Recovery**: None (developer must configure)
- **User Message**: "Voice conversations are not configured. Please contact support."

**API Authentication Failed**
- **Trigger**: Invalid or expired API key
- **Handling**: Display authentication error
- **Recovery**: None (developer must fix)
- **User Message**: "Unable to connect to voice services. Please contact support."

**API Rate Limit Exceeded**
- **Trigger**: Too many requests to OpenAI API
- **Handling**: Display rate limit message
- **Recovery**: Retry after delay
- **User Message**: "Voice services are temporarily busy. Please wait a moment and try again."

#### 4. Network Errors

**Connection Lost**
- **Trigger**: Network disconnection during API call
- **Handling**: Display network error
- **Recovery**: Retry with exponential backoff
- **User Message**: "Connection lost. Retrying..."

**Request Timeout**
- **Trigger**: API request exceeds timeout threshold
- **Handling**: Cancel request and display timeout error
- **Recovery**: Retry on user action
- **User Message**: "Request timed out. Please try again."

#### 5. Processing Errors

**Speech Recognition Failed**
- **Trigger**: Unable to transcribe audio (unclear speech, background noise)
- **Handling**: Display recognition error
- **Recovery**: User can speak again
- **User Message**: "Couldn't understand that. Please try speaking again."

**TTS Synthesis Failed**
- **Trigger**: Unable to synthesize speech from text
- **Handling**: Display text response as fallback
- **Recovery**: Show text instead of audio
- **User Message**: "Audio unavailable. Showing text response instead."

**Audio Playback Failed**
- **Trigger**: Browser unable to play audio format
- **Handling**: Display playback error and show text
- **Recovery**: Show text fallback
- **User Message**: "Unable to play audio. Showing text response instead."

### Error Handling Strategy

#### Retry Logic

All API calls implement exponential backoff retry:

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,      // 1 second
  maxDelay: 10000,      // 10 seconds
  backoffMultiplier: 2
}

// Retry sequence: 1s, 2s, 4s
```

**Retryable Errors**:
- Network errors (connection lost, timeout)
- API rate limits (with longer delay)
- Temporary API failures (5xx errors)

**Non-Retryable Errors**:
- Permission denied
- Authentication failures
- Invalid request format (4xx errors except 429)
- Browser compatibility issues

#### Fallback Mechanisms

1. **Speech Recognition Fallback**
   - Primary: Browser Web Speech API
   - Fallback: Server-side OpenAI Whisper API
   - Trigger: Browser API unavailable or fails

2. **TTS Synthesis Fallback**
   - Primary: OpenAI TTS API with audio playback
   - Fallback: Display text response only
   - Trigger: Synthesis fails or playback fails

3. **Conversation Context Fallback**
   - Primary: Full 50-message history
   - Fallback: Last 10 messages if memory constraints
   - Trigger: Performance degradation detected

#### Error Logging

All errors are logged to browser console with structured data:

```typescript
interface ErrorLog {
  timestamp: Date
  errorCode: VoiceErrorCode
  message: string
  stack?: string
  context: {
    conversationState: ConversationState
    messageCount: number
    userAgent: string
  }
}
```

**Logged Information**:
- Error type and code
- User-facing message
- Stack trace (for debugging)
- Current conversation state
- Browser information
- Timestamp

**Privacy Considerations**:
- Never log conversation content
- Never log API keys
- Never log personal information

### Error Recovery Flows

#### Microphone Permission Recovery

```
1. User denies permission
2. Display error message with explanation
3. Show "Allow Microphone" button
4. On click: re-request permission
5. If granted: resume normal flow
6. If denied again: show persistent error
```

#### Network Error Recovery

```
1. API call fails with network error
2. Display "Connection lost. Retrying..." message
3. Retry with exponential backoff (3 attempts)
4. If successful: resume normal flow
5. If all retries fail: show "Retry" button
6. On click: attempt request again
```

#### Speech Recognition Recovery

```
1. Recognition fails or returns empty
2. Display "Couldn't understand that"
3. Automatically return to listening state
4. User can speak again immediately
5. No manual retry needed
```

## Testing Strategy

### Testing Approach

This feature is **not suitable for property-based testing** because:
- It's primarily UI interaction and rendering
- Heavy reliance on browser APIs (microphone, audio playback)
- Integration with external services (OpenAI API)
- Side-effect-only operations (audio capture, playback)

Instead, we use a combination of:
1. **Unit tests** for pure logic and utility functions
2. **Integration tests** with mocked browser APIs
3. **E2E tests** for critical user flows
4. **Manual testing** for audio quality and UX

### Unit Tests

#### Utility Functions

**Audio Processing** (`lib/audio/processor.ts`)
- Test `calculateVolume` with various audio data patterns
- Test `detectVoiceActivity` with different threshold values
- Test `prepareAudioForTranscription` format conversion

**Retry Logic** (`lib/retry.ts`)
- Test exponential backoff timing
- Test max attempts limit
- Test successful retry after failures
- Test immediate success (no retry needed)

**Error Handling** (`lib/errors.ts`)
- Test `formatErrorMessage` for all error codes
- Test `isRecoverableError` classification
- Test VoiceError construction and properties

**Example Tests**:

```typescript
describe('calculateVolume', () => {
  it('returns 0 for silent audio', () => {
    const silentData = new Float32Array(1024).fill(0)
    expect(calculateVolume(silentData)).toBe(0)
  })
  
  it('returns value between 0 and 1 for normal audio', () => {
    const audioData = new Float32Array(1024).fill(0.5)
    const volume = calculateVolume(audioData)
    expect(volume).toBeGreaterThan(0)
    expect(volume).toBeLessThanOrEqual(1)
  })
  
  it('handles clipping at maximum volume', () => {
    const loudData = new Float32Array(1024).fill(1.0)
    expect(calculateVolume(loudData)).toBe(1)
  })
})

describe('retryWithBackoff', () => {
  it('succeeds on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success')
    const result = await retryWithBackoff(fn, RETRY_CONFIG)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })
  
  it('retries on failure and eventually succeeds', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success')
    
    const result = await retryWithBackoff(fn, RETRY_CONFIG)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })
  
  it('throws after max attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'))
    await expect(retryWithBackoff(fn, RETRY_CONFIG)).rejects.toThrow('fail')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
```

#### State Management Logic

**Conversation Manager** (pure logic extracted from hook)
- Test message history management (add, limit to 50)
- Test conversation state transitions
- Test interruption handling
- Test history clearing

**Turn-Taking Logic**
- Test state transitions: listening → processing → thinking → speaking → listening
- Test interruption during speaking state
- Test invalid state transitions

### Integration Tests

#### Custom Hooks with Mocked Browser APIs

**useAudioInput**
- Mock `navigator.mediaDevices.getUserMedia`
- Test permission request flow
- Test audio capture start/stop
- Test permission denial handling
- Test device not found handling

**useSpeechRecognition**
- Mock `SpeechRecognition` API
- Test continuous recognition
- Test interim and final results
- Test fallback to server API
- Test error handling

**useAudioOutput**
- Mock `Audio` constructor and methods
- Test audio playback
- Test interruption detection
- Test playback completion callback
- Test error handling

**Example Integration Test**:

```typescript
describe('useAudioInput', () => {
  beforeEach(() => {
    // Mock getUserMedia
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn()
    }
  })
  
  it('requests microphone permission and starts capture', async () => {
    const mockStream = { id: 'mock-stream' }
    ;(navigator.mediaDevices.getUserMedia as jest.Mock)
      .mockResolvedValue(mockStream)
    
    const { result } = renderHook(() => useAudioInput())
    
    await act(async () => {
      await result.current.startCapture()
    })
    
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: expect.objectContaining({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      })
    })
    expect(result.current.isCapturing).toBe(true)
    expect(result.current.hasPermission).toBe(true)
  })
  
  it('handles permission denial', async () => {
    ;(navigator.mediaDevices.getUserMedia as jest.Mock)
      .mockRejectedValue(new Error('Permission denied'))
    
    const { result } = renderHook(() => useAudioInput())
    
    await act(async () => {
      await result.current.startCapture()
    })
    
    expect(result.current.hasPermission).toBe(false)
    expect(result.current.error).toBeTruthy()
    expect(result.current.error?.code).toBe('MICROPHONE_PERMISSION_DENIED')
  })
})
```

#### API Routes

**POST /api/transcribe**
- Mock OpenAI client
- Test successful transcription
- Test error handling
- Test retry logic
- Test invalid audio format

**POST /api/chat**
- Mock OpenAI client
- Test successful response generation
- Test conversation context handling
- Test error handling
- Test rate limiting

**POST /api/tts**
- Mock OpenAI client
- Test successful synthesis
- Test audio streaming
- Test error handling
- Test different voice options

**Example API Test**:

```typescript
describe('POST /api/chat', () => {
  it('generates AI response with conversation context', async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'AI response' } }]
          })
        }
      }
    }
    
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'User message',
        history: [
          { role: 'user', content: 'Previous message' }
        ]
      })
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(data.response).toBe('AI response')
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
      model: 'gpt-4',
      messages: expect.arrayContaining([
        { role: 'user', content: 'Previous message' },
        { role: 'user', content: 'User message' }
      ])
    })
  })
  
  it('handles API errors gracefully', async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('API error'))
        }
      }
    }
    
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'User message',
        history: []
      })
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.error).toBeTruthy()
  })
})
```

### End-to-End Tests

#### Critical User Flows

**Happy Path: Complete Conversation**
1. User lands on voice conversation page
2. Grants microphone permission
3. Speaks a message
4. Sees transcribed text appear
5. Sees AI thinking indicator
6. Hears AI response
7. Sees conversation history update
8. Speaks follow-up message
9. Conversation continues

**Interruption Flow**
1. User speaks and gets AI response
2. AI starts speaking
3. User interrupts by speaking
4. AI stops immediately
5. User's new message is processed
6. Conversation continues from interruption

**Error Recovery Flow**
1. User speaks message
2. Network error occurs
3. Error message displayed with retry
4. User clicks retry
5. Request succeeds
6. Conversation continues

**Permission Denial Flow**
1. User lands on page
2. Denies microphone permission
3. Error message displayed
4. User clicks "Allow Microphone"
5. Permission granted
6. Voice conversation starts

### Manual Testing Checklist

#### Audio Quality
- [ ] Speech recognition accuracy with clear speech
- [ ] Speech recognition with background noise
- [ ] TTS audio clarity and naturalness
- [ ] Audio volume levels appropriate
- [ ] No audio clipping or distortion

#### User Experience
- [ ] Visual indicators clear and responsive
- [ ] Turn-taking feels natural
- [ ] Interruptions work smoothly
- [ ] Error messages are helpful
- [ ] Loading states are clear

#### Browser Compatibility
- [ ] Chrome 120+ (Windows, Mac, Linux)
- [ ] Firefox 120+ (Windows, Mac, Linux)
- [ ] Safari 17+ (Mac, iOS)
- [ ] Edge 120+ (Windows)

#### Device Testing
- [ ] Desktop with external microphone
- [ ] Laptop with built-in microphone
- [ ] Mobile phone (iOS)
- [ ] Mobile phone (Android)
- [ ] Tablet (iOS)
- [ ] Tablet (Android)

#### Network Conditions
- [ ] Fast connection (>10 Mbps)
- [ ] Slow connection (1-2 Mbps)
- [ ] Intermittent connection
- [ ] Connection loss and recovery

#### Edge Cases
- [ ] Very long user messages (>1 minute)
- [ ] Very long AI responses (>2 minutes)
- [ ] Rapid back-and-forth conversation
- [ ] Multiple interruptions in sequence
- [ ] Conversation with 50+ messages
- [ ] Switching between tabs during conversation
- [ ] Minimizing browser during conversation

### Performance Testing

#### Latency Targets

- **Speech recognition start**: < 500ms after user stops speaking
- **AI response generation**: < 2s for typical message
- **TTS synthesis start**: < 500ms after response received
- **Audio playback start**: < 200ms after synthesis ready
- **Total turn latency**: < 3s from user stop speaking to AI start speaking

#### Performance Monitoring

```typescript
// Track latency metrics
interface LatencyMetrics {
  recognitionLatency: number    // Time from speech end to transcript
  generationLatency: number     // Time from request to response
  synthesisLatency: number      // Time from text to audio ready
  playbackLatency: number       // Time from audio ready to playback start
  totalTurnLatency: number      // End-to-end turn time
}

// Log metrics for analysis
function logPerformanceMetrics(metrics: LatencyMetrics): void {
  console.log('Performance Metrics:', metrics)
  
  // Warn if targets not met
  if (metrics.totalTurnLatency > 3000) {
    console.warn('Turn latency exceeded target:', metrics.totalTurnLatency)
  }
}
```

### Test Coverage Goals

- **Unit tests**: 80%+ coverage for utility functions
- **Integration tests**: All custom hooks and API routes
- **E2E tests**: All critical user flows
- **Manual tests**: All browsers and devices before release

### Continuous Testing

- Run unit tests on every commit
- Run integration tests on every PR
- Run E2E tests nightly
- Manual testing before each release
- Performance monitoring in production (if deployed)
