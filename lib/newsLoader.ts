import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { NewsLoadResult, Story } from './types';

/**
 * Get today's date in the format used by news files (YYYY-MM-DD)
 * @returns Date string in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Find all JSON files matching today's date pattern
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Array of file paths
 */
async function findNewsFiles(dateString: string): Promise<string[]> {
  const newsDir = join(process.cwd(), 'news');
  
  try {
    const files = await readdir(newsDir);
    // Match files that start with the date pattern: YYYY-MM-DD-*.json
    const pattern = new RegExp(`^${dateString}-.*\\.json$`);
    return files
      .filter(file => pattern.test(file))
      .map(file => join(newsDir, file));
  } catch (error) {
    // If directory doesn't exist or can't be read, return empty array
    return [];
  }
}

/**
 * Parse a single news file
 * @param filePath - Path to JSON file
 * @returns Array of Story objects or throws error
 */
async function parseNewsFile(filePath: string): Promise<Story[]> {
  const content = await readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  if (!Array.isArray(data)) {
    throw new Error(`Invalid JSON structure in ${filePath}: expected an array`);
  }
  
  // Validate each story has required fields
  for (const story of data) {
    if (!story.title || !story.description || story.summary === undefined) {
      throw new Error(`Invalid story structure in ${filePath}: missing required fields`);
    }
  }
  
  return data as Story[];
}

/**
 * Loads all news stories for today's date
 * @returns NewsLoadResult with stories array and optional error
 */
export async function loadTodayNews(): Promise<NewsLoadResult> {
  try {
    const dateString = getTodayDateString();
    const newsFiles = await findNewsFiles(dateString);
    
    if (newsFiles.length === 0) {
      return {
        stories: [],
        error: `No news files found for today (${dateString}). Please add news files in the format: news/${dateString}-*.json`
      };
    }
    
    // Parse all files and combine stories
    const allStories: Story[] = [];
    for (const filePath of newsFiles) {
      try {
        const stories = await parseNewsFile(filePath);
        allStories.push(...stories);
      } catch (error) {
        const fileName = filePath.split('/').pop() || filePath;
        return {
          stories: [],
          error: `Failed to parse news file '${fileName}': ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
    
    return {
      stories: allStories,
      error: null
    };
  } catch (error) {
    return {
      stories: [],
      error: `Failed to load news: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
