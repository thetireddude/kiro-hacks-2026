# Topic Output Contract

This document defines the strict contract between the agent layer and the frontend layer. This is the ONLY interface between them.

## Core Principle

The agent must output ONLY structured topic objects. It must NEVER output:
- Raw articles or search results
- Raw Tavily API responses
- Intermediate clustering data
- Internal reasoning or tool call logs

The frontend receives clean, ready-to-render topic data. Nothing else.

## Topic Object Structure

```typescript
interface Topic {
  /** Unique identifier for this topic */
  id: string

  /** Short, event-specific headline (e.g., "Earthquake strikes northern Japan") */
  title: string

  /** 1–2 sentence neutral summary of the event */
  summary: string

  /** Category label: "politics", "technology", "world", "business", "science", "sports", "entertainment", "health" */
  category: string

  /** Number of sources that support this topic */
  sourceCount: number

  /** 2–4 representative sources for display */
  representativeSources: TopicSource[]

  /** Search query that can be used to fetch more about this topic later */
  searchQuery: string

  /** Agent confidence: "high" (3+ strong sources), "medium" (2 sources), "low" (limited support) */
  confidence: 'high' | 'medium' | 'low'

  /** ISO timestamp of when this topic was last updated */
  lastUpdated: string

  /** Optional image URL from a source */
  imageUrl?: string
}

interface TopicSource {
  /** Source article URL */
  url: string

  /** Source article title */
  title: string

  /** Domain name (e.g., "reuters.com") */
  domain: string

  /** Source type classification */
  type: 'news' | 'opinion' | 'social' | 'video' | 'image'

  /** Short excerpt or snippet */
  snippet: string

  /** ISO timestamp of publication, if available */
  publishedAt?: string
}
```

## Validation Rules

Before returning topics to the frontend, the agent must validate:

1. **id** — must be a non-empty unique string
2. **title** — must describe a specific event, not a broad theme
3. **summary** — must be 1–2 sentences, neutral tone, no opinion
4. **category** — must be one of the allowed values
5. **sourceCount** — must be >= 2
6. **representativeSources** — must contain 2–4 sources, at least one with type "news"
7. **confidence** — must reflect actual source support
8. **lastUpdated** — must be a valid ISO timestamp

## API Response Shape

```typescript
interface AgentResponse {
  topics: Topic[]
  metadata: {
    /** Number of agentic loop iterations performed */
    iterations: number
    /** Total sources analyzed across all iterations */
    totalSourcesAnalyzed: number
    /** ISO timestamp of when the response was generated */
    timestamp: string
  }
}
```

## Error Response Shape

```typescript
interface AgentErrorResponse {
  error: string
  code: 'AGENT_TIMEOUT' | 'TOOL_FAILURE' | 'INSUFFICIENT_TOPICS' | 'UNKNOWN'
  partialTopics?: Topic[]  // return whatever was found before failure
}
```

If the agent fails mid-loop, it should return any valid topics discovered so far as `partialTopics`.
