// Shared types for the chat demo page

/**
 * Story interface representing a news story
 */
export interface Story {
  title: string;       // headline text
  description: string; // full story description
  summary: string;     // AI-generated summary; empty string if not yet generated
}

/**
 * NewsLoadResult interface for news loading operations
 */
export interface NewsLoadResult {
  stories: Story[];    // parsed stories; empty array on any error
  error: string | null; // human-readable error message, or null on success
}

/**
 * SummaryResult interface for AI summary generation
 */
export interface SummaryResult {
  storyIndex: number;  // index into the stories array
  summary: string | null; // generated text, or null on error/skip
  error: string | null;   // error message if generation failed
}

/**
 * UpdateResult interface for update operations
 */
export interface UpdateResult {
  success: boolean;
  error: string | null;
}

/**
 * TtsResult interface for text-to-speech operations
 */
export interface TtsResult {
  audioBuffer: Buffer | null;
  contentType: string;   // e.g. "audio/wav"
  error: string | null;
}
