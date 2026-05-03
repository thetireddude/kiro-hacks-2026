import { readFile, writeFile, rename } from 'fs/promises';
import { join } from 'path';
import type { Story, UpdateResult } from './types';

/**
 * Helper: Read and parse JSON file
 * @param filePath - Path to JSON file
 * @returns Array of Story objects
 */
async function readJsonFile(filePath: string): Promise<Story[]> {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as Story[];
}

/**
 * Helper: Write JSON file with formatting
 * @param filePath - Path to JSON file
 * @param stories - Array of Story objects
 */
async function writeJsonFile(filePath: string, stories: Story[]): Promise<void> {
  const content = JSON.stringify(stories, null, 2);
  
  // Atomic write using temp file + rename pattern
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, content, 'utf-8');
  await rename(tempPath, filePath);
}

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
): Promise<UpdateResult> {
  try {
    // Read the file
    const stories = await readJsonFile(filePath);
    
    // Validate story index
    if (storyIndex < 0 || storyIndex >= stories.length) {
      return {
        success: false,
        error: `Invalid story index ${storyIndex}. File contains ${stories.length} stories.`
      };
    }
    
    // Update only the summary field of the target story
    stories[storyIndex] = {
      ...stories[storyIndex],
      summary
    };
    
    // Write back to file
    await writeJsonFile(filePath, stories);
    
    return {
      success: true,
      error: null
    };
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific file system errors
      if (error.message.includes('ENOENT')) {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }
      
      if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
        return {
          success: false,
          error: `Permission denied: Cannot write to ${filePath}. Check file permissions.`
        };
      }
      
      if (error.message.includes('JSON')) {
        return {
          success: false,
          error: `Invalid JSON structure in ${filePath}: ${error.message}`
        };
      }
      
      return {
        success: false,
        error: `Failed to update story: ${error.message}`
      };
    }
    
    return {
      success: false,
      error: 'An unknown error occurred while updating the story'
    };
  }
}
