'use client';

import React, { useEffect, useRef } from 'react';
import { ConversationMessage } from '@/lib/voice/types';

interface ConversationTranscriptProps {
  messages: ConversationMessage[];
  isLoading?: boolean;
}

/**
 * ConversationTranscript Component
 * 
 * Displays the conversation history with:
 * - User messages (right-aligned, blue background)
 * - AI messages (left-aligned, gray background)
 * - Timestamps for each message
 * - Auto-scroll to latest message
 * - Loading state indicator
 * - Responsive design for mobile and desktop
 * 
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 11.1, 11.2, 11.3
 */
export function ConversationTranscript({
  messages,
  isLoading = false,
}: ConversationTranscriptProps): JSX.Element {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message when messages change
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-center">
              Start speaking to begin the conversation...
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3 max-w-xs">
              <LoadingIndicator />
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

/**
 * MessageBubble Component
 * Renders individual message with role-based styling and timestamp
 */
function MessageBubble({ message }: { message: ConversationMessage }): JSX.Element {
  const isUser = message.role === 'user';
  const formattedTime = formatTime(message.timestamp);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex flex-col max-w-xs md:max-w-md lg:max-w-lg ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Message Bubble */}
        <div
          className={`rounded-lg px-4 py-3 break-words ${
            isUser
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-100 text-gray-900 rounded-bl-none'
          }`}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>

        {/* Timestamp */}
        <span
          className={`text-xs text-gray-500 mt-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
}

/**
 * LoadingIndicator Component
 * Shows animated dots while AI is generating response
 */
function LoadingIndicator(): JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <style>{`
        @keyframes dot-bounce {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-4px); }
        }
        .loading-dot {
          animation: dot-bounce 1.4s ease-in-out infinite;
        }
        .loading-dot:nth-child(1) { animation-delay: 0s; }
        .loading-dot:nth-child(2) { animation-delay: 0.2s; }
        .loading-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="loading-dot w-2 h-2 bg-gray-400 rounded-full"
        />
      ))}
    </div>
  );
}

/**
 * Format timestamp to readable time string
 * e.g., "2:30 PM" or "14:30"
 */
function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const paddedMinutes = minutes.toString().padStart(2, '0');

  // Use 12-hour format with AM/PM
  const isPM = hours >= 12;
  const displayHours = hours % 12 || 12;
  const period = isPM ? 'PM' : 'AM';

  return `${displayHours}:${paddedMinutes} ${period}`;
}
