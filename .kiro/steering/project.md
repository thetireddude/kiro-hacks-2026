# Project Overview

**New News** is a voice-first AI news companion — a hackathon prototype.

This is NOT a news aggregator. It is a conversational system that helps users understand current events through multiple perspectives using live data.

## Core User Flow

1. User opens the app → sees a vertical feed of trending news topics (events, not articles)
2. User clicks a topic → AI agent gathers sources in real time
3. Agent delivers a spoken + text briefing on the topic
4. Agent asks thoughtful questions and continues a voice-based conversation
5. A dashboard alongside the chat shows articles, images, videos, and social posts

## Product Constraints

- This is a hackathon prototype — prioritize speed, clarity, and demo value over completeness
- Avoid overengineering backend systems
- Build UI with reusable React components

## Tech Stack

- **Framework**: Next.js (App Router) with TypeScript
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui
- **Search & Extraction**: Tavily MCP
- **AI**: LLM for summarization and conversation
- **Voice**: STT/TTS for voice interaction
