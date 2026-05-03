'use server';

import { generateSummary } from '@/lib/summaryGenerator';
import { updateStorySummary } from '@/lib/storyUpdater';
import { generateTTS } from '@/lib/ttsGenerator';
import { loadTodayNews } from '@/lib/newsLoader';
import type { Story, SummaryResult, TtsResult, NewsLoadResult } from '@/lib/types';

/**
 * Generate summary for a story and update the file
 */
export async function generateSummaryAction(
  filePath: string,
  storyIndex: number,
  story: Story
): Promise<SummaryResult> {
  try {
    // Generate the summary
    const summaryResult = await generateSummary(story, storyIndex);
    
    // If summary was generated successfully, update the file
    if (summaryResult.summary && !summaryResult.error) {
      const updateResult = await updateStorySummary(
        filePath,
        storyIndex,
        summaryResult.summary
      );
      
      if (!updateResult.success) {
        return {
          ...summaryResult,
          error: updateResult.error
        };
      }
    }
    
    return summaryResult;
  } catch (error) {
    return {
      storyIndex,
      summary: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generate TTS audio for a story
 */
export async function generateTTSAction(story: Story): Promise<TtsResult> {
  try {
    return await generateTTS(story);
  } catch (error) {
    return {
      audioBuffer: null,
      contentType: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Reload stories (after updates)
 */
export async function reloadStoriesAction(): Promise<NewsLoadResult> {
  try {
    return await loadTodayNews();
  } catch (error) {
    return {
      stories: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
