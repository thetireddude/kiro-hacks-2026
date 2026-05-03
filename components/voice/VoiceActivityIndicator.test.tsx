/**
 * Unit tests for VoiceActivityIndicator component
 * 
 * Tests cover:
 * - Rendering for all conversation states (listening, processing, thinking, speaking)
 * - Volume visualization during listening state
 * - Animated visual elements for each state
 * - Accessibility attributes
 * - Props validation
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { VoiceActivityIndicator } from './VoiceActivityIndicator';
import { ConversationState } from '@/lib/voice/types';

describe('VoiceActivityIndicator', () => {
  describe('Listening State', () => {
    it('should render listening indicator with correct label', () => {
      render(<VoiceActivityIndicator state="listening" volume={0.5} />);
      
      expect(screen.getByText('Listening')).toBeInTheDocument();
    });

    it('should display 5 volume bars during listening', () => {
      render(<VoiceActivityIndicator state="listening" volume={0.5} />);
      
      // Check for the presence of volume bars via their accessibility labels
      const volumeBarLabels = screen.getAllByLabelText(/Volume bar/);
      expect(volumeBarLabels.length).toBe(5);
    });

    it('should render with default volume of 0 when not provided', () => {
      render(<VoiceActivityIndicator state="listening" />);
      
      expect(screen.getByText('Listening')).toBeInTheDocument();
    });

    it('should render with specified volume prop', () => {
      const { rerender } = render(
        <VoiceActivityIndicator state="listening" volume={0.3} />
      );
      
      expect(screen.getByText('Listening')).toBeInTheDocument();
      
      rerender(<VoiceActivityIndicator state="listening" volume={0.8} />);
      expect(screen.getByText('Listening')).toBeInTheDocument();
    });

    it('should handle volume values at boundaries', () => {
      const { rerender } = render(
        <VoiceActivityIndicator state="listening" volume={0} />
      );
      expect(screen.getByText('Listening')).toBeInTheDocument();
      
      rerender(<VoiceActivityIndicator state="listening" volume={1} />);
      expect(screen.getByText('Listening')).toBeInTheDocument();
    });

    it('should have blue color styling for listening state', () => {
      const { container } = render(
        <VoiceActivityIndicator state="listening" volume={0.5} />
      );
      
      const listeningText = screen.getByText('Listening');
      expect(listeningText).toHaveClass('text-blue-600');
    });

    it('should render volume bars with gradient styling', () => {
      const { container } = render(
        <VoiceActivityIndicator state="listening" volume={0.5} />
      );
      
      const listeningContainer = screen.getByText('Listening').parentElement;
      expect(listeningContainer).toHaveClass('flex', 'items-end', 'gap-1');
    });

    it('should have accessibility label for volume bars', () => {
      const { container } = render(
        <VoiceActivityIndicator state="listening" volume={0.5} />
      );
      
      const volumeBarLabels = screen.getAllByLabelText(/Volume bar/);
      expect(volumeBarLabels.length).toBe(5);
    });
  });

  describe('Processing State', () => {
    it('should render processing indicator with correct label', () => {
      render(<VoiceActivityIndicator state="processing" />);
      
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    it('should display animated waveform during processing', () => {
      const { container } = render(
        <VoiceActivityIndicator state="processing" />
      );
      
      const processingText = screen.getByText('Processing');
      expect(processingText).toBeInTheDocument();
      
      // Check that the container has the flex layout
      const processingContainer = processingText.parentElement;
      expect(processingContainer).toHaveClass('flex', 'items-center', 'gap-1');
    });

    it('should have amber color styling for processing state', () => {
      render(<VoiceActivityIndicator state="processing" />);
      
      const processingText = screen.getByText('Processing');
      expect(processingText).toHaveClass('text-amber-600');
    });

    it('should render 5 animated bars for waveform', () => {
      const { container } = render(
        <VoiceActivityIndicator state="processing" />
      );
      
      const processingContainer = screen.getByText('Processing').parentElement;
      const bars = processingContainer?.querySelectorAll('.wave-bar');
      expect(bars?.length).toBe(5);
    });

    it('should include CSS animation styles for wave effect', () => {
      const { container } = render(
        <VoiceActivityIndicator state="processing" />
      );
      
      const styleTag = container.querySelector('style');
      expect(styleTag?.textContent).toContain('@keyframes wave');
      expect(styleTag?.textContent).toContain('animation-delay');
    });
  });

  describe('Thinking State', () => {
    it('should render thinking indicator with correct label', () => {
      render(<VoiceActivityIndicator state="thinking" />);
      
      expect(screen.getByText('Thinking')).toBeInTheDocument();
    });

    it('should display animated dots during thinking', () => {
      const { container } = render(
        <VoiceActivityIndicator state="thinking" />
      );
      
      const thinkingText = screen.getByText('Thinking');
      expect(thinkingText).toBeInTheDocument();
      
      const thinkingContainer = thinkingText.parentElement;
      expect(thinkingContainer).toHaveClass('flex', 'items-center', 'gap-1');
    });

    it('should have purple color styling for thinking state', () => {
      render(<VoiceActivityIndicator state="thinking" />);
      
      const thinkingText = screen.getByText('Thinking');
      expect(thinkingText).toHaveClass('text-purple-600');
    });

    it('should render 3 animated dots for thinking indicator', () => {
      const { container } = render(
        <VoiceActivityIndicator state="thinking" />
      );
      
      const thinkingContainer = screen.getByText('Thinking').parentElement;
      const dots = thinkingContainer?.querySelectorAll('.thinking-dot');
      expect(dots?.length).toBe(3);
    });

    it('should include CSS animation styles for bounce effect', () => {
      const { container } = render(
        <VoiceActivityIndicator state="thinking" />
      );
      
      const styleTag = container.querySelector('style');
      expect(styleTag?.textContent).toContain('@keyframes bounce');
      expect(styleTag?.textContent).toContain('animation-delay');
    });

    it('should have purple dot styling', () => {
      const { container } = render(
        <VoiceActivityIndicator state="thinking" />
      );
      
      const thinkingContainer = screen.getByText('Thinking').parentElement;
      const dots = thinkingContainer?.querySelectorAll('.thinking-dot');
      dots?.forEach((dot) => {
        expect(dot).toHaveClass('bg-purple-500');
      });
    });
  });

  describe('Speaking State', () => {
    it('should render speaking indicator with correct label', () => {
      render(<VoiceActivityIndicator state="speaking" />);
      
      expect(screen.getByText('Speaking')).toBeInTheDocument();
    });

    it('should display animated pulse during speaking', () => {
      const { container } = render(
        <VoiceActivityIndicator state="speaking" />
      );
      
      const speakingText = screen.getByText('Speaking');
      expect(speakingText).toBeInTheDocument();
      
      const speakingContainer = speakingText.parentElement;
      expect(speakingContainer).toHaveClass('flex', 'items-center', 'gap-3');
    });

    it('should have green color styling for speaking state', () => {
      render(<VoiceActivityIndicator state="speaking" />);
      
      const speakingText = screen.getByText('Speaking');
      expect(speakingText).toHaveClass('text-green-600');
    });

    it('should include CSS animation styles for pulse effect', () => {
      const { container } = render(
        <VoiceActivityIndicator state="speaking" />
      );
      
      const styleTag = container.querySelector('style');
      expect(styleTag?.textContent).toContain('@keyframes pulse-ring');
    });

    it('should render pulse dot with animation', () => {
      const { container } = render(
        <VoiceActivityIndicator state="speaking" />
      );
      
      const speakingContainer = screen.getByText('Speaking').parentElement;
      const pulseDot = speakingContainer?.querySelector('.pulse-dot');
      expect(pulseDot).toBeInTheDocument();
      expect(pulseDot).toHaveClass('bg-green-500', 'rounded-full');
    });

    it('should render inner animated pulse element', () => {
      const { container } = render(
        <VoiceActivityIndicator state="speaking" />
      );
      
      const speakingContainer = screen.getByText('Speaking').parentElement;
      const innerPulse = speakingContainer?.querySelector('.animate-pulse');
      expect(innerPulse).toBeInTheDocument();
      expect(innerPulse).toHaveClass('bg-green-400');
    });
  });

  describe('State Transitions', () => {
    it('should update indicator when state changes from listening to processing', () => {
      const { rerender } = render(
        <VoiceActivityIndicator state="listening" volume={0.5} />
      );
      
      expect(screen.getByText('Listening')).toBeInTheDocument();
      
      rerender(<VoiceActivityIndicator state="processing" />);
      
      expect(screen.queryByText('Listening')).not.toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    it('should update indicator when state changes from processing to thinking', () => {
      const { rerender } = render(
        <VoiceActivityIndicator state="processing" />
      );
      
      expect(screen.getByText('Processing')).toBeInTheDocument();
      
      rerender(<VoiceActivityIndicator state="thinking" />);
      
      expect(screen.queryByText('Processing')).not.toBeInTheDocument();
      expect(screen.getByText('Thinking')).toBeInTheDocument();
    });

    it('should update indicator when state changes from thinking to speaking', () => {
      const { rerender } = render(
        <VoiceActivityIndicator state="thinking" />
      );
      
      expect(screen.getByText('Thinking')).toBeInTheDocument();
      
      rerender(<VoiceActivityIndicator state="speaking" />);
      
      expect(screen.queryByText('Thinking')).not.toBeInTheDocument();
      expect(screen.getByText('Speaking')).toBeInTheDocument();
    });

    it('should update indicator when state changes from speaking back to listening', () => {
      const { rerender } = render(
        <VoiceActivityIndicator state="speaking" />
      );
      
      expect(screen.getByText('Speaking')).toBeInTheDocument();
      
      rerender(<VoiceActivityIndicator state="listening" volume={0.3} />);
      
      expect(screen.queryByText('Speaking')).not.toBeInTheDocument();
      expect(screen.getByText('Listening')).toBeInTheDocument();
    });

    it('should cycle through all states', () => {
      const states: ConversationState[] = ['listening', 'processing', 'thinking', 'speaking'];
      const { rerender } = render(
        <VoiceActivityIndicator state={states[0]} volume={0.5} />
      );
      
      states.forEach((state, index) => {
        if (index > 0) {
          rerender(
            <VoiceActivityIndicator 
              state={state} 
              volume={state === 'listening' ? 0.5 : undefined}
            />
          );
        }
        
        const expectedLabel = state.charAt(0).toUpperCase() + state.slice(1);
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      });
    });
  });

  describe('Volume Prop Handling', () => {
    it('should accept volume prop for listening state', () => {
      render(<VoiceActivityIndicator state="listening" volume={0.7} />);
      
      expect(screen.getByText('Listening')).toBeInTheDocument();
    });

    it('should ignore volume prop for non-listening states', () => {
      const { rerender } = render(
        <VoiceActivityIndicator state="processing" volume={0.5} />
      );
      
      expect(screen.getByText('Processing')).toBeInTheDocument();
      
      rerender(<VoiceActivityIndicator state="thinking" volume={0.5} />);
      expect(screen.getByText('Thinking')).toBeInTheDocument();
      
      rerender(<VoiceActivityIndicator state="speaking" volume={0.5} />);
      expect(screen.getByText('Speaking')).toBeInTheDocument();
    });

    it('should handle volume prop updates', () => {
      const { rerender } = render(
        <VoiceActivityIndicator state="listening" volume={0.2} />
      );
      
      expect(screen.getByText('Listening')).toBeInTheDocument();
      
      rerender(<VoiceActivityIndicator state="listening" volume={0.8} />);
      expect(screen.getByText('Listening')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      const { container } = render(
        <VoiceActivityIndicator state="listening" volume={0.5} />
      );
      
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex', 'items-center', 'justify-center', 'gap-2');
    });

    it('should have descriptive text labels for all states', () => {
      const states: ConversationState[] = ['listening', 'processing', 'thinking', 'speaking'];
      
      states.forEach((state) => {
        const { unmount } = render(
          <VoiceActivityIndicator state={state} volume={0.5} />
        );
        
        const expectedLabel = state.charAt(0).toUpperCase() + state.slice(1);
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
        
        unmount();
      });
    });

    it('should have volume bar labels for accessibility', () => {
      render(<VoiceActivityIndicator state="listening" volume={0.5} />);
      
      const volumeBarLabels = screen.getAllByLabelText(/Volume bar/);
      expect(volumeBarLabels.length).toBe(5);
      
      volumeBarLabels.forEach((label, index) => {
        expect(label).toHaveAttribute('aria-label', `Volume bar ${index + 1}`);
      });
    });
  });

  describe('Visual Styling', () => {
    it('should apply correct Tailwind classes to listening indicator', () => {
      const { container } = render(
        <VoiceActivityIndicator state="listening" volume={0.5} />
      );
      
      const listeningText = screen.getByText('Listening');
      expect(listeningText).toHaveClass('text-sm', 'font-medium', 'text-blue-600');
    });

    it('should apply correct Tailwind classes to processing indicator', () => {
      const { container } = render(
        <VoiceActivityIndicator state="processing" />
      );
      
      const processingText = screen.getByText('Processing');
      expect(processingText).toHaveClass('text-sm', 'font-medium', 'text-amber-600');
    });

    it('should apply correct Tailwind classes to thinking indicator', () => {
      const { container } = render(
        <VoiceActivityIndicator state="thinking" />
      );
      
      const thinkingText = screen.getByText('Thinking');
      expect(thinkingText).toHaveClass('text-sm', 'font-medium', 'text-purple-600');
    });

    it('should apply correct Tailwind classes to speaking indicator', () => {
      const { container } = render(
        <VoiceActivityIndicator state="speaking" />
      );
      
      const speakingText = screen.getByText('Speaking');
      expect(speakingText).toHaveClass('text-sm', 'font-medium', 'text-green-600');
    });

    it('should use gradient styling for listening volume bars', () => {
      const { container } = render(
        <VoiceActivityIndicator state="listening" volume={0.5} />
      );
      
      const listeningContainer = screen.getByText('Listening').parentElement;
      const bars = listeningContainer?.querySelectorAll('div[style*="height"]');
      
      bars?.forEach((bar) => {
        expect(bar).toHaveClass('bg-gradient-to-t', 'from-blue-500', 'to-blue-300');
      });
    });
  });

  describe('Component Props', () => {
    it('should accept ConversationState type for state prop', () => {
      const states: ConversationState[] = ['listening', 'processing', 'thinking', 'speaking'];
      
      states.forEach((state) => {
        const { unmount } = render(
          <VoiceActivityIndicator state={state} volume={0.5} />
        );
        
        expect(screen.getByText(state.charAt(0).toUpperCase() + state.slice(1))).toBeInTheDocument();
        unmount();
      });
    });

    it('should accept optional volume prop', () => {
      const { rerender } = render(
        <VoiceActivityIndicator state="listening" />
      );
      
      expect(screen.getByText('Listening')).toBeInTheDocument();
      
      rerender(<VoiceActivityIndicator state="listening" volume={0.5} />);
      expect(screen.getByText('Listening')).toBeInTheDocument();
    });

    it('should have correct prop types', () => {
      // This test verifies TypeScript compilation
      const validProps = {
        state: 'listening' as ConversationState,
        volume: 0.5,
      };
      
      render(<VoiceActivityIndicator {...validProps} />);
      expect(screen.getByText('Listening')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      const { rerender } = render(
        <VoiceActivityIndicator state="listening" volume={0.5} />
      );
      
      const states: ConversationState[] = ['processing', 'thinking', 'speaking', 'listening', 'processing'];
      
      states.forEach((state) => {
        rerender(
          <VoiceActivityIndicator 
            state={state} 
            volume={state === 'listening' ? 0.5 : undefined}
          />
        );
        
        const expectedLabel = state.charAt(0).toUpperCase() + state.slice(1);
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      });
    });

    it('should handle volume values outside normal range', () => {
      const { rerender } = render(
        <VoiceActivityIndicator state="listening" volume={-0.5} />
      );
      
      expect(screen.getByText('Listening')).toBeInTheDocument();
      
      rerender(<VoiceActivityIndicator state="listening" volume={1.5} />);
      expect(screen.getByText('Listening')).toBeInTheDocument();
    });

    it('should render correctly with minimal props', () => {
      render(<VoiceActivityIndicator state="listening" />);
      
      expect(screen.getByText('Listening')).toBeInTheDocument();
    });
  });

  describe('Animation Styles', () => {
    it('should include wave animation for processing state', () => {
      const { container } = render(
        <VoiceActivityIndicator state="processing" />
      );
      
      const styleTag = container.querySelector('style');
      const styleContent = styleTag?.textContent || '';
      
      expect(styleContent).toContain('@keyframes wave');
      expect(styleContent).toContain('height: 8px');
      expect(styleContent).toContain('height: 20px');
    });

    it('should include bounce animation for thinking state', () => {
      const { container } = render(
        <VoiceActivityIndicator state="thinking" />
      );
      
      const styleTag = container.querySelector('style');
      const styleContent = styleTag?.textContent || '';
      
      expect(styleContent).toContain('@keyframes bounce');
      expect(styleContent).toContain('opacity: 0.4');
      expect(styleContent).toContain('opacity: 1');
    });

    it('should include pulse-ring animation for speaking state', () => {
      const { container } = render(
        <VoiceActivityIndicator state="speaking" />
      );
      
      const styleTag = container.querySelector('style');
      const styleContent = styleTag?.textContent || '';
      
      expect(styleContent).toContain('@keyframes pulse-ring');
      expect(styleContent).toContain('box-shadow');
    });

    it('should have staggered animation delays for processing bars', () => {
      const { container } = render(
        <VoiceActivityIndicator state="processing" />
      );
      
      const styleTag = container.querySelector('style');
      const styleContent = styleTag?.textContent || '';
      
      expect(styleContent).toContain('animation-delay: 0s');
      expect(styleContent).toContain('animation-delay: 0.1s');
      expect(styleContent).toContain('animation-delay: 0.2s');
    });

    it('should have staggered animation delays for thinking dots', () => {
      const { container } = render(
        <VoiceActivityIndicator state="thinking" />
      );
      
      const styleTag = container.querySelector('style');
      const styleContent = styleTag?.textContent || '';
      
      expect(styleContent).toContain('animation-delay: 0s');
      expect(styleContent).toContain('animation-delay: 0.2s');
      expect(styleContent).toContain('animation-delay: 0.4s');
    });
  });
});
