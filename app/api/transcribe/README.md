# Transcribe API Route

## Overview

The `/api/transcribe` endpoint provides speech-to-text transcription using OpenAI's Whisper API. This is a server-side API route that handles audio data securely without exposing API keys to the client.

## Endpoint

```
POST /api/transcribe
```

## Request Format

```typescript
{
  audio: string,      // Required: base64-encoded audio data
  language?: string   // Optional: language hint (e.g., 'en', 'es', 'fr')
}
```

### Audio Format

The `audio` field accepts base64-encoded audio data in any of the following formats:
- Plain base64 string: `"SGVsbG8gV29ybGQ="`
- Data URL format: `"data:audio/webm;base64,SGVsbG8gV29ybGQ="`

Supported audio formats (via OpenAI Whisper):
- flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm

## Response Format

### Success Response (200 OK)

```typescript
{
  text: string  // Transcribed text from the audio
}
```

### Error Response (4xx/5xx)

```typescript
{
  error: string  // User-friendly error message
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Invalid audio data format |
| 401 | API authentication failed |
| 429 | Rate limit exceeded |
| 500 | API key missing or transcription failed |
| 503 | Network error |

## Features

### Retry Logic

The endpoint implements exponential backoff retry logic:
- **Max attempts**: 3
- **Base delay**: 1 second
- **Max delay**: 10 seconds
- **Backoff multiplier**: 2x

Retry sequence: 1s → 2s → 4s

### Error Handling

All errors are mapped to user-friendly messages:
- API key issues → "Voice services are not configured"
- Authentication failures → "Unable to connect to voice services"
- Rate limits → "Voice services are temporarily busy"
- Network errors → "Connection lost"
- Transcription failures → "Speech recognition failed"

### Security

- API key is stored server-side in environment variables
- No client-side exposure of credentials
- All OpenAI API calls are made from the server

## Usage Example

### Client-Side Code

```typescript
async function transcribeAudio(audioBlob: Blob): Promise<string> {
  // Convert blob to base64
  const reader = new FileReader()
  const base64Audio = await new Promise<string>((resolve) => {
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(audioBlob)
  })
  
  // Call API
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: base64Audio,
      language: 'en', // optional
    }),
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || 'Transcription failed')
  }
  
  return data.text
}
```

### With Language Hint

```typescript
const response = await fetch('/api/transcribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    audio: base64AudioData,
    language: 'es', // Spanish
  }),
})
```

## Environment Variables

Required:
- `OPENAI_API_KEY`: Your OpenAI API key

Optional:
- `OPENAI_ORG_ID`: Your OpenAI organization ID

## Requirements Satisfied

This implementation satisfies the following requirements from the voice-conversation-page spec:

- **2.1**: Send audio data to OpenAI API
- **2.2**: Return transcribed text to Conversation Manager
- **2.3**: Use API key from environment variables
- **2.4**: Retry up to 3 times with exponential backoff
- **2.5**: Display error message when all retries fail
- **9.1**: Read API key from OPENAI_API_KEY environment variable
- **9.3**: Use server-side API routes for all OpenAI API calls
- **9.5**: Display clear error message when API authentication fails

## Testing

Run the test suite:

```bash
npm test -- app/api/transcribe/route.test.ts
```

The test suite covers:
- ✅ Successful transcription with valid audio
- ✅ Language hint support
- ✅ Data URL format handling
- ✅ Validation errors (missing/invalid audio)
- ✅ API key errors
- ✅ OpenAI API errors (401, 429, 500)
- ✅ Network errors
- ✅ Retry logic configuration
