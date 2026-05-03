# Frontend Responsibilities & Guidelines

## Core Principle

The frontend is a **pure rendering layer**. It does NOT:
- Fetch raw news or search results
- Cluster or analyze data
- Perform any reasoning or AI logic
- Call Tavily or any external data API directly

The frontend's only data source is the agent API (`POST /api/agent`), which returns structured `Topic[]` objects.

## Homepage Experience

### Layout
- Displays a vertical, swipeable feed of topic cards
- Only ONE topic card is visible at a time
- The card is centered on screen and does NOT fill the entire viewport
- Cards have generous padding and breathing room
- Background is subtle — the card is the focal point

### Swipe Behavior
- Users swipe vertically (up/down) to browse topics
- Swipe transitions should be smooth and snappy
- Use touch events on mobile, scroll/wheel on desktop
- Consider using Framer Motion or a gesture library for swipe physics
- Show subtle indicators for "more topics above/below"

### Reload
- A "Reload Feed" button triggers the agent again
- While loading, show a skeleton or shimmer state on the card area
- Do not show a blank screen during reload

## Topic Card Design

### Visual Hierarchy (top to bottom)
1. **Category badge** — small, colored pill (e.g., "Politics", "Technology")
2. **Title** — largest text, bold, 1–2 lines max
3. **Summary** — 1–2 sentences, regular weight, muted color
4. **Metadata row** — timestamp, source count, confidence indicator
5. **CTA** — "Explore" or "Talk" button (navigates to topic detail)

### Card Styling
- Rounded corners, subtle shadow or border
- Semi-transparent or frosted glass effect (optional, if it fits the aesthetic)
- Category badge uses color coding per category
- Confidence indicator: subtle dot or icon (green/yellow/gray for high/medium/low)
- Source count shown as "N sources" text

### Card Interactions
- Tap/click card → navigate to `/topic/[id]`
- Swipe → next/previous topic
- No long-press or secondary actions in this phase

## Topic Detail Page (Future Phase)

When implemented, the topic detail page will have:
- Split layout: chat panel (left) + dashboard panel (right)
- Mobile: stacked layout (chat on top, dashboard below or in a tab)
- This is NOT part of the current hackathon scope

## Loading States

- **Initial load**: full-screen centered loading animation while agent runs
- **Reload**: skeleton card in the feed area
- **Error**: friendly error message with a retry button
- **Partial results**: if agent returns `partialTopics`, render what's available with a note

## Empty States

- If agent returns zero topics: show a friendly message ("No trending topics found. Try again in a moment.") with a reload button

## Responsive Design

- Mobile-first approach
- Card width: max 480px on mobile, max 560px on desktop
- Card is always horizontally centered
- Vertical centering within the viewport
- Touch targets: minimum 44px for all interactive elements

## Accessibility

- All interactive elements must be keyboard navigable
- Cards should have proper ARIA labels
- Swipe navigation should have keyboard alternatives (arrow keys)
- Color is never the sole indicator of meaning (confidence uses icon + color)
- Sufficient color contrast on all text

## Data Flow

```
User opens app
  → Page component calls POST /api/agent
  → Agent loop runs server-side
  → Returns Topic[]
  → Page passes topics to NewsFeed component
  → NewsFeed renders TopicCard components
  → User interacts (swipe, click, reload)
```

The frontend never sees raw sources, intermediate clusters, or agent reasoning. It only sees the final `Topic[]` array.
