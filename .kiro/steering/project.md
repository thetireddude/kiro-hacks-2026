# Project Overview

**New News** is an agentic voice-based AI news companion — a hackathon prototype.

This is NOT a news aggregator. It is an agent-driven system that:
- Discovers news topics through autonomous reasoning
- Validates them using multiple credible sources
- Presents them in a focused, swipeable UI
- Will later enable conversational exploration via voice

The product transforms passive news consumption into an interactive, guided experience.

## Core Idea

The system uses an AI agent powered by an OpenAI ChatGPT model that:
- Actively searches for news using tool/function calling
- Analyzes and clusters sources into event-level topics
- Identifies real-world events (not broad themes)
- Refines results through multiple iterative tool calls
- Outputs structured topic objects for the UI

The agent is the sole source of intelligence. The frontend is a pure rendering layer.

## System Layers

1. **Agent Layer** — all data discovery, reasoning, clustering, and topic generation
2. **Frontend Layer** — rendering topic cards, handling navigation, and user interactions

These layers are strictly separated. The frontend never fetches raw news or performs reasoning.

## Current Phase (Hackathon Prototype)

What IS in scope:
- Vertical swipeable topic feed (one card visible at a time)
- Agent-driven topic discovery via agentic loop
- Structured topic output contract
- Reload feed interaction

What is NOT in scope (future phase):
- Voice briefings and spoken interaction
- Conversational exploration of topics
- Dashboard with sources, images, videos
- Authentication, personalization, long-term storage

## Tech Stack

- **Framework**: Next.js (App Router) with TypeScript
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui
- **AI**: OpenAI ChatGPT model with tool/function calling
- **Data**: Tavily MCP for search and extraction

## Development Priorities

1. Strong demo experience
2. Clean, polished UI
3. Working agent loop with real data

Deprioritize: auth, personalization, scalability, persistent storage.

## Build Order

1. Mock topic cards UI with static data
2. Swipeable feed layout (one card at a time)
3. Agent skeleton (system prompt, no tools)
4. `fetch_sources` tool integration (Tavily)
5. `cluster_sources` tool implementation
6. Full agent loop with iterative refinement
7. Reload feed interaction
