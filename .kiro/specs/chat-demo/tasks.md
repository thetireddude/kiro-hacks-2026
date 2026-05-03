# Implementation Plan: Chat Demo Feature

## Overview

This implementation plan breaks down the Chat Demo feature into discrete coding tasks. The feature will be built using TypeScript in a Next.js 16 application with the App Router. The implementation follows a layered architecture with clear separation between data loading, AI processing (OpenAI for summaries), file updates, TTS generation (Kokoro-82M), and UI presentation.

## Tasks

- [x] 1. Set up project structure and type definitions
  - Create directory structure: `app/chatDemo/`, `lib/` modules, `news/` folder
  - Extend `lib/types.ts` with all required interfaces: `NewsLoadResult`, `SummaryResult`, `UpdateResult`, `TtsResult`
  - Add TypeScript configuration for strict type checking
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 1.1 Write property test for type definitions
  - **Property 3: Story Parsing Round-Trip**
  - **Validates: Requirements 1.3, 1.6**
  - Verify that Story objects can be serialized to JSON and parsed back with all fields preserved

- [ ] 2. Implement NewsLoader module
  - [x] 2.1 Create `lib/newsLoader.ts` with core loading functions
    - Implement `getTodayDateString()` to format current date as YYYY-MM-DD
    - Implement `findNewsFiles()` to discover JSON files matching date pattern
    - Implement `parseNewsFile()` to read and parse individual JSON files
    - Implement `loadTodayNews()` as the main entry point
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

  - [ ]* 2.2 Write property test for date formatting
    - **Property 1: Date Format Consistency**
    - **Validates: Requirements 1.1**
    - Verify YYYY-MM-DD format with zero-padded values for any date

  - [ ]* 2.3 Write property test for file discovery
    - **Property 2: File Discovery Accuracy**
    - **Validates: Requirements 1.2**
    - Verify that only files matching `{date}-*.json` pattern are identified

  - [x] 2.4 Implement error handling for NewsLoader
    - Handle missing news directory with descriptive error message
    - Handle no files for today with empty array and message
    - Handle invalid JSON with file identification in error
    - Handle permission denied errors
    - _Requirements: 1.4, 1.5, 6.1, 6.5_

  - [ ]* 2.5 Write unit tests for NewsLoader error conditions
    - Test missing directory error
    - Test invalid JSON error with filename
    - Test permission denied error
    - _Requirements: 6.1, 6.5_

  - [ ]* 2.6 Write property test for invalid JSON error reporting
    - **Property 4: Invalid JSON Error Reporting**
    - **Validates: Requirements 1.5**
    - Verify error messages include problematic filename

- [ ] 3. Checkpoint - Verify NewsLoader functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement SummaryGenerator module
  - [x] 4.1 Create `lib/summaryGenerator.ts` with OpenAI integration
    - Implement `getOpenAIClient()` to initialize OpenAI client with API key from environment
    - Implement `needsSummary()` to check if story requires summarization
    - Implement `generateSummary()` to call OpenAI API with proper prompt template
    - Configure model as `gpt-4o-mini`, max tokens 150, temperature 0.3
    - Use prompt: "Summarize the following news story in exactly 3 concise sentences: {description}"
    - _Requirements: 2.1, 2.2, 2.5, 2.6_

  - [ ]* 4.2 Write property test for summary skip logic
    - **Property 5: Summary Skip Logic**
    - **Validates: Requirements 2.5**
    - Verify stories with non-empty summaries are skipped without API calls

  - [x] 4.3 Implement error handling for SummaryGenerator
    - Handle missing API key with immediate error return
    - Handle invalid/expired key with authentication error
    - Handle network failures with detailed error messages
    - Handle API rate limits with rate limit error
    - Handle malformed responses with parsing error
    - _Requirements: 2.3, 2.4, 6.2, 6.3_

  - [ ]* 4.4 Write unit tests for SummaryGenerator error conditions
    - Test missing API key error
    - Test authentication failure error
    - Test network failure error
    - _Requirements: 6.2, 6.3_

- [ ] 5. Implement StoryUpdater module
  - [x] 5.1 Create `lib/storyUpdater.ts` with file update logic
    - Implement `readJsonFile()` helper to read and parse JSON
    - Implement `writeJsonFile()` helper to write formatted JSON (2-space indent)
    - Implement `updateStorySummary()` with atomic write pattern (temp file + rename)
    - Ensure only target story's summary field is modified
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [ ]* 5.2 Write property test for story update isolation
    - **Property 6: Story Update Isolation**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Verify only target story's summary is modified, all other fields preserved

  - [ ]* 5.3 Write property test for date-restricted updates
    - **Property 7: Date-Restricted Updates**
    - **Validates: Requirements 3.5**
    - Verify only today's files are modified

  - [ ]* 5.4 Write property test for JSON structure preservation
    - **Property 8: JSON Structure Preservation**
    - **Validates: Requirements 3.6**
    - Verify updated files remain valid JSON with same array structure

  - [x] 5.5 Implement error handling for StoryUpdater
    - Handle file not found errors
    - Handle permission denied errors
    - Handle invalid JSON structure errors
    - Handle write failure errors
    - _Requirements: 3.4, 6.6_

  - [ ]* 5.6 Write unit tests for StoryUpdater error conditions
    - Test file not found error
    - Test permission denied error
    - Test write failure error
    - _Requirements: 3.4, 6.6_

- [ ] 6. Checkpoint - Verify data layer functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement TtsGenerator module
  - [x] 7.1 Create `lib/ttsGenerator.ts` with Kokoro-82M integration
    - Implement `getTextForTTS()` to select summary or description
    - Implement `callKokoroAPI()` to call Kokoro-FastAPI endpoint
    - Implement `generateTTS()` as main entry point
    - Configure for OpenAI-compatible endpoint with model 'kokoro', voice 'af_bella', format 'mp3'
    - Use `KOKORO_API_URL` environment variable for service endpoint
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

  - [ ]* 7.2 Write property test for TTS text selection
    - **Property 9: TTS Text Selection**
    - **Validates: Requirements 4.2**
    - Verify description is used when summary is empty

  - [ ]* 7.3 Write property test for TTS error propagation
    - **Property 10: TTS Error Propagation**
    - **Validates: Requirements 4.3**
    - Verify service errors return null audioBuffer with error details

  - [x] 7.4 Implement error handling for TtsGenerator
    - Handle service unavailable errors
    - Handle network timeout errors
    - Handle invalid response errors
    - Handle empty text validation errors
    - _Requirements: 4.3, 6.4_

  - [ ]* 7.5 Write unit tests for TtsGenerator error conditions
    - Test service unavailable error
    - Test network timeout error
    - Test empty text validation error
    - _Requirements: 4.3, 6.4_

- [ ] 8. Implement Server Actions
  - [x] 8.1 Create `app/chatDemo/actions.ts` with server action functions
    - Mark file with 'use server' directive
    - Implement `generateSummaryAction()` to orchestrate summary generation and file update
    - Implement `generateTTSAction()` to generate audio for a story
    - Implement `reloadStoriesAction()` to reload stories after updates
    - Ensure proper error handling and result serialization
    - _Requirements: 7.5_

  - [ ]* 8.2 Write unit tests for server actions
    - Test action orchestration logic
    - Test error propagation from modules to actions
    - _Requirements: 7.5_

- [ ] 9. Implement ChatDemoPage server component
  - [x] 9.1 Create `app/chatDemo/page.tsx` as async server component
    - Import and call `loadTodayNews()` to fetch initial data
    - Render page title "Today's News"
    - Display error message if news loading fails
    - Pass stories to ChatDemoClient component on success
    - _Requirements: 5.1, 7.5_

  - [ ]* 9.2 Write unit tests for ChatDemoPage
    - Test error display when news loading fails
    - Test successful data passing to client component
    - _Requirements: 5.1_

- [ ] 10. Implement ChatDemoClient component
  - [x] 10.1 Create `app/chatDemo/ChatDemoClient.tsx` as client component
    - Mark file with 'use client' directive
    - Define state interface: stories, playingIndex, loadingAudio, errors
    - Implement `handlePlay()` to trigger TTS generation and audio playback
    - Implement `handleGenerateSummary()` to trigger summary generation (if needed)
    - _Requirements: 5.1, 5.4, 5.5, 7.5_

  - [x] 10.2 Implement UI rendering for story list
    - Render story cards with title, summary/no-summary message, and play button
    - Display loading states during audio generation
    - Display error messages for failed operations
    - Disable play button during loading
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [ ]* 10.3 Write property test for complete story rendering
    - **Property 11: Complete Story Rendering**
    - **Validates: Requirements 5.1, 5.4**
    - Verify one title and one button rendered per story

  - [ ]* 10.4 Write property test for conditional summary display
    - **Property 12: Conditional Summary Display**
    - **Validates: Requirements 5.2, 5.3**
    - Verify summary text shown when present, "no summary" message when absent

  - [ ]* 10.5 Write property test for error message display
    - **Property 13: Error Message Display**
    - **Validates: Requirements 5.6**
    - Verify error messages displayed for failed audio generation

  - [ ]* 10.6 Write unit tests for ChatDemoClient interactions
    - Test play button click handling
    - Test loading state management
    - Test error state management
    - _Requirements: 5.4, 5.5, 5.6_

- [x] 11. Add basic styling for ChatDemoClient
  - Add CSS classes for story-list, story-card, summary, no-summary, error
  - Ensure responsive layout and accessible controls
  - Style loading and error states appropriately
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

- [x] 12. Create sample news data files
  - Create `news/` directory in project root
  - Create sample JSON files with today's date pattern: `YYYY-MM-DD-sample.json`
  - Include multiple stories with titles, descriptions, and empty summaries
  - Ensure valid JSON structure matching Story interface
  - _Requirements: 1.2, 1.3_

- [x] 13. Set up environment configuration
  - Add `OPENAI_API_KEY` to environment variables documentation
  - Add `KOKORO_API_URL` to environment variables documentation
  - Create `.env.example` file with required variables
  - Add environment variable validation on startup
  - _Requirements: 2.3, 4.1_

- [ ] 14. Checkpoint - Integration testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 15. Write integration tests
  - [ ]* 15.1 Write OpenAI integration test
    - Test real API call with test credentials in staging environment
    - Verify summary quality and format
    - _Requirements: 2.1, 2.6_

  - [ ]* 15.2 Write Kokoro TTS integration test
    - Test real service call with test endpoint
    - Verify audio format and playability
    - _Requirements: 4.1, 4.5_

  - [ ]* 15.3 Write end-to-end workflow test
    - Test complete flow: load → summarize → update → TTS → play
    - Test error recovery flows
    - _Requirements: All requirements_

- [ ] 16. Final checkpoint - Complete feature verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design
- Unit tests validate specific examples and error conditions
- Integration tests verify external service integration
- The implementation uses TypeScript throughout as specified in the design
- Server Actions provide type-safe communication between client and server
- The feature follows Next.js 16 App Router conventions with server and client components
