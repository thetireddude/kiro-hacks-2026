'use client';

import { useState, useCallback } from 'react';
import type { Story } from '@/lib/types';
import { generateSummaryAction } from './actions';

interface ChatDemoClientProps {
  initialStories: Story[];
}

export default function ChatDemoClient({ initialStories }: ChatDemoClientProps) {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Map<number, string>>(new Map());
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  const handleGenerateSummary = useCallback(async (storyIndex: number) => {
    const story = stories[storyIndex];
    if (!story) return;

    // Skip if already has summary
    if (story.summary && story.summary.trim() !== '') {
      return;
    }

    setLoadingSummary(prev => new Set(prev).add(storyIndex));
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(storyIndex);
      return newErrors;
    });

    try {
      const result = await generateSummaryAction(
        `news/${new Date().toISOString().split('T')[0]}-sample.json`,
        storyIndex,
        story
      );

      if (result.error) {
        setErrors(prev => new Map(prev).set(storyIndex, result.error!));
      } else if (result.summary) {
        // Update the story with the new summary
        setStories(prev => {
          const updated = [...prev];
          updated[storyIndex] = {
            ...updated[storyIndex],
            summary: result.summary!
          };
          return updated;
        });
      }
    } catch (error) {
      setErrors(prev => new Map(prev).set(
        storyIndex,
        error instanceof Error ? error.message : 'Failed to generate summary'
      ));
    } finally {
      setLoadingSummary(prev => {
        const newSet = new Set(prev);
        newSet.delete(storyIndex);
        return newSet;
      });
    }
  }, [stories]);

  const handlePlay = useCallback(async (storyIndex: number) => {
    const story = stories[storyIndex];
    if (!story) return;

    // Stop any currently playing audio
    if (currentUtterance) {
      window.speechSynthesis.cancel();
      setCurrentUtterance(null);
      if (playingIndex === storyIndex) {
        setPlayingIndex(null);
        return;
      }
    }

    // Generate summary if needed
    if (!story.summary || story.summary.trim() === '') {
      await handleGenerateSummary(storyIndex);
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get the updated story
    const updatedStory = stories[storyIndex];
    const textToSpeak = updatedStory.summary || updatedStory.description;

    if (!textToSpeak) {
      setErrors(prev => new Map(prev).set(storyIndex, 'No text available to play'));
      return;
    }

    try {
      // Use browser's built-in speech synthesis
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setPlayingIndex(storyIndex);
      };

      utterance.onend = () => {
        setPlayingIndex(null);
        setCurrentUtterance(null);
      };

      utterance.onerror = (event) => {
        setErrors(prev => new Map(prev).set(
          storyIndex,
          `Speech synthesis error: ${event.error}`
        ));
        setPlayingIndex(null);
        setCurrentUtterance(null);
      };

      setCurrentUtterance(utterance);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      setErrors(prev => new Map(prev).set(
        storyIndex,
        error instanceof Error ? error.message : 'Failed to play audio'
      ));
    }
  }, [stories, playingIndex, currentUtterance, handleGenerateSummary]);

  return (
    <div className="space-y-4">
      {stories.map((story, index) => (
        <article
          key={index}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-slate-200 dark:border-slate-700"
        >
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
            {story.title}
          </h2>
          
          {story.summary && story.summary.trim() !== '' ? (
            <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
              {story.summary}
            </p>
          ) : (
            <div className="mb-4">
              <p className="text-slate-500 dark:text-slate-400 italic mb-2">
                No summary available
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {story.description}
              </p>
            </div>
          )}

          <div className="flex gap-3 items-center">
            <button
              onClick={() => handlePlay(index)}
              disabled={loadingSummary.has(index)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${playingIndex === index
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                }
                disabled:bg-slate-300 disabled:cursor-not-allowed
                dark:disabled:bg-slate-600
              `}
            >
              {loadingSummary.has(index) ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Loading...
                </span>
              ) : playingIndex === index ? (
                '⏸ Stop'
              ) : (
                '▶ Play'
              )}
            </button>

            {!story.summary && !loadingSummary.has(index) && (
              <button
                onClick={() => handleGenerateSummary(index)}
                className="px-4 py-2 rounded-lg font-medium bg-green-500 hover:bg-green-600 text-white transition-all"
              >
                Generate Summary
              </button>
            )}
          </div>

          {errors.has(index) && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                {errors.get(index)}
              </p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
