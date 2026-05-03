# ConversationTranscript Component

## Overview

The `ConversationTranscript` component displays the conversation history in a voice conversation interface. It shows user and AI messages with timestamps, auto-scrolls to the latest message, and provides visual distinction between message types.

## Features

- **Message Display**: Renders user and AI messages in a scrollable container
- **Timestamps**: Shows formatted timestamps (12-hour format with AM/PM) for each message
- **Visual Distinction**: 
  - User messages: right-aligned with blue background
  - AI messages: left-aligned with gray background
- **Auto-scroll**: Automatically scrolls to the latest message when new messages arrive
- **Loading State**: Shows animated loading indicator while AI is generating a response
- **Empty State**: Displays helpful message when no conversation has started
- **Responsive Design**: Adapts to mobile and desktop screen sizes with responsive max-widths
- **Accessibility**: Semantic HTML structure with proper contrast and readable fonts

## Props

```typescript
interface ConversationTranscriptProps {
  messages: ConversationMessage[];
  isLoading?: boolean;
}
```

- `messages`: Array of conversation messages to display
- `isLoading`: Optional boolean to show loading indicator (defaults to false)

## Usage

```tsx
import { ConversationTranscript } from '@/components/voice/ConversationTranscript';
import { ConversationMessage } from '@/lib/voice/types';

export function MyComponent() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ConversationTranscript 
      messages={messages} 
      isLoading={isLoading}
    />
  );
}
```

## Styling

The component uses Tailwind CSS v4 utility classes exclusively:

- **Container**: Flexbox layout with full height, white background, rounded corners, shadow, and border
- **Header**: Gray background with title
- **Messages Container**: Scrollable with padding and spacing
- **Message Bubbles**: 
  - User: Blue background, white text, right-aligned, rounded with no bottom-right corner
  - AI: Gray background, dark text, left-aligned, rounded with no bottom-left corner
- **Timestamps**: Small gray text below each message
- **Loading Indicator**: Animated dots with staggered animation

## Requirements Validated

This component validates the following requirements from the spec:

- **8.1**: Display user messages in conversation history
- **8.2**: Display AI messages in conversation history
- **8.3**: Display timestamps for each message
- **8.4**: Visually distinguish user vs AI messages
- **8.5**: Auto-scroll to show the most recent message
- **11.1**: Display correctly on mobile devices (375px+)
- **11.2**: Display correctly on desktop devices (1024px+)
- **11.3**: Use responsive layout techniques

## Testing

The component includes 66 comprehensive unit tests covering:

- Empty state rendering
- User and AI message display
- Timestamp formatting (12-hour format, AM/PM, padding)
- Visual distinction (colors, alignment, borders)
- Auto-scroll behavior
- Loading state with animated indicator
- Responsive design classes
- Accessibility features
- Edge cases (long messages, special characters, rapid updates)
- Component structure and styling

All tests pass successfully.

## Implementation Details

### Auto-scroll Mechanism

The component uses a `useRef` to track the scroll anchor element and a `useEffect` hook to trigger smooth scrolling whenever the messages array changes:

```tsx
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages]);
```

### Message Bubble Styling

Messages are styled based on their role:

- **User messages**: `bg-blue-500 text-white rounded-br-none` (no bottom-right corner)
- **AI messages**: `bg-gray-100 text-gray-900 rounded-bl-none` (no bottom-left corner)

This creates a chat-like appearance with asymmetrical corners.

### Loading Indicator

The loading indicator shows three animated dots with staggered animation delays:

```tsx
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
```

### Timestamp Formatting

Timestamps are formatted in 12-hour format with AM/PM:

```tsx
function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const paddedMinutes = minutes.toString().padStart(2, '0');

  const isPM = hours >= 12;
  const displayHours = hours % 12 || 12;
  const period = isPM ? 'PM' : 'AM';

  return `${displayHours}:${paddedMinutes} ${period}`;
}
```

## Browser Compatibility

The component uses standard React and Tailwind CSS features that are compatible with all modern browsers (Chrome 120+, Firefox 120+, Safari 17+, Edge 120+).

## Performance Considerations

- Messages are rendered efficiently with React's key prop
- Auto-scroll uses smooth behavior for better UX
- Loading indicator uses CSS animations for smooth performance
- Component handles large message arrays (tested with 100+ messages)
