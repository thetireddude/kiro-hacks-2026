# Architecture & Code Guidelines

## File Structure

```
app/
  page.tsx                  # Home: vertical swipeable news feed
  topic/[id]/
    page.tsx                # Topic detail page (future: chat + dashboard)
  api/
    agent/
      route.ts              # API route: triggers agent loop, returns topics
components/
  feed/                     # Feed-related components
    NewsFeed.tsx            # Vertical swipeable feed container
    TopicCard.tsx           # Individual topic card
    ReloadButton.tsx        # Reload feed trigger
  topic/                    # Topic page components (future phase)
    ChatPanel.tsx           # AI conversation panel
    DashboardPanel.tsx      # Sources dashboard
    SourceCard.tsx          # Article/video/social post card
  ui/                       # Shared primitives (shadcn/ui)
lib/
  agent/
    loop.ts                 # Agentic loop orchestration
    system-prompt.ts        # Agent system prompt definition
    tools.ts                # Tool definitions (fetch_sources, cluster_sources)
    types.ts                # Agent-specific types (tool inputs/outputs, internal state)
  tavily.ts                 # Tavily MCP search/extraction helpers
  types.ts                  # Shared TypeScript types (Topic, Source, etc.)
  utils.ts                  # Utility functions (cn, formatters)
  config.ts                 # Configurable constants (topic count, max iterations)
```

## Separation of Concerns

- **Agent layer** (`lib/agent/`): all reasoning, tool calling, clustering, and topic generation — no JSX, no HTTP concerns
- **Data layer** (`lib/`): Tavily helpers, shared types, configuration — no JSX
- **API layer** (`app/api/`): thin HTTP wrapper that triggers the agent and returns results
- **UI layer** (`components/`): pure presentational components that receive props — no data fetching, no agent logic
- **Page layer** (`app/`): composes components, handles routing, triggers API calls

## Component Rules

- Prefer Server Components for static rendering; use `"use client"` only for interactivity (swipe gestures, reload button, state)
- Keep components small and single-purpose
- Co-locate types with the component if not shared; shared types go in `lib/types.ts`
- Use named exports for all components

## TypeScript

- Strict mode — no `any`
- Define explicit return types on all exported functions
- Use `interface` for object shapes, `type` for unions and aliases
- Agent tool inputs and outputs must be fully typed

## Styling

- Tailwind CSS v4 utility classes only — no inline styles, no CSS modules
- Use `cn()` (from `lib/utils.ts`) for conditional class merging
- Responsive design: mobile-first
- Topic cards are centered, do not fill the entire screen width

## API Design

- `POST /api/agent` — triggers the agent loop, returns `Topic[]`
- Request body: `{ topicCount?: number }` (optional override)
- Response: `{ topics: Topic[], metadata: { iterations: number, timestamp: string } }`
- Use streaming if agent loop takes more than a few seconds (future optimization)

## Error Handling

- Agent errors should return a structured error response, never crash the API
- Frontend should display a graceful fallback when the agent fails
- Log agent iterations and tool calls for debugging during development
