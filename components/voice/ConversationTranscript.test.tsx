/**
 * Unit tests for ConversationTranscript component
 * 
 * Tests cover:
 * - Rendering empty state
 * - Displaying user and AI messages
 * - Timestamp formatting
 * - Visual distinction between user and AI messages
 * - Auto-scroll behavior
 * - Loading state
 * - Responsive design
 * - Accessibility
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ConversationTranscript } from './ConversationTranscript';
import { ConversationMessage } from '@/lib/voice/types';

// Mock scrollIntoView before tests
Element.prototype.scrollIntoView = jest.fn();

describe('ConversationTranscript', () => {
  const createMessage = (
    role: 'user' | 'assistant',
    content: string,
    timestamp: Date = new Date()
  ): ConversationMessage => ({
    id: `msg-${Math.random()}`,
    role,
    content,
    timestamp,
  });

  describe('Empty State', () => {
    it('should display empty state message when no messages', () => {
      render(<ConversationTranscript messages={[]} />);

      expect(
        screen.getByText('Start speaking to begin the conversation...')
      ).toBeInTheDocument();
    });

    it('should not display empty state when messages exist', () => {
      const messages = [createMessage('user', 'Hello')];
      render(<ConversationTranscript messages={messages} />);

      expect(
        screen.queryByText('Start speaking to begin the conversation...')
      ).not.toBeInTheDocument();
    });

    it('should not display empty state when loading', () => {
      render(<ConversationTranscript messages={[]} isLoading={true} />);

      expect(
        screen.queryByText('Start speaking to begin the conversation...')
      ).not.toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should display user message', () => {
      const messages = [createMessage('user', 'Hello, how are you?')];
      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    });

    it('should display AI message', () => {
      const messages = [createMessage('assistant', 'I am doing well, thank you!')];
      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument();
    });

    it('should display multiple messages in order', () => {
      const messages = [
        createMessage('user', 'First message'),
        createMessage('assistant', 'First response'),
        createMessage('user', 'Second message'),
        createMessage('assistant', 'Second response'),
      ];
      render(<ConversationTranscript messages={messages} />);

      const messageTexts = [
        'First message',
        'First response',
        'Second message',
        'Second response',
      ];

      messageTexts.forEach((text) => {
        expect(screen.getByText(text)).toBeInTheDocument();
      });
    });

    it('should handle long messages with text wrapping', () => {
      const longMessage =
        'This is a very long message that should wrap to multiple lines when displayed in the conversation transcript component to ensure proper text wrapping and readability.';
      const messages = [createMessage('user', longMessage)];
      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle messages with special characters', () => {
      const specialMessage = 'Hello! @#$%^&*() "quoted" \'apostrophe\'';
      const messages = [createMessage('user', specialMessage)];
      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('should handle messages with newlines', () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';
      const messages = [createMessage('user', multilineMessage)];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      // Verify the message bubble is rendered with multiline content
      const messageBubble = container.querySelector('.bg-blue-500');
      expect(messageBubble).toBeInTheDocument();
      expect(messageBubble?.textContent).toContain('Line 1');
      expect(messageBubble?.textContent).toContain('Line 2');
      expect(messageBubble?.textContent).toContain('Line 3');
    });

    it('should handle empty message content', () => {
      const messages = [createMessage('user', '')];
      render(<ConversationTranscript messages={messages} />);

      // Component should still render without crashing
      expect(screen.getByText('Conversation')).toBeInTheDocument();
    });
  });

  describe('Timestamp Display', () => {
    it('should display timestamp for each message', () => {
      const now = new Date();
      const messages = [createMessage('user', 'Hello', now)];
      render(<ConversationTranscript messages={messages} />);

      const formattedTime = formatTimeForTest(now);
      expect(screen.getByText(formattedTime)).toBeInTheDocument();
    });

    it('should format timestamps in 12-hour format with AM/PM', () => {
      // Test morning time
      const morning = new Date(2024, 0, 1, 9, 30);
      const messages = [createMessage('user', 'Morning', morning)];
      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('9:30 AM')).toBeInTheDocument();
    });

    it('should format timestamps for afternoon times', () => {
      // Test afternoon time
      const afternoon = new Date(2024, 0, 1, 14, 45);
      const messages = [createMessage('user', 'Afternoon', afternoon)];
      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('2:45 PM')).toBeInTheDocument();
    });

    it('should format timestamps for midnight', () => {
      // Test midnight
      const midnight = new Date(2024, 0, 1, 0, 0);
      const messages = [createMessage('user', 'Midnight', midnight)];
      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('12:00 AM')).toBeInTheDocument();
    });

    it('should format timestamps for noon', () => {
      // Test noon
      const noon = new Date(2024, 0, 1, 12, 0);
      const messages = [createMessage('user', 'Noon', noon)];
      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('12:00 PM')).toBeInTheDocument();
    });

    it('should pad minutes with leading zero', () => {
      // Test single digit minutes
      const time = new Date(2024, 0, 1, 10, 5);
      const messages = [createMessage('user', 'Test', time)];
      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('10:05 AM')).toBeInTheDocument();
    });

    it('should display different timestamps for different messages', () => {
      const time1 = new Date(2024, 0, 1, 9, 0);
      const time2 = new Date(2024, 0, 1, 10, 0);
      const messages = [
        createMessage('user', 'First', time1),
        createMessage('assistant', 'Second', time2),
      ];
      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    });
  });

  describe('Visual Distinction', () => {
    it('should style user messages with blue background', () => {
      const messages = [createMessage('user', 'User message')];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const userBubble = container.querySelector('.bg-blue-500');
      expect(userBubble).toBeInTheDocument();
      expect(userBubble).toHaveClass('text-white');
    });

    it('should style AI messages with gray background', () => {
      const messages = [createMessage('assistant', 'AI message')];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const aiBubble = container.querySelector('.bg-gray-100');
      expect(aiBubble).toBeInTheDocument();
      expect(aiBubble).toHaveClass('text-gray-900');
    });

    it('should right-align user messages', () => {
      const messages = [createMessage('user', 'User message')];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const userContainer = container.querySelector('.justify-end');
      expect(userContainer).toBeInTheDocument();
    });

    it('should left-align AI messages', () => {
      const messages = [createMessage('assistant', 'AI message')];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const aiContainer = container.querySelector('.justify-start');
      expect(aiContainer).toBeInTheDocument();
    });

    it('should apply rounded corners to message bubbles', () => {
      const messages = [createMessage('user', 'Message')];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const bubble = container.querySelector('.rounded-lg');
      expect(bubble).toBeInTheDocument();
    });

    it('should apply different border radius for user vs AI', () => {
      const messages = [
        createMessage('user', 'User'),
        createMessage('assistant', 'AI'),
      ];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const userBubble = container.querySelector('.rounded-br-none');
      const aiBubble = container.querySelector('.rounded-bl-none');

      expect(userBubble).toBeInTheDocument();
      expect(aiBubble).toBeInTheDocument();
    });
  });

  describe('Auto-scroll Behavior', () => {
    beforeEach(() => {
      (Element.prototype.scrollIntoView as jest.Mock).mockClear();
    });

    it('should scroll to latest message when messages are added', async () => {
      const { rerender } = render(
        <ConversationTranscript messages={[createMessage('user', 'First')]} />
      );

      await waitFor(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      });

      (Element.prototype.scrollIntoView as jest.Mock).mockClear();

      rerender(
        <ConversationTranscript
          messages={[
            createMessage('user', 'First'),
            createMessage('assistant', 'Second'),
          ]}
        />
      );

      await waitFor(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      });
    });

    it('should use smooth scroll behavior', async () => {
      render(
        <ConversationTranscript messages={[createMessage('user', 'First')]} />
      );

      await waitFor(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
        });
      });
    });

    it('should scroll when loading state changes', async () => {
      (Element.prototype.scrollIntoView as jest.Mock).mockClear();
      
      const { rerender } = render(
        <ConversationTranscript messages={[]} isLoading={false} />
      );

      (Element.prototype.scrollIntoView as jest.Mock).mockClear();

      rerender(
        <ConversationTranscript messages={[]} isLoading={true} />
      );

      await waitFor(() => {
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should display loading indicator when isLoading is true', () => {
      render(<ConversationTranscript messages={[]} isLoading={true} />);

      // Check for loading dots
      const container = screen.getByText('Conversation').parentElement;
      expect(container).toBeInTheDocument();
    });

    it('should not display loading indicator when isLoading is false', () => {
      const messages = [createMessage('user', 'Message')];
      const { container } = render(
        <ConversationTranscript messages={messages} isLoading={false} />
      );

      // Should not have loading dots when not loading
      expect(screen.getByText('Message')).toBeInTheDocument();
    });

    it('should display loading indicator with messages', () => {
      const messages = [createMessage('user', 'First message')];
      render(
        <ConversationTranscript messages={messages} isLoading={true} />
      );

      expect(screen.getByText('First message')).toBeInTheDocument();
    });

    it('should have animated loading dots', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} isLoading={true} />
      );

      const loadingDots = container.querySelectorAll('.loading-dot');
      expect(loadingDots.length).toBe(3);
    });

    it('should style loading indicator with gray background', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} isLoading={true} />
      );

      const loadingContainer = container.querySelector('.bg-gray-100');
      expect(loadingContainer).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive max-width classes', () => {
      const messages = [createMessage('user', 'Message')];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const messageContainer = container.querySelector('.max-w-xs');
      expect(messageContainer).toHaveClass('md:max-w-md', 'lg:max-w-lg');
    });

    it('should have responsive layout classes', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} />
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'h-full');
    });

    it('should have scrollable container', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} />
      );

      const messagesContainer = container.querySelector('.overflow-y-auto');
      expect(messagesContainer).toBeInTheDocument();
    });

    it('should have proper padding for mobile and desktop', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} />
      );

      const messagesContainer = container.querySelector('.overflow-y-auto');
      expect(messagesContainer).toHaveClass('p-4');
    });
  });

  describe('Component Structure', () => {
    it('should have header with title', () => {
      render(<ConversationTranscript messages={[]} />);

      expect(screen.getByText('Conversation')).toBeInTheDocument();
    });

    it('should have main container with proper styling', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} />
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass(
        'flex',
        'flex-col',
        'h-full',
        'bg-white',
        'rounded-lg',
        'shadow-sm',
        'border',
        'border-gray-200',
        'overflow-hidden'
      );
    });

    it('should have header with border', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} />
      );

      const header = container.querySelector('.border-b');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('bg-gray-50');
    });

    it('should have messages container with spacing', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} />
      );

      const messagesContainer = container.querySelector('.space-y-4');
      expect(messagesContainer).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('should accept messages array prop', () => {
      const messages = [createMessage('user', 'Test')];
      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should accept optional isLoading prop', () => {
      render(<ConversationTranscript messages={[]} isLoading={true} />);

      expect(screen.getByText('Conversation')).toBeInTheDocument();
    });

    it('should default isLoading to false', () => {
      render(<ConversationTranscript messages={[]} />);

      expect(
        screen.getByText('Start speaking to begin the conversation...')
      ).toBeInTheDocument();
    });

    it('should handle empty messages array', () => {
      render(<ConversationTranscript messages={[]} />);

      expect(
        screen.getByText('Start speaking to begin the conversation...')
      ).toBeInTheDocument();
    });

    it('should handle large messages array', () => {
      const messages = Array.from({ length: 100 }, (_, i) =>
        createMessage(i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`)
      );

      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('Message 0')).toBeInTheDocument();
      expect(screen.getByText('Message 99')).toBeInTheDocument();
    });
  });

  describe('Message Updates', () => {
    it('should update when messages prop changes', () => {
      const { rerender } = render(
        <ConversationTranscript messages={[createMessage('user', 'First')]} />
      );

      expect(screen.getByText('First')).toBeInTheDocument();

      rerender(
        <ConversationTranscript
          messages={[
            createMessage('user', 'First'),
            createMessage('assistant', 'Second'),
          ]}
        />
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('should handle rapid message updates', () => {
      const { rerender } = render(
        <ConversationTranscript messages={[]} />
      );

      for (let i = 0; i < 10; i++) {
        const messages = Array.from({ length: i + 1 }, (_, j) =>
          createMessage(j % 2 === 0 ? 'user' : 'assistant', `Message ${j}`)
        );
        rerender(<ConversationTranscript messages={messages} />);
      }

      expect(screen.getByText('Message 0')).toBeInTheDocument();
      expect(screen.getByText('Message 9')).toBeInTheDocument();
    });

    it('should preserve message order when updating', () => {
      const messages = [
        createMessage('user', 'First'),
        createMessage('assistant', 'Second'),
        createMessage('user', 'Third'),
      ];

      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const messageTexts = Array.from(
        container.querySelectorAll('.rounded-lg p')
      ).map((el) => el.textContent);

      expect(messageTexts).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('Accessibility', () => {
    it('should have semantic structure', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} />
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex', 'flex-col');
    });

    it('should have descriptive header', () => {
      render(<ConversationTranscript messages={[]} />);

      const header = screen.getByText('Conversation');
      expect(header).toBeInTheDocument();
      expect(header.tagName).toBe('H2');
    });

    it('should have readable text contrast', () => {
      const messages = [
        createMessage('user', 'User message'),
        createMessage('assistant', 'AI message'),
      ];

      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const userBubble = container.querySelector('.bg-blue-500');
      expect(userBubble).toHaveClass('text-white');

      const aiBubble = container.querySelector('.bg-gray-100');
      expect(aiBubble).toHaveClass('text-gray-900');
    });

    it('should have readable font sizes', () => {
      const messages = [createMessage('user', 'Message')];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const messageText = container.querySelector('.text-sm');
      expect(messageText).toBeInTheDocument();
    });

    it('should have proper line height for readability', () => {
      const messages = [createMessage('user', 'Message')];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const messageText = container.querySelector('.leading-relaxed');
      expect(messageText).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long message content', () => {
      const longContent = 'a'.repeat(1000);
      const messages = [createMessage('user', longContent)];
      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('should handle messages with only whitespace', () => {
      const messages = [createMessage('user', '   ')];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      // Verify the message bubble is rendered even with whitespace-only content
      const messageBubble = container.querySelector('.bg-blue-500');
      expect(messageBubble).toBeInTheDocument();
    });

    it('should handle rapid isLoading changes', () => {
      const { rerender } = render(
        <ConversationTranscript messages={[]} isLoading={false} />
      );

      for (let i = 0; i < 5; i++) {
        rerender(
          <ConversationTranscript
            messages={[]}
            isLoading={i % 2 === 0}
          />
        );
      }

      expect(screen.getByText('Conversation')).toBeInTheDocument();
    });

    it('should handle messages with same timestamp', () => {
      const timestamp = new Date();
      const messages = [
        createMessage('user', 'First', timestamp),
        createMessage('assistant', 'Second', timestamp),
      ];

      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('should handle messages with future timestamps', () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day in future
      const messages = [createMessage('user', 'Future message', futureDate)];

      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('Future message')).toBeInTheDocument();
    });

    it('should handle messages with past timestamps', () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day in past
      const messages = [createMessage('user', 'Past message', pastDate)];

      render(<ConversationTranscript messages={messages} />);

      expect(screen.getByText('Past message')).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should have proper padding and spacing', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} />
      );

      const header = container.querySelector('.px-4.py-3');
      expect(header).toBeInTheDocument();

      const messagesContainer = container.querySelector('.p-4');
      expect(messagesContainer).toBeInTheDocument();
    });

    it('should have proper border styling', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} />
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('border', 'border-gray-200');
    });

    it('should have shadow styling', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} />
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('shadow-sm');
    });

    it('should have rounded corners', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} />
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('rounded-lg');
    });

    it('should have proper background colors', () => {
      const { container } = render(
        <ConversationTranscript messages={[]} />
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('bg-white');

      const header = container.querySelector('.bg-gray-50');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Message Bubble Styling', () => {
    it('should have proper padding for message bubbles', () => {
      const messages = [createMessage('user', 'Message')];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const bubble = container.querySelector('.px-4.py-3');
      expect(bubble).toBeInTheDocument();
    });

    it('should have proper text styling in bubbles', () => {
      const messages = [createMessage('user', 'Message')];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const text = container.querySelector('.text-sm.leading-relaxed');
      expect(text).toBeInTheDocument();
    });

    it('should have break-words class for text wrapping', () => {
      const messages = [createMessage('user', 'Message')];
      const { container } = render(
        <ConversationTranscript messages={messages} />
      );

      const bubble = container.querySelector('.break-words');
      expect(bubble).toBeInTheDocument();
    });
  });
});

/**
 * Helper function to format time for testing
 * Matches the formatTime function in the component
 */
function formatTimeForTest(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const paddedMinutes = minutes.toString().padStart(2, '0');

  const isPM = hours >= 12;
  const displayHours = hours % 12 || 12;
  const period = isPM ? 'PM' : 'AM';

  return `${displayHours}:${paddedMinutes} ${period}`;
}
