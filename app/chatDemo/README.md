# Chat Demo Feature

A news reading application with AI-powered summarization and text-to-speech capabilities.

## Features

- **Automatic News Loading**: Loads news stories from JSON files matching today's date
- **AI Summarization**: Generates concise 3-sentence summaries using OpenAI's GPT-4o-mini
- **Text-to-Speech**: Reads stories aloud using browser's built-in speech synthesis
- **Persistent Summaries**: Saves generated summaries back to JSON files for future use

## Usage

1. Navigate to `/chatDemo` in your browser
2. View today's news stories
3. Click "Generate Summary" to create AI summaries for stories
4. Click "Play" to hear the story read aloud
5. Click "Stop" to pause playback

## File Structure

```
app/chatDemo/
  page.tsx              # Server component - loads initial data
  ChatDemoClient.tsx    # Client component - interactive UI
  actions.ts            # Server actions for API operations
lib/
  newsLoader.ts         # News file loading logic
  summaryGenerator.ts   # OpenAI integration
  storyUpdater.ts       # JSON file update logic
  ttsGenerator.ts       # Text-to-speech generation
  types.ts              # TypeScript interfaces
news/
  YYYY-MM-DD-*.json     # News data files
```

## Configuration

Required environment variables in `.env.local`:

```bash
# OpenAI API Key (required for summaries)
OPENAI_API_KEY=your_api_key_here

# Kokoro TTS Service URL (optional - currently using browser TTS)
KOKORO_API_URL=http://localhost:8000
```

## News File Format

News files should be placed in the `news/` directory with the naming pattern:
`YYYY-MM-DD-*.json`

Example: `news/2026-05-02-sample.json`

File structure:
```json
[
  {
    "title": "Story headline",
    "description": "Full story description",
    "summary": ""
  }
]
```

## Current Implementation Notes

- **TTS**: Currently using browser's built-in `SpeechSynthesis` API for immediate functionality
- **Kokoro-82M**: Infrastructure is in place for external TTS service integration
- **Summary Generation**: Automatically triggered when playing a story without a summary
- **Error Handling**: Comprehensive error messages for all operations

## Future Enhancements

- Integrate Kokoro-82M TTS service for higher quality audio
- Add voice selection options
- Implement audio caching
- Add summary regeneration option
- Support for multiple date ranges
