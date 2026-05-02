# Architecture & Code Guidelines

## File Structure

```
app/
  page.tsx                  # Home: vertical news feed
  topic/[id]/
    page.tsx                # Topic page: split layout (chat + dashboard)
components/
  feed/                     # Feed-related components
    NewsFeed.tsx            # Vertical scrolling feed container
    TopicCard.tsx           # Individual topic card
  topic/                    # Topic page components
    ChatPanel.tsx           # AI conversation panel (left/main)
    DashboardPanel.tsx      # Sources dashboard (right/side)
    SourceCard.tsx          # Article/video/social post card
  ui/                       # Shared primitives (shadcn/ui lives here)
lib/
  tavily.ts                 # Tavily MCP search/extraction helpers
  agent.ts                  # Agent logic: briefing generation, conversation
  types.ts                  # Shared TypeScript types
```

## Separation of Concerns

- **Data layer** (`lib/`): all API calls, MCP interactions, and data transforms — no JSX
- **UI layer** (`components/`): pure presentational components that receive props
- **Page layer** (`app/`): composes components, handles routing and server-side data fetching

## Component Rules

- Prefer Server Components for data fetching; use `"use client"` only when interactivity or browser APIs are needed
- Keep components small and single-purpose
- Co-locate types with the component if they are not shared; shared types go in `lib/types.ts`
- Use named exports for components

## TypeScript

- Strict mode is on — no `any`
- Define explicit return types on all exported functions
- Use `interface` for object shapes, `type` for unions and aliases

## Styling

- Tailwind CSS v4 utility classes only — no inline styles, no CSS modules
- Use `cn()` (from `lib/utils.ts`) for conditional class merging
- Responsive design: mobile-first, `md:` breakpoint for the split layout on topic pages
