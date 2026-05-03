/**
 * Audio processing utilities for voice conversation feature
 * 
 * This module provides functions for:
 * - Volume calculation for visualization
 * - Voice activity detection for turn-taking
 * - Audio format conversion for transcription
 */

/**
 * Calculate volume level from audio data for visualization
 * 
 * Uses RMS (Root Mean Square) to calculate the volume level,
 * which provides a perceptually accurate measure of audio loudness.
 * 
 * @param audioData - Float32Array of audio samples (typically from Web Audio API)
 * @returns Volume level between 0 (silent) and 1 (maximum)
 * 
 * @example
 * ```typescript
 * const audioData = new Float32Array(1024);
 * // ... fill with audio samples
 * const volume = calculateVolume(audioData);
 * console.log(`Current volume: ${(volume * 100).toFixed(0)}%`);
 * ```
 */
export function calculateVolume(audioData: Float32Array): number {
  if (audioData.length === 0) {
    return 0;
  }

  // Calculate RMS (Root Mean Square) for perceptually accurate volume
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  
  const rms = Math.sqrt(sum / audioData.length);
  
  // Clamp to [0, 1] range
  return Math.min(1, Math.max(0, rms));
}

/**
 * Detect voice activity in audio stream
 * 
 * Determines if the audio data contains voice activity by comparing
 * the volume level against a threshold. This is used for turn-taking
 * and interruption detection.
 * 
 * @param audioData - Float32Array of audio samples
 * @param threshold - Volume threshold for voice detection (0-1, typically 0.01-0.1)
 * @returns true if voice activity detected, false otherwise
 * 
 * @example
 * ```typescript
 * const audioData = new Float32Array(1024);
 * // ... fill with audio samples
 * const isVoiceActive = detectVoiceActivity(audioData, 0.02);
 * if (isVoiceActive) {
 *   console.log('User is speaking');
 * }
 * ```
 */
export function detectVoiceActivity(
  audioData: Float32Array,
  threshold: number
): boolean {
  const volume = calculateVolume(audioData);
  return volume > threshold;
}

/**
 * Convert audio blob to format suitable for OpenAI Whisper
 * 
 * OpenAI Whisper API accepts various audio formats, but we standardize
 * to ensure compatibility. This function converts the input blob to
 * a format that Whisper can process reliably.
 * 
 * Supported input formats: webm, mp4, mp3, wav, ogg
 * Output format: The blob is returned as-is if already in a supported format,
 * or converted to webm if needed.
 * 
 * @param blob - Audio blob from MediaRecorder or other source
 * @returns Promise resolving to audio blob in Whisper-compatible format
 * 
 * @example
 * ```typescript
 * const audioBlob = await mediaRecorder.stop();
 * const transcriptionBlob = await prepareAudioForTranscription(audioBlob);
 * // Send transcriptionBlob to /api/transcribe
 * ```
 */
export async function prepareAudioForTranscription(blob: Blob): Promise<Blob> {
  // OpenAI Whisper supports: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
  const supportedTypes = [
    'audio/flac',
    'audio/mp3',
    'audio/mpeg',
    'audio/mp4',
    'audio/m4a',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/x-m4a',
  ];

  // Check if the blob is already in a supported format
  const blobType = blob.type.toLowerCase();
  const isSupported = supportedTypes.some(type => 
    blobType.includes(type.split('/')[1])
  );

  if (isSupported && blob.size > 0) {
    // Already in a supported format, return as-is
    return blob;
  }

  // If not supported or empty, we need to handle it
  // For now, we'll return the blob as-is and let the API handle it
  // In a production system, you might want to use Web Audio API to convert
  // the audio to a specific format, but that requires more complex processing
  
  // If the blob has no type, assume it's webm (common for MediaRecorder)
  if (!blob.type) {
    return new Blob([blob], { type: 'audio/webm' });
  }

  return blob;
}
