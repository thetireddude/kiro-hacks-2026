# New News — Agentic AI News Companion

An AI-powered news discovery and voice conversation app. An autonomous agent discovers trending news topics, validates them against multiple sources, and presents them in a swipeable feed. Tap any topic to explore it through a real-time voice conversation with an AI analyst.

Built as a hackathon prototype submission to the CalPoly SLO KiroHacks 2026 hakcathon.

***
<a href="https://new-news-ai.netlify.app" target="_blank">
        <img src="https://img.shields.io/badge/🚀_TRY_THE_APP-79D6E8?style=for-the-badge&logoColor=white&labelColor=79D6E8" alt="Try The App" width="210">
</a>

**NOTE: When hosting on netlify's free plan, server fetch functions and API calls are limited to <26s of execution. If you encounter errors when the app is grabbing headlines such as "Agent failed to return topics" or HTML errors, please wait a few minutes and refresh the page a few times. ☺️**
*** 

## How It Works

1. **Discover** — An AI agent autonomously searches for current news, clusters sources into event-level topics, and validates them
2. **Browse** — Swipe through a vertical feed of topic cards, one at a time
3. **Explore** — Tap a topic to enter a voice conversation where the agent briefs you and answers follow-up questions

## Features

### Headline Discovery Agent
- Iterative agentic loop powered by GPT-4o-mini with tool/function calling
- Two tools: `fetch_sources` (Tavily search) and `cluster_sources` (semantic grouping)
- Discovers `targetTopicCount` validated topics per run across multiple categories
- Deduplicates sources by URL, rejects broad themes, requires multi-source validation
- Confidence scoring (high/medium/low) based on source count
- Graceful error handling with partial results on failure

### Voice Conversation Agent
- OpenAI Realtime API via WebRTC for low-latency voice interaction
- Server-side voice activity detection (VAD) — no button presses needed
- Deep research phase gathers sources and classifies viewpoints before briefing
- Live transcript displayed alongside the conversation
- Dashboard panel shows source cards as the agent discovers them
- Conversation limits (`maxConversationTurns` turns, `maxSearchesPerConversation` searches) to keep sessions focused
- Source whitelist of credible news domains

### UI/UX
- Vertical swipeable feed (scroll/touch) with smooth Framer Motion transitions
- Animated plasma background (WebGL via OGL)
- Glitch-effect title animation
- Dark mode with purple/violet color scheme
- Category-colored badges (politics=blue, tech=purple, world=emerald, etc.)
- Skeleton loading states during agent processing
- Responsive design
- Keyboard accessible with ARIA labels

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Animation | Framer Motion, OGL (WebGL) |
| AI (Agent) | OpenAI GPT-4o-mini (tool calling) |
| AI (Voice) | OpenAI Realtime API (WebRTC) |
| Search | Tavily API |
| Icons | Lucide React |
| Deployment | Netlify |

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key (with Realtime API access for voice features)
- A Tavily API key (for news search)

### Setup

```bash
# Install dependencies
npm install

# Create your environment file
cp .env.local.example .env.local
```

Add your keys to `.env.local`:

```env
OPENAI_API_KEY=your-openai-api-key
TAVILY_API_KEY=your-tavily-api-key
```

```bash
# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx                          # Homepage — plasma bg + swipeable feed
  topic/[id]/page.tsx               # Topic detail — voice conversation + dashboard
  api/
    agent/route.ts                  # POST — triggers headline discovery loop
    realtime-session/route.ts       # POST — creates ephemeral Realtime API token
    voice-agent/
      start/route.ts                # POST — initializes voice session + research
      message/route.ts              # POST — handles follow-up messages
      end/route.ts                  # POST — cleans up session

components/
  feed/
    NewsFeed.tsx                    # Feed container with fetch + cache logic
    TopicCard.tsx                   # Individual topic card
    TopicCardSkeleton.tsx           # Loading skeleton
    ReloadButton.tsx                # Refresh trigger
  voice/
    VoiceConversation.tsx           # Standalone voice UI (homepage)
    DashboardPanel.tsx              # Source cards grid
  ui/
    ReelPanel.tsx                   # Vertical swipe container (Framer Motion)
    CurvedPanel.tsx                 # Curved card wrapper
    Plasma.tsx                      # WebGL animated background
    GlitchTitle.tsx                 # Glitch text effect
    button.tsx, card.tsx, badge.tsx  # shadcn/ui primitives

lib/
  agent/
    loop.ts                         # Agentic loop orchestration
    system-prompt.ts                # Agent identity + behavioral rules
    tools.ts                        # fetch_sources + cluster_sources implementations
    types.ts                        # Internal agent types
  voice-agent/
    loop.ts                         # Voice conversation orchestration
    system-prompt.ts                # Voice agent instructions
    tools.ts                        # deep_research_sources + helpers
    memory.ts                       # In-memory session store
    config.ts                       # Voice agent configuration
    types.ts                        # Voice agent types
  realtime.ts                       # WebRTC + Realtime API client helpers
  tavily.ts                         # Tavily search API wrapper
  types.ts                          # Shared types (Topic, AgentResponse, etc.)
  config.ts                         # Agent configuration constants
  utils.ts                          # Utility functions (cn)
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│  Homepage (Feed)              Topic Detail (Voice)       │
│  ┌──────────────┐            ┌──────────────────────┐   │
│  │  NewsFeed    │            │  Voice + Dashboard   │   │
│  │  TopicCard   │──click────▶│  Transcript          │   │
│  │  ReelPanel   │            │  DashboardPanel      │   │
│  └──────┬───────┘            └──────────┬───────────┘   │
│         │                               │               │
└─────────┼───────────────────────────────┼───────────────┘
          │ POST /api/agent               │ POST /api/voice-agent/*
          ▼                               ▼
┌─────────────────────┐     ┌──────────────────────────┐
│  Headline Agent     │     │  Voice Agent             │
│  (GPT-4o-mini)      │     │  (GPT-4o + Realtime)     │
│                     │     │                          │
│  fetch_sources ─────┼──┐  │  deep_research_sources   │
│  cluster_sources    │  │  │  webSearchFollowup       │
└─────────────────────┘  │  └──────────┬───────────────┘
                         │             │
                         ▼             ▼
                    ┌─────────────────────┐
                    │    Tavily API       │
                    │  (News Search)      │
                    └─────────────────────┘
```

### Data Flow

1. User opens the app → `NewsFeed` calls `POST /api/agent`
2. The headline agent runs an iterative loop (up to 3 iterations) searching and clustering sources
3. Returns validated `Topic[]` → rendered as swipeable cards
4. User taps a card → navigates to `/topic/[id]`
5. Voice agent starts research → gathers sources, classifies viewpoints
6. Agent delivers a spoken briefing via WebRTC, then listens for questions
7. Follow-up questions trigger additional research and update the dashboard

### Separation of Concerns

- **Agent layer** — all reasoning, tool calling, and data discovery (no JSX)
- **API layer** — thin HTTP wrappers that trigger agents and return results
- **UI layer** — pure rendering components that receive props (no data fetching)
- **Page layer** — composes components, handles routing, triggers API calls

## Configuration

### Headline Agent (`lib/config.ts`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `targetTopicCount` | 5 | Topics to discover per run |
| `maxIterations` | 3 | Maximum loop iterations |
| `minSourcesPerTopic` | 2 | Minimum sources for a valid topic |
| `model` | gpt-4o-mini | OpenAI model for orchestration |
| `clusteringModel` | gpt-4o-mini | Model for source clustering |
| `temperature` | 0.3 | Low for factual consistency |

### Voice Agent (`lib/voice-agent/config.ts`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `model` | gpt-4o | OpenAI model for conversation |
| `maxConversationTurns` | 10 | Max user turns per session |
| `maxSearchesPerConversation` | 8 | Max Tavily searches per session |
| `maxToolCallsPerTurn` | 5 | Max tool calls in a single turn |
| `targetSourceCount` | 6 | Sources to collect during research |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key (GPT-4o + Realtime API) |
| `TAVILY_API_KEY` | Yes | Tavily API key for news search |
| `KOKORO_API_URL` | No | Optional Kokoro TTS service URL |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Browser Requirements

- Modern browser with WebRTC support (Chrome, Edge, Firefox, Safari 16+)
- Microphone permission (for voice features)

## Deployment

The project is configured for Netlify deployment with `@netlify/plugin-nextjs`. Run `npm run build` and deploy the output, or connect your repository to Netlify for automatic deploys.

## License

OSI Open Source License - Apache 2.0
