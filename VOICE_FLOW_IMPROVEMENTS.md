# Voice Conversation Flow Improvements

## Problem
The previous implementation relied on detecting silence to know when the user finished speaking, which was unreliable. The flow wasn't smooth or predictable.

## Solution
Implemented a manual control flow with automatic listening restart:
- **Always listening** automatically when the page loads
- **Manual "Stop & Send" button** to stop listening and send the message
- **Automatic listening restart** when the AI finishes responding

### New Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    LISTENING (Always Active)                     │
│  - Microphone capturing audio                                    │
│  - Speech recognition running                                   │
│  - Waiting for user to speak                                    │
│  - "Stop & Send" button visible                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ User speaks → interim transcript appears
                         │ User clicks "Stop & Send" button
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    PROCESSING (User Turn)                        │
│  - Listening stopped                                             │
│  - Message being prepared to send                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Send to API
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    THINKING (AI Turn)                            │
│  - Waiting for AI response from chat API                         │
│  - Showing "Generating response" indicator                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ AI response received
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    SPEAKING (AI Turn)                            │
│  - Text-to-speech synthesis in progress                          │
│  - Audio playing back to user                                    │
│  - "Interrupt" button available                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Audio playback complete
                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         └──────────────────────────────────────────┐
                                                                    │
                                                    Back to LISTENING
                                                    (Auto-restart)
```

## Key Improvements

### 1. **Always Listening**
- Automatically starts listening when page loads
- Continuous audio capture and speech recognition
- User sees interim transcript as they speak

### 2. **Manual Stop Control**
- "Stop & Send" button appears when listening
- User clicks when done talking (no guessing about silence)
- Sends the transcript immediately

### 3. **Automatic Listening Restart**
- When AI finishes speaking (audio playback complete)
- Automatically restarts audio capture and speech recognition
- No manual intervention needed between turns

### 4. **Interrupt Option**
- "Interrupt" button available while AI is speaking
- User can stop AI mid-response and start speaking again
- Cleanly transitions back to listening

## Code Changes

### `app/voice/page.tsx`

**New handler**: `handleStopListeningAndSend()`
- Stops speech recognition
- Sends the current transcript to the conversation
- Clears the transcript for next turn

**New effect**: Auto-restart listening when AI finishes
- Triggers when `conversation.currentState === 'listening'`
- Ensures audio capture and speech recognition are running
- 100ms delay for clean state transition

**Updated UI**:
- "Stop & Send" button (green) - visible during listening
- "Interrupt" button (amber) - visible during AI speaking
- Clear History button - always available

## User Experience

### Before
1. User speaks
2. System tries to detect silence (unreliable)
3. Sometimes doesn't send, sometimes sends twice
4. AI responds
5. User has to manually restart listening
6. Awkward pauses and unclear state

### After
1. System always listening (clear visual indicator)
2. User speaks naturally
3. User clicks "Stop & Send" when done (explicit control)
4. AI responds automatically
5. System automatically goes back to listening
6. Smooth, natural conversation flow with clear control

## Testing Checklist

- [ ] Start page → automatically listening
- [ ] Speak → interim transcript appears
- [ ] Click "Stop & Send" → message sends
- [ ] AI responds → audio plays
- [ ] Audio finishes → automatically listening again
- [ ] Interrupt during AI speaking → works smoothly
- [ ] Error during response → gracefully restarts listening
- [ ] Multiple turns → flow remains smooth
- [ ] "Stop & Send" button only visible when listening
- [ ] "Interrupt" button only visible when AI speaking

## Future Improvements

1. **Voice Activity Detection (VAD)**: Optional auto-stop based on silence detection
2. **Streaming responses**: Start playing AI response while still generating (lower latency)
3. **Barge-in**: Allow user to interrupt mid-sentence more naturally
4. **Confidence scoring**: Show confidence level of transcription
5. **Multi-language support**: Allow language selection
