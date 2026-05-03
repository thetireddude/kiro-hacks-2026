# Design Document: Chat Demo Feature

## Overview

The Chat Demo feature is a Next.js-based news reading application that combines AI-powered summarization with text-to-speech capabilities. The system loads news stories from JSON files, generates concise summaries using OpenAI's API, persists those summaries back to the files, and provides audio playback using the Kokoro-82M text-to-speech model.

### Key Design Principles

1. **Modular Architecture**: Clear separation between data loading, AI processing, file updates, TTS generation, and UI presentation
2. **Error Resilience**: Graceful degradation when services are unavailable or operations fail
3. **Performance**: Efficient file I/O, API usage, and audio generation
4. **Maintainability**: Type-safe TypeScript implementation with well-defined interfaces

### Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **AI Services**: 
  - OpenAI API (via `openai` npm package) for text summarization
  - Kokoro-82M TTS model (via FastAPI wrapper or direct integration)
- **Runtime**: Node.js for server-side operations
- **UI**: React 19 with server and client components

## Architecture

### System Architecture

The feature follows a layered architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ChatDemoPage (Client Component)                       │ │
│  │  - Renders story list                                  │ │
│  │  - Handles audio playback UI                           │ │
│  │  - Displays errors to users                            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                      API/Action Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Load Stories │  │  Summarize   │  │  Generate    │      │
│  │   Action     │  │    Action    │  │  TTS Action  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ NewsLoader   │  │   Summary    │  │     TTS      │      │
│  │              │  │  Generator   │  │  Generator   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐                                           │
│  │    Story     │                                           │
│  │   Updater    │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                      Data/External Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  File System │  │  OpenAI API  │  │  Kokoro-82M  │      │
│  │  (news/*.json)│  │              │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initial Load**: User navigates to `/chatDemo` → Server component loads stories → Client component renders
2. **Summarization**: User triggers summary generation → Server action calls OpenAI → Updates JSON file → Returns result
3. **Audio Playback**: User clicks play → Client requests TTS → Server action generates audio → Returns audio buffer → Client plays audio

### File Structure

```
app/
  chatDemo/
    page.tsx                    # Main page component (server component)
    ChatDemoClient.tsx          # Client component for interactivity
    actions.ts                  # Server actions for API operations
lib/
  newsLoader.ts                 # News file loading logic
  summaryGenerator.ts           # OpenAI integration
  storyUpdater.ts               # JSON file update logic
  ttsGenerator.ts               # Kokoro-82M integration
  types.ts                      # Shared TypeScript interfaces (already exists)
news/                           # News JSON files directory
  YYYY-MM-DD-story1.json
  YYYY-MM-DD-story2.json
```

## Components and Interfaces

### 1. NewsLoader Module

**Responsibility**: Load and parse news JSON files for the current date.

**Location**: `lib/newsLoader.ts`

**Key Functions**:

```typescript
/**
 * Loads all news stories for today's date
 * @returns NewsLoadResult with stories array and optional error
 */
export async function loadTodayNews(): Promise<NewsLoadResult>

/**
 * Helper: Get today's date in the format used by news files
 * @returns Date string in YYYY-MM-DD format
 */
function getTodayDateString(): string

/**
 * Helper: Find all JSON files matching today's date pattern
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Array of file paths
 */
function findNewsFiles(dateString: string): Promise<string[]>

/**
 * Helper: Parse a single news file
 * @param filePath - Path to JSON file
 * @returns Array of Story objects or throws error
 */
function parseNewsFile(filePath: string): Promise<Story[]>
```

**Error Handling**:
- Missing news folder → Return error message
- No files for today → Return empty array with descriptive message
- Invalid JSON → Return error identifying the problematic file
- Permission denied → Return error with permission details

**Dependencies**: Node.js `fs/promises`, `path`

### 2. SummaryGenerator Module

**Responsibility**: Generate AI summaries using OpenAI API.

**Location**: `lib/summaryGenerator.ts`

**Key Functions**:

```typescript
/**
 * Generate a summary for a single story
 * @param story - Story object with description field
 * @returns SummaryResult with generated summary or error
 */
export async function generateSummary(story: Story): Promise<SummaryResult>

/**
 * Check if a story needs summarization
 * @param story - Story to check
 * @returns true if summary field is empty or whitespace
 */
export function needsSummary(story: Story): boolean

/**
 * Initialize OpenAI client
 * @returns OpenAI client instance or throws error
 */
function getOpenAIClient(): OpenAI
```

**Configuration**:
- API Key: Read from `OPENAI_API_KEY` environment variable
- Model: `gpt-4o-mini` (cost-effective for summarization)
- Max Tokens: 150 (approximately 3 sentences)
- Temperature: 0.3 (focused, consistent output)

**Prompt Template**:
```
Summarize the following news story in exactly 3 concise sentences:

{story.description}
```

**Error Handling**:
- Missing API key → Return error immediately
- Invalid/expired key → Return authentication error
- Network failure → Return network error with details
- API rate limit → Return rate limit error
- Malformed response → Return parsing error

**Dependencies**: `openai` npm package

### 3. StoryUpdater Module

**Responsibility**: Persist generated summaries back to JSON files.

**Location**: `lib/storyUpdater.ts`

**Key Functions**:

```typescript
/**
 * Update a story's summary in its source file
 * @param filePath - Path to the JSON file
 * @param storyIndex - Index of story in the file's array
 * @param summary - Generated summary text
 * @returns UpdateResult with success status and optional error
 */
export async function updateStorySummary(
  filePath: string,
  storyIndex: number,
  summary: string
): Promise<UpdateResult>

/**
 * Helper: Read and parse JSON file
 */
function readJsonFile(filePath: string): Promise<Story[]>

/**
 * Helper: Write JSON file with formatting
 */
function writeJsonFile(filePath: string, stories: Story[]): Promise<void>
```

**File Update Strategy**:
1. Read entire file into memory
2. Update specific story's summary field
3. Write back with pretty-printing (2-space indent)
4. Atomic write using temp file + rename pattern

**Error Handling**:
- File not found → Return error
- Permission denied → Return permission error
- Invalid JSON structure → Return parsing error
- Write failure → Return write error with details

**Dependencies**: Node.js `fs/promises`

### 4. TtsGenerator Module

**Responsibility**: Convert text to speech using Kokoro-82M model.

**Location**: `lib/ttsGenerator.ts`

**Key Functions**:

```typescript
/**
 * Generate audio for a story
 * @param story - Story with summary or description
 * @returns TtsResult with audio buffer or error
 */
export async function generateTTS(story: Story): Promise<TtsResult>

/**
 * Get text to convert to speech (summary if available, else description)
 * @param story - Story object
 * @returns Text string for TTS
 */
function getTextForTTS(story: Story): string

/**
 * Call Kokoro-82M API
 * @param text - Text to convert
 * @returns Audio buffer
 */
async function callKokoroAPI(text: string): Promise<Buffer>
```

**Integration Options**:

**Option A: Kokoro-FastAPI Wrapper** (Recommended for production)
- Deploy Kokoro-FastAPI as a separate service
- Use OpenAI-compatible endpoint
- Configuration via environment variable: `KOKORO_API_URL`

```typescript
// Example using OpenAI-compatible endpoint
const response = await fetch(`${KOKORO_API_URL}/v1/audio/speech`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'kokoro',
    voice: 'af_bella',
    input: text,
    response_format: 'mp3'
  })
});
```

**Option B: Direct Kokoro Integration** (For development/testing)
- Use `kokoro` npm package directly
- Requires model files downloaded locally
- Slower but no external service dependency

**Audio Format**: MP3 (widely supported, good compression)

**Voice Selection**: `af_bella` (American English, female voice - clear and professional)

**Error Handling**:
- Service unavailable → Return TTS service error
- Network timeout → Return timeout error
- Invalid response → Return parsing error
- Empty text → Return validation error

**Dependencies**: `node-fetch` or native `fetch` (Node.js 18+)

### 5. ChatDemoPage Component

**Responsibility**: Server component that loads initial data.

**Location**: `app/chatDemo/page.tsx`

**Implementation**:

```typescript
export default async function ChatDemoPage() {
  const newsResult = await loadTodayNews();
  
  return (
    <main>
      <h1>Today's News</h1>
      {newsResult.error ? (
        <ErrorDisplay message={newsResult.error} />
      ) : (
        <ChatDemoClient initialStories={newsResult.stories} />
      )}
    </main>
  );
}
```

**Characteristics**:
- Server component (async, runs on server)
- Loads data at request time
- Passes data to client component
- Handles initial error states

### 6. ChatDemoClient Component

**Responsibility**: Client component for interactive UI and audio playback.

**Location**: `app/chatDemo/ChatDemoClient.tsx`

**Key Features**:
- Display story list with titles and summaries
- Audio playback controls per story
- Loading states during operations
- Error message display

**State Management**:

```typescript
interface ClientState {
  stories: Story[];
  playingIndex: number | null;
  loadingAudio: Set<number>;
  errors: Map<number, string>;
}
```

**Key Functions**:

```typescript
/**
 * Handle audio playback for a story
 */
async function handlePlay(storyIndex: number): Promise<void>

/**
 * Trigger summary generation (if needed)
 */
async function handleGenerateSummary(storyIndex: number): Promise<void>
```

**UI Structure**:

```tsx
<div className="story-list">
  {stories.map((story, index) => (
    <article key={index} className="story-card">
      <h2>{story.title}</h2>
      {story.summary ? (
        <p className="summary">{story.summary}</p>
      ) : (
        <p className="no-summary">No summary available</p>
      )}
      <button 
        onClick={() => handlePlay(index)}
        disabled={loadingAudio.has(index)}
      >
        {loadingAudio.has(index) ? 'Loading...' : 'Play'}
      </button>
      {errors.get(index) && (
        <p className="error">{errors.get(index)}</p>
      )}
    </article>
  ))}
</div>
```

**Dependencies**: React hooks (`useState`, `useCallback`), Server Actions

### 7. Server Actions

**Responsibility**: Bridge between client component and business logic.

**Location**: `app/chatDemo/actions.ts`

**Key Actions**:

```typescript
'use server'

/**
 * Generate summary for a story
 */
export async function generateSummaryAction(
  filePath: string,
  storyIndex: number,
  story: Story
): Promise<SummaryResult>

/**
 * Generate TTS audio for a story
 */
export async function generateTTSAction(
  story: Story
): Promise<TtsResult>

/**
 * Reload stories (after updates)
 */
export async function reloadStoriesAction(): Promise<NewsLoadResult>
```

**Why Server Actions**:
- Direct function calls from client components (no API routes needed)
- Type-safe communication
- Automatic serialization
- Built-in error handling

## Data Models

### Story Interface

Defined in `lib/types.ts` (already exists):

```typescript
export interface Story {
  title: string;       // Headline text
  description: string; // Full story description
  summary: string;     // AI-generated summary; empty string if not yet generated
}
```

**Validation Rules**:
- `title`: Non-empty string, max 200 characters
- `description`: Non-empty string, max 5000 characters
- `summary`: String (may be empty), max 500 characters

### NewsLoadResult Interface

Defined in `lib/types.ts` (already exists):

```typescript
export interface NewsLoadResult {
  stories: Story[];    // Parsed stories; empty array on any error
  error: string | null; // Human-readable error message, or null on success
}
```

**Usage Pattern**:
- Success: `{ stories: [...], error: null }`
- Failure: `{ stories: [], error: "Error message" }`

### SummaryResult Interface

Defined in `lib/types.ts` (already exists):

```typescript
export interface SummaryResult {
  storyIndex: number;  // Index into the stories array
  summary: string | null; // Generated text, or null on error/skip
  error: string | null;   // Error message if generation failed
}
```

**Usage Pattern**:
- Success: `{ storyIndex: 0, summary: "...", error: null }`
- Skip: `{ storyIndex: 0, summary: null, error: null }` (already has summary)
- Failure: `{ storyIndex: 0, summary: null, error: "Error message" }`

### UpdateResult Interface

Defined in `lib/types.ts` (already exists):

```typescript
export interface UpdateResult {
  success: boolean;
  error: string | null;
}
```

**Usage Pattern**:
- Success: `{ success: true, error: null }`
- Failure: `{ success: false, error: "Error message" }`

### TtsResult Interface

Defined in `lib/types.ts` (already exists):

```typescript
export interface TtsResult {
  audioBuffer: Buffer | null;
  contentType: string;   // e.g. "audio/mp3"
  error: string | null;
}
```

**Usage Pattern**:
- Success: `{ audioBuffer: Buffer(...), contentType: "audio/mp3", error: null }`
- Failure: `{ audioBuffer: null, contentType: "", error: "Error message" }`

### News File Format

JSON files in the `news/` directory follow this structure:

**Filename Pattern**: `YYYY-MM-DD-{identifier}.json`

Example: `2025-01-15-tech-news.json`

**File Content**:

```json
[
  {
    "title": "Breaking: New AI Model Released",
    "description": "A detailed description of the news story with full context and information about the event...",
    "summary": ""
  },
  {
    "title": "Market Update: Tech Stocks Rise",
    "description": "Another detailed story description...",
    "summary": "Tech stocks showed strong gains today. Major companies reported positive earnings. Investors remain optimistic about the sector."
  }
]
```

**Constraints**:
- Root element must be an array
- Each element must be a valid Story object
- Files must be valid JSON
- Multiple stories per file are supported


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Date Format Consistency

*For any* system date, the News_Loader SHALL format the date as YYYY-MM-DD with zero-padded month and day values.

**Validates: Requirements 1.1**

### Property 2: File Discovery Accuracy

*For any* set of files in the news directory and any date string, the News_Loader SHALL identify exactly those files matching the pattern `{date}-*.json` and no others.

**Validates: Requirements 1.2**

### Property 3: Story Parsing Round-Trip

*For any* valid Story array written to a JSON file, parsing that file SHALL produce an equivalent array with all title, description, and summary fields preserved exactly.

**Validates: Requirements 1.3, 1.6**

### Property 4: Invalid JSON Error Reporting

*For any* malformed JSON file, the News_Loader SHALL return an error message that includes the filename of the problematic file.

**Validates: Requirements 1.5**

### Property 5: Summary Skip Logic

*For any* Story with a non-empty summary field, the Summary_Generator SHALL skip summary generation and return a result indicating the skip without making API calls.

**Validates: Requirements 2.5**

### Property 6: Story Update Isolation

*For any* story array and any update operation targeting a specific story index, only the summary field of that story SHALL be modified, with all other fields of that story and all other stories in the array remaining unchanged.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 7: Date-Restricted Updates

*For any* set of news files with various dates, the Story_Updater SHALL only modify files matching today's date and leave all other files untouched.

**Validates: Requirements 3.5**

### Property 8: JSON Structure Preservation

*For any* update operation on a news file, the resulting file SHALL remain valid JSON with the same array structure (parseable by JSON.parse).

**Validates: Requirements 3.6**

### Property 9: TTS Text Selection

*For any* Story with an empty summary field, the TTS_Generator SHALL use the description field as the text input for speech generation.

**Validates: Requirements 4.2**

### Property 10: TTS Error Propagation

*For any* TTS service error response, the TTS_Generator SHALL return a TtsResult with a null audioBuffer and an error message containing details from the service error.

**Validates: Requirements 4.3**

### Property 11: Complete Story Rendering

*For any* array of stories, the Chat_Demo_Page SHALL render exactly one title and one playback button for each story in the array.

**Validates: Requirements 5.1, 5.4**

### Property 12: Conditional Summary Display

*For any* Story with a non-empty summary, the Chat_Demo_Page SHALL display the summary text; for any Story with an empty summary, the page SHALL display a "no summary available" message.

**Validates: Requirements 5.2, 5.3**

### Property 13: Error Message Display

*For any* error returned from audio generation, the Chat_Demo_Page SHALL display the error message in the UI associated with the corresponding story.

**Validates: Requirements 5.6**

## Error Handling

### Error Categories

The system handles four categories of errors:

1. **File System Errors**
   - Missing news directory
   - Permission denied (read/write)
   - Invalid file paths
   - Disk full conditions

2. **Data Validation Errors**
   - Malformed JSON
   - Missing required fields
   - Invalid data types
   - Schema violations

3. **External Service Errors**
   - OpenAI API failures (authentication, rate limits, network)
   - Kokoro TTS service unavailability
   - Network timeouts
   - Service degradation

4. **Application Logic Errors**
   - Invalid story indices
   - Empty text for TTS
   - Concurrent update conflicts

### Error Handling Strategy

**Principle**: Fail gracefully with informative error messages. Never crash the application.

**Implementation Pattern**:

```typescript
// All operations return result objects with error fields
interface OperationResult {
  // ... success data fields
  error: string | null;
}

// Example usage
const result = await someOperation();
if (result.error) {
  // Handle error gracefully
  displayError(result.error);
  return;
}
// Proceed with success case
```

### Error Message Guidelines

1. **Be Specific**: Include relevant details (filenames, error codes, service names)
2. **Be Actionable**: Suggest what the user or developer can do
3. **Be Consistent**: Use similar phrasing for similar error types
4. **Avoid Leaking Secrets**: Don't include API keys or sensitive data in error messages

**Examples**:

- ✅ Good: "Failed to read news file '2025-01-15-tech.json': Permission denied. Check file permissions."
- ❌ Bad: "Error reading file"

- ✅ Good: "OpenAI API authentication failed. Verify OPENAI_API_KEY environment variable is set correctly."
- ❌ Bad: "API error"

### Error Recovery

**Automatic Recovery**:
- Retry transient network errors (with exponential backoff)
- Skip problematic files and continue processing others
- Fall back to description when summary generation fails

**Manual Recovery**:
- Display clear error messages to users
- Provide retry buttons for failed operations
- Log detailed errors for debugging

### Logging Strategy

**Development**:
- Log all errors with full stack traces
- Log API request/response details
- Log file operations

**Production**:
- Log errors with sanitized details (no secrets)
- Log performance metrics
- Use structured logging (JSON format)

**Log Levels**:
- ERROR: Operation failures that affect functionality
- WARN: Degraded performance or skipped operations
- INFO: Normal operations (file loads, API calls)
- DEBUG: Detailed execution flow (development only)

## Testing Strategy

### Testing Approach

This feature requires a **dual testing approach** combining property-based testing for core logic with example-based tests for specific scenarios and integration tests for external services.

### Property-Based Testing

**Applicability**: Property-based testing (PBT) is highly applicable to this feature because:
- Core modules (NewsLoader, StoryUpdater) are pure functions with clear input/output behavior
- Data transformation logic (parsing, updating) has universal properties (round-trips, invariants)
- File operations have testable properties (isolation, preservation)
- UI rendering has predictable properties (one-to-one correspondence between data and display)

**Library**: Use **fast-check** for TypeScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Seed-based reproducibility for failed tests
- Shrinking enabled to find minimal failing cases

**Property Test Implementation**:

Each property from the Correctness Properties section SHALL be implemented as a property-based test with the following tag format:

```typescript
// Feature: chat-demo, Property 1: Date Format Consistency
test('date formatting produces YYYY-MM-DD format', () => {
  fc.assert(
    fc.property(fc.date(), (date) => {
      const formatted = formatDateForNews(date);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Additional assertions...
    }),
    { numRuns: 100 }
  );
});
```

### Unit Testing

**Purpose**: Test specific examples, edge cases, and error conditions that complement property tests.

**Focus Areas**:

1. **Specific Error Conditions** (Requirements 6.x):
   - Missing news directory → error message
   - Invalid API key → authentication error
   - Network unavailable → network error
   - Service unavailable → service error
   - Permission denied → permission error

2. **Boundary Conditions**:
   - Empty story arrays
   - Single story in file
   - Very long descriptions (near max length)
   - Special characters in text

3. **Configuration**:
   - Missing environment variables
   - Invalid configuration values

**Example Unit Tests**:

```typescript
describe('NewsLoader error handling', () => {
  test('returns error when news directory does not exist', async () => {
    const result = await loadTodayNews('/nonexistent/path');
    expect(result.error).toContain('news folder');
    expect(result.stories).toEqual([]);
  });

  test('returns error when permission denied', async () => {
    // Mock fs.readdir to throw EACCES
    const result = await loadTodayNews('/restricted/path');
    expect(result.error).toContain('permission denied');
  });
});
```

### Integration Testing

**Purpose**: Verify integration with external services (OpenAI, Kokoro) and end-to-end workflows.

**Scope**:

1. **OpenAI Integration** (Requirements 2.1, 2.6):
   - Verify API calls with correct parameters
   - Verify summary quality (manual review of samples)
   - Test with real API in staging environment

2. **Kokoro TTS Integration** (Requirements 4.1, 4.5):
   - Verify API calls with correct parameters
   - Verify audio format and playability
   - Test with real service in staging environment

3. **End-to-End Workflows**:
   - Load stories → Generate summaries → Update files → Generate TTS → Play audio
   - Error recovery flows

**Mocking Strategy**:

- **Unit/Property Tests**: Mock all external services (OpenAI, Kokoro, file system)
- **Integration Tests**: Use real services in test/staging environment
- **E2E Tests**: Use real services with test data

### Test Organization

```
__tests__/
  unit/
    newsLoader.test.ts
    summaryGenerator.test.ts
    storyUpdater.test.ts
    ttsGenerator.test.ts
  property/
    newsLoader.property.test.ts
    storyUpdater.property.test.ts
    ui.property.test.ts
  integration/
    openai.integration.test.ts
    kokoro.integration.test.ts
    e2e.integration.test.ts
```

### Test Data Management

**Fixtures**:
- Sample news JSON files with various structures
- Mock API responses (OpenAI, Kokoro)
- Test audio files

**Generators** (for property tests):
```typescript
// Custom generators for domain objects
const storyArbitrary = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ minLength: 1, maxLength: 5000 }),
  summary: fc.string({ maxLength: 500 })
});

const newsFileArbitrary = fc.array(storyArbitrary, { minLength: 1, maxLength: 10 });
```

### Coverage Goals

- **Line Coverage**: Minimum 80%
- **Branch Coverage**: Minimum 75%
- **Property Coverage**: 100% of correctness properties implemented as tests
- **Error Path Coverage**: All error conditions tested

### Continuous Integration

**Pre-commit**:
- Run unit tests
- Run linting and type checking

**CI Pipeline**:
- Run all unit and property tests
- Run integration tests (with mocked services)
- Generate coverage reports
- Run E2E tests (staging environment only)

**Test Execution Time**:
- Unit tests: < 10 seconds
- Property tests: < 30 seconds
- Integration tests: < 2 minutes
- E2E tests: < 5 minutes

### Testing External Dependencies

**OpenAI API**:
- Use `nock` or `msw` to mock HTTP requests in unit tests
- Use test API keys in integration tests
- Monitor API usage and costs

**Kokoro TTS**:
- Mock the service endpoint in unit tests
- Use test deployment in integration tests
- Cache generated audio for repeated tests

**File System**:
- Use `memfs` for in-memory file system in unit tests
- Use temporary directories for integration tests
- Clean up test files after each test

### Test Maintenance

**Updating Tests**:
- When requirements change, update corresponding properties first
- Update property tests to match new properties
- Update unit tests for new edge cases

**Flaky Test Prevention**:
- Avoid time-dependent tests (mock Date.now())
- Avoid network-dependent tests (mock external services)
- Use deterministic random seeds for property tests
- Clean up resources in afterEach hooks

