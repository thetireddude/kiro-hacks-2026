import type { Story, TtsResult } from './types';

/**
 * Get text to convert to speech (summary if available, else description)
 * @param story - Story object
 * @returns Text string for TTS
 */
function getTextForTTS(story: Story): string {
  // Use summary if available and non-empty, otherwise use description
  if (story.summary && story.summary.trim() !== '') {
    return story.summary;
  }
  return story.description;
}

/**
 * Call Kokoro-82M API
 * @param text - Text to convert
 * @returns Audio buffer
 */
async function callKokoroAPI(text: string): Promise<Buffer> {
  const apiUrl = process.env.KOKORO_API_URL;
  
  if (!apiUrl) {
    throw new Error('KOKORO_API_URL environment variable is not set');
  }
  
  const response = await fetch(`${apiUrl}/v1/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'kokoro',
      voice: 'af_bella',
      input: text,
      response_format: 'mp3'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Kokoro API error: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate audio for a story
 * @param story - Story with summary or description
 * @returns TtsResult with audio buffer or error
 */
export async function generateTTS(story: Story): Promise<TtsResult> {
  try {
    const text = getTextForTTS(story);
    
    // Validate text is not empty
    if (!text || text.trim() === '') {
      return {
        audioBuffer: null,
        contentType: '',
        error: 'Cannot generate audio: story has no text content'
      };
    }
    
    const audioBuffer = await callKokoroAPI(text);
    
    return {
      audioBuffer,
      contentType: 'audio/mp3',
      error: null
    };
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific errors
      if (error.message.includes('KOKORO_API_URL')) {
        return {
          audioBuffer: null,
          contentType: '',
          error: 'TTS service URL is not configured. Please set KOKORO_API_URL environment variable.'
        };
      }
      
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        return {
          audioBuffer: null,
          contentType: '',
          error: 'TTS service is unavailable. Please ensure the Kokoro service is running.'
        };
      }
      
      if (error.message.includes('timeout')) {
        return {
          audioBuffer: null,
          contentType: '',
          error: 'TTS service timeout. The request took too long to complete.'
        };
      }
      
      return {
        audioBuffer: null,
        contentType: '',
        error: `Failed to generate audio: ${error.message}`
      };
    }
    
    return {
      audioBuffer: null,
      contentType: '',
      error: 'An unknown error occurred while generating audio'
    };
  }
}
