# ErrorDisplay Component

## Overview

The `ErrorDisplay` component displays user-friendly error messages with appropriate recovery options for voice conversation errors. It shows retry buttons for recoverable errors and dismiss buttons for non-blocking errors, along with resolution guidance.

## Props

```typescript
interface ErrorDisplayProps {
  error: VoiceError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}
```

- **error**: The VoiceError to display, or null to hide the component
- **onRetry**: Optional callback when user clicks the retry button (shown for recoverable errors)
- **onDismiss**: Optional callback when user clicks the dismiss button

## Features

- **Recoverable vs Non-Recoverable Errors**: Shows different UI based on error recoverability
  - Recoverable errors: "Temporary Issue" header with retry button
  - Non-recoverable errors: "Unable to Continue" header with close button
- **Resolution Guidance**: Provides specific guidance for each error type
- **Accessibility**: Full ARIA support with proper alert role and labels
- **Tailwind Styling**: Uses Tailwind CSS v4 utility classes exclusively
- **Client Component**: Marked with "use client" for interactivity

## Error Types Supported

All error codes from `VoiceErrorCode` enum:
- `MICROPHONE_PERMISSION_DENIED`
- `MICROPHONE_NOT_FOUND`
- `SPEECH_RECOGNITION_FAILED`
- `API_KEY_MISSING`
- `API_AUTHENTICATION_FAILED`
- `API_RATE_LIMIT`
- `NETWORK_ERROR`
- `TTS_SYNTHESIS_FAILED`
- `AUDIO_PLAYBACK_FAILED`
- `BROWSER_NOT_SUPPORTED`

## Usage Example

```tsx
import { ErrorDisplay } from '@/components/voice/ErrorDisplay';
import { VoiceError, VoiceErrorCode } from '@/lib/errors';

export function MyComponent() {
  const [error, setError] = useState<VoiceError | null>(null);

  const handleRetry = () => {
    // Retry the failed operation
    setError(null);
  };

  const handleDismiss = () => {
    setError(null);
  };

  return (
    <ErrorDisplay
      error={error}
      onRetry={handleRetry}
      onDismiss={handleDismiss}
    />
  );
}
```

## Styling

The component uses Tailwind CSS v4 utility classes:
- Red color scheme for errors (red-50, red-200, red-600, red-700)
- Responsive padding and spacing
- Focus states for accessibility
- Hover states for interactive elements

## Accessibility

- ARIA alert role with `aria-live="polite"`
- Descriptive aria-labels for all interactive elements
- Proper heading hierarchy
- Decorative SVGs marked with `aria-hidden="true"`
- Focus ring indicators on buttons

## Requirements Validated

- **Requirement 10.1**: Displays user-friendly error messages
- **Requirement 10.2**: Indicates network errors clearly
- **Requirement 10.3**: Provides retry button for recoverable errors
- **Requirement 10.4**: Provides guidance for non-recoverable errors and dismiss button
