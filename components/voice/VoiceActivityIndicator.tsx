'use client';

import React from 'react';
import { ConversationState } from '@/lib/voice/types';

interface VoiceActivityIndicatorProps {
  state: ConversationState;
  volume?: number;
}

/**
 * VoiceActivityIndicator Component
 * 
 * Displays animated visual feedback for the current conversation state:
 * - listening: Shows volume levels during audio capture
 * - processing: Animated waveform indicating speech recognition
 * - thinking: Animated dots indicating AI response generation
 * - speaking: Animated pulse indicating audio playback
 * 
 * Validates: Requirements 6.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */
export function VoiceActivityIndicator({
  state,
  volume = 0,
}: VoiceActivityIndicatorProps): JSX.Element {
  return (
    <div className="flex items-center justify-center gap-2">
      {state === 'listening' && (
        <ListeningIndicator volume={volume} />
      )}
      {state === 'processing' && (
        <ProcessingIndicator />
      )}
      {state === 'thinking' && (
        <ThinkingIndicator />
      )}
      {state === 'speaking' && (
        <SpeakingIndicator />
      )}
    </div>
  );
}

/**
 * ListeningIndicator
 * Shows animated volume bars during audio capture
 * Volume prop (0-1) controls the height of the bars
 */
function ListeningIndicator({ volume }: { volume: number }): JSX.Element {
  // Create 5 bars with heights based on volume and a sine wave pattern
  const bars = Array.from({ length: 5 }, (_, i) => {
    // Create a wave pattern: each bar has a different base height
    const baseHeight = Math.sin((i / 5) * Math.PI) * 0.6 + 0.4;
    // Modulate by volume
    const height = Math.max(0.2, baseHeight * volume);
    return height;
  });

  return (
    <div className="flex items-end gap-1">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 bg-gradient-to-t from-blue-500 to-blue-300 rounded-full transition-all duration-75"
          style={{
            height: `${height * 32}px`,
            minHeight: '4px',
          }}
          aria-label={`Volume bar ${i + 1}`}
        />
      ))}
      <span className="ml-2 text-sm font-medium text-blue-600">Listening</span>
    </div>
  );
}

/**
 * ProcessingIndicator
 * Shows animated waveform during speech recognition
 */
function ProcessingIndicator(): JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <style>{`
        @keyframes wave {
          0%, 100% { height: 8px; }
          50% { height: 20px; }
        }
        .wave-bar {
          animation: wave 0.6s ease-in-out infinite;
        }
        .wave-bar:nth-child(1) { animation-delay: 0s; }
        .wave-bar:nth-child(2) { animation-delay: 0.1s; }
        .wave-bar:nth-child(3) { animation-delay: 0.2s; }
        .wave-bar:nth-child(4) { animation-delay: 0.1s; }
        .wave-bar:nth-child(5) { animation-delay: 0s; }
      `}</style>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="wave-bar w-1 bg-gradient-to-t from-amber-500 to-amber-300 rounded-full"
        />
      ))}
      <span className="ml-2 text-sm font-medium text-amber-600">Processing</span>
    </div>
  );
}

/**
 * ThinkingIndicator
 * Shows animated dots during AI response generation
 */
function ThinkingIndicator(): JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <style>{`
        @keyframes bounce {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-8px); }
        }
        .thinking-dot {
          animation: bounce 1.4s ease-in-out infinite;
        }
        .thinking-dot:nth-child(1) { animation-delay: 0s; }
        .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
        .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="thinking-dot w-2 h-2 bg-purple-500 rounded-full"
        />
      ))}
      <span className="ml-2 text-sm font-medium text-purple-600">Thinking</span>
    </div>
  );
}

/**
 * SpeakingIndicator
 * Shows animated pulse during audio playback
 */
function SpeakingIndicator(): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <style>{`
        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }
        .pulse-dot {
          animation: pulse-ring 2s infinite;
        }
      `}</style>
      <div className="relative w-4 h-4">
        <div className="pulse-dot absolute inset-0 bg-green-500 rounded-full" />
        <div className="absolute inset-1 bg-green-400 rounded-full animate-pulse" />
      </div>
      <span className="text-sm font-medium text-green-600">Speaking</span>
    </div>
  );
}
