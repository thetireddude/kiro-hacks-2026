/**
 * Unit tests for audio processor functions
 * 
 * Tests cover:
 * - Volume calculation with various audio patterns
 * - Voice activity detection with different thresholds
 * - Audio format conversion for transcription
 */

import {
  calculateVolume,
  detectVoiceActivity,
  prepareAudioForTranscription,
} from './processor';

describe('calculateVolume', () => {
  it('returns 0 for silent audio', () => {
    const silentData = new Float32Array(1024).fill(0);
    expect(calculateVolume(silentData)).toBe(0);
  });

  it('returns 0 for empty audio data', () => {
    const emptyData = new Float32Array(0);
    expect(calculateVolume(emptyData)).toBe(0);
  });

  it('returns value between 0 and 1 for normal audio', () => {
    const audioData = new Float32Array(1024).fill(0.5);
    const volume = calculateVolume(audioData);
    expect(volume).toBeGreaterThan(0);
    expect(volume).toBeLessThanOrEqual(1);
  });

  it('handles clipping at maximum volume', () => {
    const loudData = new Float32Array(1024).fill(1.0);
    expect(calculateVolume(loudData)).toBe(1);
  });

  it('calculates correct RMS for known values', () => {
    // For a constant value, RMS equals the absolute value
    const audioData = new Float32Array(100).fill(0.5);
    const volume = calculateVolume(audioData);
    expect(volume).toBeCloseTo(0.5, 5);
  });

  it('handles mixed positive and negative values', () => {
    const audioData = new Float32Array(100);
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = i % 2 === 0 ? 0.5 : -0.5;
    }
    const volume = calculateVolume(audioData);
    expect(volume).toBeCloseTo(0.5, 5);
  });

  it('handles very quiet audio', () => {
    const quietData = new Float32Array(1024).fill(0.001);
    const volume = calculateVolume(quietData);
    expect(volume).toBeGreaterThan(0);
    expect(volume).toBeLessThan(0.01);
  });

  it('clamps values above 1.0', () => {
    // Create audio data that would result in RMS > 1
    const audioData = new Float32Array(100).fill(2.0);
    const volume = calculateVolume(audioData);
    expect(volume).toBe(1);
  });

  it('handles negative values correctly', () => {
    const audioData = new Float32Array(100).fill(-0.5);
    const volume = calculateVolume(audioData);
    // RMS of -0.5 should be 0.5 (same as +0.5)
    expect(volume).toBeCloseTo(0.5, 5);
  });
});

describe('detectVoiceActivity', () => {
  it('detects voice activity above threshold', () => {
    const audioData = new Float32Array(1024).fill(0.1);
    const isActive = detectVoiceActivity(audioData, 0.05);
    expect(isActive).toBe(true);
  });

  it('does not detect voice activity below threshold', () => {
    const audioData = new Float32Array(1024).fill(0.01);
    const isActive = detectVoiceActivity(audioData, 0.05);
    expect(isActive).toBe(false);
  });

  it('detects voice activity at exact threshold', () => {
    // For a constant value of 0.05, RMS = 0.05
    // But we need to account for floating point precision
    const audioData = new Float32Array(1024).fill(0.05);
    const volume = calculateVolume(audioData);
    const isActive = detectVoiceActivity(audioData, 0.05);
    
    // Volume should be very close to 0.05 (within floating point precision)
    expect(volume).toBeCloseTo(0.05, 5);
    // At exact threshold, should not be detected (> not >=)
    // But due to floating point, it might be slightly above
    expect(isActive).toBe(volume > 0.05);
  });

  it('handles silent audio', () => {
    const silentData = new Float32Array(1024).fill(0);
    const isActive = detectVoiceActivity(silentData, 0.01);
    expect(isActive).toBe(false);
  });

  it('handles empty audio data', () => {
    const emptyData = new Float32Array(0);
    const isActive = detectVoiceActivity(emptyData, 0.01);
    expect(isActive).toBe(false);
  });

  it('works with different threshold values', () => {
    const audioData = new Float32Array(1024).fill(0.05);
    const volume = calculateVolume(audioData);
    
    // Volume should be very close to 0.05 (within floating point precision)
    expect(volume).toBeCloseTo(0.05, 5);
    
    // Test with thresholds below, at, and above the volume
    expect(detectVoiceActivity(audioData, 0.01)).toBe(true);
    expect(detectVoiceActivity(audioData, 0.04)).toBe(true);
    expect(detectVoiceActivity(audioData, 0.1)).toBe(false);
  });

  it('detects loud audio with low threshold', () => {
    const loudData = new Float32Array(1024).fill(0.8);
    const isActive = detectVoiceActivity(loudData, 0.02);
    expect(isActive).toBe(true);
  });

  it('handles varying audio levels', () => {
    const audioData = new Float32Array(1000);
    // Create audio with varying levels
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = Math.sin(i * 0.1) * 0.1;
    }
    const isActive = detectVoiceActivity(audioData, 0.05);
    // RMS of sine wave with amplitude 0.1 is ~0.07
    expect(isActive).toBe(true);
  });

  it('uses calculateVolume internally', () => {
    const audioData = new Float32Array(100).fill(0.5);
    const volume = calculateVolume(audioData);
    const isActive = detectVoiceActivity(audioData, 0.4);
    
    // If volume > 0.4, should be active
    expect(isActive).toBe(volume > 0.4);
  });
});

describe('prepareAudioForTranscription', () => {
  it('returns blob as-is for supported webm format', async () => {
    const originalBlob = new Blob(['audio data'], { type: 'audio/webm' });
    const result = await prepareAudioForTranscription(originalBlob);
    
    expect(result.type).toBe('audio/webm');
    expect(result.size).toBe(originalBlob.size);
  });

  it('returns blob as-is for supported mp3 format', async () => {
    const originalBlob = new Blob(['audio data'], { type: 'audio/mp3' });
    const result = await prepareAudioForTranscription(originalBlob);
    
    expect(result.type).toBe('audio/mp3');
    expect(result.size).toBe(originalBlob.size);
  });

  it('returns blob as-is for supported wav format', async () => {
    const originalBlob = new Blob(['audio data'], { type: 'audio/wav' });
    const result = await prepareAudioForTranscription(originalBlob);
    
    expect(result.type).toBe('audio/wav');
    expect(result.size).toBe(originalBlob.size);
  });

  it('returns blob as-is for supported ogg format', async () => {
    const originalBlob = new Blob(['audio data'], { type: 'audio/ogg' });
    const result = await prepareAudioForTranscription(originalBlob);
    
    expect(result.type).toBe('audio/ogg');
    expect(result.size).toBe(originalBlob.size);
  });

  it('returns blob as-is for supported mp4 format', async () => {
    const originalBlob = new Blob(['audio data'], { type: 'audio/mp4' });
    const result = await prepareAudioForTranscription(originalBlob);
    
    expect(result.type).toBe('audio/mp4');
    expect(result.size).toBe(originalBlob.size);
  });

  it('returns blob as-is for supported m4a format', async () => {
    const originalBlob = new Blob(['audio data'], { type: 'audio/m4a' });
    const result = await prepareAudioForTranscription(originalBlob);
    
    expect(result.type).toBe('audio/m4a');
    expect(result.size).toBe(originalBlob.size);
  });

  it('returns blob as-is for supported mpeg format', async () => {
    const originalBlob = new Blob(['audio data'], { type: 'audio/mpeg' });
    const result = await prepareAudioForTranscription(originalBlob);
    
    expect(result.type).toBe('audio/mpeg');
    expect(result.size).toBe(originalBlob.size);
  });

  it('adds webm type for blob without type', async () => {
    const originalBlob = new Blob(['audio data']);
    const result = await prepareAudioForTranscription(originalBlob);
    
    expect(result.type).toBe('audio/webm');
    expect(result.size).toBe(originalBlob.size);
  });

  it('handles empty blob', async () => {
    const emptyBlob = new Blob([], { type: 'audio/webm' });
    const result = await prepareAudioForTranscription(emptyBlob);
    
    // Empty blob should still be returned
    expect(result.size).toBe(0);
  });

  it('handles case-insensitive type matching', async () => {
    const originalBlob = new Blob(['audio data'], { type: 'audio/WEBM' });
    const result = await prepareAudioForTranscription(originalBlob);
    
    // MIME types are case-insensitive and typically normalized to lowercase
    // The function should recognize 'audio/WEBM' as supported and return the blob
    expect(result.type.toLowerCase()).toBe('audio/webm');
    expect(result.size).toBe(originalBlob.size);
  });

  it('handles type with additional parameters', async () => {
    const originalBlob = new Blob(['audio data'], { 
      type: 'audio/webm; codecs=opus' 
    });
    const result = await prepareAudioForTranscription(originalBlob);
    
    expect(result.type).toBe('audio/webm; codecs=opus');
    expect(result.size).toBe(originalBlob.size);
  });

  it('preserves blob content', async () => {
    const content = 'test audio data';
    const originalBlob = new Blob([content], { type: 'audio/webm' });
    const result = await prepareAudioForTranscription(originalBlob);
    
    // Use FileReader to read blob content (more compatible)
    const resultText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(result);
    });
    
    expect(resultText).toBe(content);
  });

  it('handles x-m4a format variant', async () => {
    const originalBlob = new Blob(['audio data'], { type: 'audio/x-m4a' });
    const result = await prepareAudioForTranscription(originalBlob);
    
    expect(result.type).toBe('audio/x-m4a');
    expect(result.size).toBe(originalBlob.size);
  });
});
