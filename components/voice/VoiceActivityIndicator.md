# VoiceActivityIndicator Component

## Overview

The `VoiceActivityIndicator` component displays animated visual feedback for the current conversation state in the voice conversation interface. It provides distinct visual indicators for four states: listening, processing, thinking, and speaking.

## Features

- **Listening State**: Displays animated volume bars that respond to the current volume level (0-1 range)
- **Processing State**: Shows an animated waveform indicating speech recognition is in progress
- **Thinking State**: Displays bouncing dots indicating AI response generation
- **Speaking State**: Shows a pulsing indicator indicating audio playback

All animations use CSS keyframes for smooth, performant visual feedback.

## Props

```typescript
interface VoiceActivityIndicatorProps {
  state: ConversationState;  // Required: 'listening' | 'processing' | 'thinking' | 'speaking'
  volume?: number;           // Optional: 0-1 range, only used in listening state
}
```

## Usage

### Basic Usage

```tsx
import { VoiceActivityIndicator } from '@/components/voice/VoiceActivityIndicator';
import { ConversationState } from '@/lib/voice/types';

export function MyComponent() {
  const [state, setState] = useState<ConversationState>('listening');
  const [volume, setVolume] = useState(0.5);

  return (
    <VoiceActivityIndicator 
      state={state} 
      volume={volume}
    />
  );
}
```

### With useConversation Hook

```tsx
import { useConversation } from '@/hooks/useConversation';
import { useAudioInput } from '@/hooks/useAudioInput';
import { VoiceActivityIndicator } from '@/components/voice/VoiceActivityIndicator';

export function VoiceConversationPage() {
  const { conversationState } = useConversation();
  const { volume } = useAudioInput();

  return (
    <div>
      <VoiceActivityIndicator 
        state={conversationState} 
        volume={volume}
      />
    </div>
  );
}
```

## States

### Listening State
- **Visual**: 5 animated volume bars with blue gradient
- **Color**: Blue (#3B82F6)
- **Animation**: Bars height responds to volume prop (0-1)
- **Label**: "Listening"

```tsx
<VoiceActivityIndicator state="listening" volume={0.7} />
```

### Processing State
- **Visual**: 5 animated bars forming a waveform
- **Color**: Amber (#F59E0B)
- **Animation**: Wave effect with staggered delays
- **Label**: "Processing"

```tsx
<VoiceActivityIndicator state="processing" />
```

### Thinking State
- **Visual**: 3 bouncing dots
- **Color**: Purple (#A855F7)
- **Animation**: Bounce effect with staggered delays
- **Label**: "Thinking"

```tsx
<VoiceActivityIndicator state="thinking" />
```

### Speaking State
- **Visual**: Pulsing dot with expanding ring
- **Color**: Green (#22C55E)
- **Animation**: Pulse ring effect
- **Label**: "Speaking"

```tsx
<VoiceActivityIndicator state="speaking" />
```

## Styling

The component uses Tailwind CSS v4 utility classes exclusively:

- **Layout**: Flexbox for alignment and spacing
- **Colors**: Tailwind color palette (blue, amber, purple, green)
- **Animations**: CSS keyframes with smooth transitions
- **Responsive**: Works on all screen sizes

## Accessibility

- **Semantic Structure**: Uses proper flexbox layout
- **Text Labels**: Each state has a descriptive text label
- **Volume Bar Labels**: Volume bars have `aria-label` attributes for screen readers
- **Color Contrast**: All colors meet WCAG AA contrast requirements

## Animation Details

### Listening State
- Volume bars update in real-time based on the `volume` prop
- Bars have a minimum height of 4px and maximum of 32px
- Smooth transitions with `duration-75` for responsive feel

### Processing State
- 5 bars animate with a wave pattern
- Animation duration: 0.6s
- Staggered delays: 0s, 0.1s, 0.2s, 0.1s, 0s
- Creates a flowing waveform effect

### Thinking State
- 3 dots bounce up and down
- Animation duration: 1.4s
- Staggered delays: 0s, 0.2s, 0.4s
- Opacity changes from 0.4 to 1.0 during bounce

### Speaking State
- Pulsing dot with expanding ring
- Ring animation duration: 2s
- Creates a radar-like pulse effect
- Inner dot has continuous pulse animation

## Performance

- Uses CSS animations for optimal performance
- No JavaScript animation loops
- Minimal re-renders when props change
- Efficient volume bar calculations

## Testing

The component includes comprehensive tests covering:

- All four conversation states
- Volume prop handling
- State transitions
- Accessibility attributes
- Visual styling
- Animation styles
- Edge cases

Run tests with:
```bash
npm test -- components/voice/VoiceActivityIndicator.test.tsx
```

## Requirements Validation

This component validates the following requirements:

- **6.5**: Turn-Taking Management - Visual indicators for current turn state
- **13.1**: Visual Feedback for Voice Activity - Animated indicator for current state
- **13.2**: Visual Feedback for Voice Activity - Listening indicator with volume display
- **13.3**: Visual Feedback for Voice Activity - Processing indicator
- **13.4**: Visual Feedback for Voice Activity - Thinking indicator
- **13.5**: Visual Feedback for Voice Activity - Speaking indicator with animated elements

## Browser Support

- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

All modern browsers support CSS animations and flexbox layout used by this component.
