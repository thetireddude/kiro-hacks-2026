# Shared Data Types Reference

All shared types live in `lib/types.ts`. This steering file is the canonical reference for the type definitions used across the project.

## Frontend Types (Topic Contract)

These types are what the frontend receives and renders. They are the output of the agent layer.

```typescript
interface Topic {
  id: string
  title: string
  summary: string
  category: TopicCategory
  sourceCount: number
  representativeSources: TopicSource[]
  searchQuery: string
  confidence: ConfidenceLevel
  lastUpdated: string
  imageUrl?: string
}

interface TopicSource {
  url: string
  title: string
  domain: string
  type: SourceType
  snippet: string
  publishedAt?: string
}

type TopicCategory =
  | 'politics'
  | 'technology'
  | 'world'
  | 'business'
  | 'science'
  | 'sports'
  | 'entertainment'
  | 'health'

type ConfidenceLevel = 'high' | 'medium' | 'low'

type SourceType = 'news' | 'opinion' | 'social' | 'video' | 'image'
```

## API Types

```typescript
interface AgentResponse {
  topics: Topic[]
  metadata: AgentMetadata
}

interface AgentMetadata {
  iterations: number
  totalSourcesAnalyzed: number
  timestamp: string
}

interface AgentErrorResponse {
  error: string
  code: AgentErrorCode
  partialTopics?: Topic[]
}

type AgentErrorCode =
  | 'AGENT_TIMEOUT'
  | 'TOOL_FAILURE'
  | 'INSUFFICIENT_TOPICS'
  | 'UNKNOWN'
```

## Agent Internal Types (Not Exposed to Frontend)

These types are used within `lib/agent/` and must never leak to the UI layer.

```typescript
interface RawSource {
  url: string
  title: string
  content: string
  domain: string
  publishedDate?: string
  score: number
}

interface SourceCluster {
  eventTitle: string
  eventSummary: string
  category: string
  sources: RawSource[]
  confidence: ConfidenceLevel
}

interface AgentLoopState {
  iteration: number
  sourcePool: RawSource[]
  clusters: SourceCluster[]
  validTopics: Topic[]
  fetchCallCount: number
}
```

## Conversation Types (Future Phase)

Reserved for when voice/chat features are implemented:

```typescript
interface AgentMessage {
  role: 'agent' | 'user'
  content: string
  sources?: TopicSource[]
  timestamp: string
}

interface ConversationState {
  topicId: string
  messages: AgentMessage[]
  phase: 'briefing' | 'perspectives' | 'question' | 'conversation'
}
```

## Type Rules

- All types shared between agent and frontend go in `lib/types.ts`
- Agent-internal types go in `lib/agent/types.ts`
- Component-local types can be co-located with the component file
- Never use `any` — use `unknown` with type guards if the shape is uncertain
- Use `interface` for object shapes, `type` for unions and aliases
- All exported functions must have explicit return types
