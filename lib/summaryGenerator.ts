import OpenAI from 'openai';
import type { Story, SummaryResult } from './types';

/**
 * Initialize OpenAI client
 * @returns OpenAI client instance or throws error
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  return new OpenAI({ apiKey });
}

/**
 * Check if a story needs summarization
 * @param story - Story to check
 * @returns true if summary field is empty or whitespace
 */
export function needsSummary(story: Story): boolean {
  return !story.summary || story.summary.trim() === '';
}

/**
 * Generate a summary for a single story
 * @param story - Story object with description field
 * @param storyIndex - Index of the story in the array
 * @returns SummaryResult with generated summary or error
 */
export async function generateSummary(
  story: Story,
  storyIndex: number
): Promise<SummaryResult> {
  // Skip if story already has a summary
  if (!needsSummary(story)) {
    return {
      storyIndex,
      summary: null,
      error: null
    };
  }
  
  try {
    const client = getOpenAIClient();
    
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a news summarization assistant. Generate concise, factual summaries.'
        },
        {
          role: 'user',
          content: `Summarize the following news story in exactly 3 concise sentences:\n\n${story.description}`
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    });
    
    const summary = completion.choices[0]?.message?.content?.trim();
    
    if (!summary) {
      return {
        storyIndex,
        summary: null,
        error: 'OpenAI API returned an empty response'
      };
    }
    
    return {
      storyIndex,
      summary,
      error: null
    };
  } catch (error) {
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return {
          storyIndex,
          summary: null,
          error: 'OpenAI API key is missing. Please set OPENAI_API_KEY environment variable.'
        };
      }
      
      if (error.message.includes('401') || error.message.includes('authentication')) {
        return {
          storyIndex,
          summary: null,
          error: 'OpenAI API authentication failed. Please verify your API key is valid.'
        };
      }
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return {
          storyIndex,
          summary: null,
          error: 'OpenAI API rate limit exceeded. Please try again later.'
        };
      }
      
      if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        return {
          storyIndex,
          summary: null,
          error: 'Network error: Unable to connect to OpenAI API. Please check your internet connection.'
        };
      }
      
      return {
        storyIndex,
        summary: null,
        error: `Failed to generate summary: ${error.message}`
      };
    }
    
    return {
      storyIndex,
      summary: null,
      error: 'An unknown error occurred while generating the summary'
    };
  }
}
