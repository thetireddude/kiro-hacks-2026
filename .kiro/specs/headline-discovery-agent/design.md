# Design Document

## Overview

This design describes the implementation of the Headline Discovery Agent — the core intelligence engine that discovers event-level news topics through an iterative agentic loop. The system comprises: a configuration module, an agent loop orchestrator, two agent tools (`fetch_sources` and `cluster_sources`), a system prompt, an API route, and a minimal frontend feed page with session caching.

The agent runs server-side using an OpenAI ChatGPT model with function calling. It iteratively calls tools to gather sources, cluster them into event-level topics, and refine until exit conditions are met. The output is a validated `Topic[]` array returned through `POST /api/agent`.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Feed_Page)                                    │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  TopicCard[]   │  │ ReloadButton │  │ SessionCache │ │
│  └───────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│          │                 │                  │          │
│          └─────────────────┼──────────────────┘          │
│                            │                             │
│                    POST /api/agent                       │
└────────────────────────────┼─────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────┐
│  Server                    ▼                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  API Route (app/api/agent/route.ts)                 │ │
│  │  - Parses request body                              │ │
│  │  - Calls runAgentLoop()                             │ │
│  │  - Returns AgentResponse or AgentErrorResponse      │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │                                │
│  ┌──────────────────────▼──────────────────────────────┐ │
│  │  Agent Loop (lib/agent/loop.ts)                     │ │
│  │  - Initializes state (AgentLoopState)               │ │
│  │  - Sends system prompt + tool definitions to OpenAI │ │
│  │  - Iterates: OpenAI decides tool calls              │ │
│  │  - Executes tool calls, feeds results back          │ │
│  │  - Validates and finalizes topics                   │ │
│  └──────┬───────────────────────────────┬──────────────┘ │
│         │                               │                │
│  ┌──────▼──────────┐  ┌────────────────▼─────────────┐  │
│  │  fetch_sources   │  │  cluster_sources             │  │
│  │  (lib/agent/     │  │  (lib/agent/tools.ts)        │  │
│  │   tools.ts)      │  │  - Groups sources into       │  │
│  │  - Calls Tavily  │  │    event-level clusters      │  │
│  │    search API    │  │  - Uses OpenAI for semantic   │  │
│  │  - Returns       │  │    grouping                  │  │
│  │    RawSource[]   │  │  - Returns SourceCluster[]   │  │
│  └──────┬───────────┘  └────────────────────────────┘   │
│         │                                                │
│  ┌──────▼───────────┐                                    │
│  │  Tavily Helper   │                                    │
│  │  (lib/tavily.ts) │                                    │
│  │  - HTTP calls to │                                    │
│  │    Tavily API    │                                    │
│  └──────────────────┘                                    │
└──────────────────────────────────────────────────────────┘
```

## Components

### 1. Configuration Module (`lib/config.ts`)

**Purpose:** Centralize all tunable agent parameters.

**Exports:**
```typescript
export const AGENT_CONFIG = {
  targetTopicCount: 5,
  maxIterations: 3,
  minSourcesPerTopic: 2,
  maxRepresentativeSourcesPerTopic: 4,
  model: 'gpt-4o',
  temperature: 0.3,
}
```

**Design decisions:**
- Plain object export, not a class — keeps it simple for a hackathon prototype
- Values can be overridden at the API route level (e.g., `topicCount` from request body)
- No environment variable indirection for these values — they are code-level constants

### 2. Shared Types (`lib/types.ts`)

**Purpose:** Define all types shared between agent and frontend layers.

**Exports:** `Topic`, `TopicSource`, `TopicCategory`, `ConfidenceLevel`, `SourceType`, `AgentResponse`, `AgentMetadata`, `AgentErrorResponse`, `AgentErrorCode`

These types are already defined in the steering files. Implementation follows the `types.md` steering file exactly.

### 3. Agent Internal Types (`lib/agent/types.ts`)

**Purpose:** Define types used only within the agent layer.

**Exports:** `RawSource`, `SourceCluster`, `AgentLoopState`, `FetchSourcesInput`, `FetchSourcesOutput`, `ClusterSourcesInput`, `ClusterSourcesOutput`

```typescript
export interface FetchSourcesInput {
  query: string
}

export interface FetchSourcesOutput {
  sources: RawSource[]
}

export interface ClusterSourcesInput {
  sources: RawSource[]
  existingTopics?: string[]
}

export interface ClusterSourcesOutput {
  clusters: SourceCluster[]
}
```

### 4. System Prompt (`lib/agent/system-prompt.ts`)

**Purpose:** Define the agent's identity, goals, and behavioral constraints as a system message for the OpenAI API.

**Exports:** `getSystemPrompt(): string`

**Content guidelines:**
- Instructs the agent to act as a neutral, factual news analyst
- Defines the goal: discover `targetTopicCount` event-level topics
- Explains the two available tools and when to use them
- Specifies the iterative loop strategy (broad first, then refine)
- Enforces social media rules (supporting signal only)
- Instructs balanced US + world coverage
- Defines what makes a valid vs. invalid topic (specific event vs. broad theme)
- Instructs the agent to signal when it wants to stop iterating

### 5. Agent Tools (`lib/agent/tools.ts`)

**Purpose:** Implement the two tools the agent can call, and define their OpenAI function schemas.

#### 5a. `fetch_sources`

**Implementation:**
- Accepts `FetchSourcesInput` (single query string)
- Calls the Tavily search helper (`lib/tavily.ts`) with the query
- Maps Tavily response to `RawSource[]`
- On error: logs with `[AGENT]` prefix, returns `{ sources: [] }`

**OpenAI function schema:**
```json
{
  "name": "fetch_sources",
  "description": "Search for current news sources using a query string. Returns articles with titles, URLs, content, and metadata.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query for news discovery" }
    },
    "required": ["query"]
  }
}
```

#### 5b. `cluster_sources`

**Implementation:**
- Accepts `ClusterSourcesInput` (sources array + optional existing topic titles)
- Uses an OpenAI call to semantically group sources into event-level clusters
- The clustering prompt instructs the model to:
  - Group sources by specific real-world event
  - Reject broad themes
  - Assign category, confidence, eventTitle, eventSummary
  - Avoid duplicating existing topics
- Returns `ClusterSourcesOutput`
- On error: logs with `[AGENT]` prefix, returns `{ clusters: [] }`

**OpenAI function schema:**
```json
{
  "name": "cluster_sources",
  "description": "Group news sources into event-level topic clusters. Filters out broad themes and returns only specific event clusters.",
  "parameters": {
    "type": "object",
    "properties": {
      "sources": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "url": { "type": "string" },
            "title": { "type": "string" },
            "content": { "type": "string" },
            "domain": { "type": "string" },
            "publishedDate": { "type": "string" },
            "score": { "type": "number" }
          },
          "required": ["url", "title", "content", "domain", "score"]
        }
      },
      "existingTopics": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Titles of already-accepted topics to avoid duplicates"
      }
    },
    "required": ["sources"]
  }
}
```

**Design note on `cluster_sources`:** This tool is implemented as a separate OpenAI call (not the agent's own reasoning) because clustering is a distinct analytical task. The agent decides *when* to cluster, but the clustering logic itself is a dedicated prompt that receives raw sources and returns structured clusters. This keeps the agent's context window focused on orchestration.

### 6. Tavily Helper (`lib/tavily.ts`)

**Purpose:** Encapsulate Tavily API HTTP calls.

**Exports:** `searchTavily(query: string): Promise<TavilySearchResult[]>`

**Implementation:**
- Makes HTTP POST to Tavily search API
- Requires `TAVILY_API_KEY` environment variable
- Returns raw Tavily results which `fetch_sources` maps to `RawSource[]`
- Throws on HTTP errors (caller handles)

### 7. Agent Loop (`lib/agent/loop.ts`)

**Purpose:** Orchestrate the iterative agent loop using OpenAI's chat completions with function calling.

**Exports:** `runAgentLoop(config?: Partial<typeof AGENT_CONFIG>): Promise<AgentResponse | AgentErrorResponse>`

**Algorithm:**

```
1. Initialize AgentLoopState { iteration: 0, sourcePool: [], clusters: [], validTopics: [], fetchCallCount: 0 }
2. Record start time
3. Build messages array: [system prompt]
4. LOOP while iteration < maxIterations:
   a. increment iteration
   b. Log "[AGENT] Iteration {n}"
   c. Call OpenAI chat completion with messages + tool definitions
   d. IF response contains tool_calls:
      - For each tool call:
        - Execute the tool (fetch_sources or cluster_sources)
        - Log tool name, input summary, output summary
        - If fetch_sources: merge results into sourcePool, deduplicate by URL
        - If cluster_sources: update clusters, evaluate valid topics
        - Append tool result to messages
      - Continue loop (OpenAI will decide next action)
   e. IF response is a text message (no tool calls):
      - Agent has decided to stop — break loop
   f. Check exit conditions:
      - validTopics.length >= targetTopicCount → break
      - iteration >= maxIterations → break
5. FINALIZE:
   a. Select top topics by confidence + category diversity
   b. Validate each topic (id, title, sourceCount, representativeSources)
   c. Assign unique IDs (crypto.randomUUID or similar)
   d. Build AgentResponse with metadata
   e. Log total elapsed time
   f. Return AgentResponse
```

**Error handling:**
- Wrap each tool execution in try/catch — log and continue on failure
- Wrap OpenAI API call in try/catch — retry once with 1s delay, then fail
- On unrecoverable failure: return AgentErrorResponse with any partialTopics

**Deduplication logic:**
- Before each `cluster_sources` call, deduplicate sourcePool by URL using a `Set<string>` tracking seen URLs
- Pass existing valid topic titles to `cluster_sources` to avoid duplicate clusters

**Topic validation (applied during finalization):**
- `id`: non-empty string
- `title`: non-empty, event-specific (not a broad theme — validated by the clustering prompt)
- `sourceCount`: >= `minSourcesPerTopic`
- `representativeSources`: length between 2 and `maxRepresentativeSourcesPerTopic`, at least one with `type: 'news'`
- `category`: must be one of the allowed `TopicCategory` values
- `confidence`: derived from source count (3+ → high, 2 → medium, <2 → low)
- `lastUpdated`: valid ISO 8601 string
- `summary`: non-empty
- `searchQuery`: non-empty

### 8. API Route (`app/api/agent/route.ts`)

**Purpose:** Thin HTTP wrapper that triggers the agent loop.

**Implementation:**
```typescript
export async function POST(request: Request): Promise<Response> {
  // 1. Parse request body for optional topicCount
  // 2. Call runAgentLoop with config override
  // 3. If success: return JSON AgentResponse with status 200
  // 4. If error: return JSON AgentErrorResponse with status 500
}
```

**Design decisions:**
- No authentication (hackathon prototype)
- No rate limiting
- No streaming (future optimization)
- Request body is optional — defaults to AGENT_CONFIG values

### 9. Feed Page (`app/page.tsx`)

**Purpose:** Minimal homepage that displays topic cards, handles reload, and manages session caching.

**Implementation:** Client component (`"use client"`) that:
1. On mount: checks `sessionStorage` for cached topics
2. If cached: displays them immediately
3. If not cached: calls `POST /api/agent`, shows loading state
4. On success: stores topics in `sessionStorage`, renders cards
5. On error: displays error message with retry button
6. Reload button: calls `POST /api/agent` regardless of cache, replaces cache on success

**Session cache key:** `"newnews-topics"`
**Session cache format:** JSON-serialized `Topic[]`

### 10. Topic Card Component (`components/feed/TopicCard.tsx`)

**Purpose:** Render a single topic as a card.

**Props:** `{ topic: Topic }`

**Display:** Category badge, title, summary, source count, confidence indicator.

**Styling:** Tailwind CSS, centered, rounded corners, responsive width (max 480px mobile, max 560px desktop).

### 11. Reload Button Component (`components/feed/ReloadButton.tsx`)

**Purpose:** Trigger a new agent run.

**Props:** `{ onReload: () => void, isLoading: boolean }`

**Behavior:** Disabled while loading, shows loading indicator.

## Correctness Properties

### Property 1: Source pool deduplication produces unique URLs
**Requirement:** 4.5, 7.1
**Type:** Idempotence / Invariant
**Description:** For any array of RawSource objects (potentially containing duplicate URLs), after deduplication, every URL in the resulting pool is unique. Applying deduplication a second time produces the same result.
**Test approach:** Generate random arrays of RawSource objects with some duplicate URLs. Verify that the deduplicated pool has all unique URLs and that `dedup(dedup(sources))` equals `dedup(sources)`.

### Property 2: Loop iteration count never exceeds maxIterations
**Requirement:** 4.1, 5.2
**Type:** Invariant
**Description:** For any configuration of maxIterations and any sequence of tool call results, the agent loop must terminate with an iteration count <= maxIterations.
**Test approach:** Use mocked OpenAI and tool responses that never satisfy the topic count. Vary maxIterations (1–10). Verify the loop always exits within the configured limit.

### Property 3: Every accepted topic has sourceCount >= minSourcesPerTopic
**Requirement:** 6.3, 17.3
**Type:** Invariant
**Description:** For any output of the agent loop, every Topic in the response has `sourceCount >= minSourcesPerTopic`.
**Test approach:** Generate random SourceCluster arrays with varying source counts. Run the validation/finalization logic. Verify that all output topics satisfy the minimum source count.

### Property 4: Every accepted topic has at least one news-type source
**Requirement:** 6.4, 17.3
**Type:** Invariant
**Description:** For any output of the agent loop, every Topic's `representativeSources` array contains at least one source with `type: 'news'`.
**Test approach:** Generate random SourceCluster arrays with varying source types. Run the validation/finalization logic. Verify the invariant holds on all output topics.

### Property 5: Confidence level matches source count rules
**Requirement:** 6.6
**Type:** Invariant
**Description:** For any finalized Topic, `confidence` is "high" when `sourceCount >= 3`, "medium" when `sourceCount === 2`, and "low" when `sourceCount < 2` (though topics with < 2 should be filtered out by validation).
**Test approach:** Generate topics with random source counts. Apply the confidence assignment function. Verify the mapping is correct for all inputs.

### Property 6: Output topic count never exceeds targetTopicCount
**Requirement:** 8.1
**Type:** Invariant
**Description:** For any agent loop execution, the number of topics in the response is <= `targetTopicCount`.
**Test approach:** Use mocked responses that produce many valid clusters. Vary targetTopicCount. Verify the output is always capped.

### Property 7: All topic IDs are unique and non-empty
**Requirement:** 8.2
**Type:** Invariant
**Description:** For any agent loop output, all topic IDs are non-empty strings and no two topics share the same ID.
**Test approach:** Generate multiple finalization runs with varying topic counts. Verify uniqueness and non-emptiness of all IDs.

### Property 8: Representative sources count is within bounds
**Requirement:** 8.3
**Type:** Invariant
**Description:** For any finalized Topic, `representativeSources.length` is between 2 and `maxRepresentativeSourcesPerTopic` (inclusive).
**Test approach:** Generate clusters with varying numbers of sources. Run finalization. Verify bounds on all output topics.

### Property 9: All topic categories are valid enum values
**Requirement:** 8.5
**Type:** Invariant
**Description:** For any finalized Topic, `category` is one of: "politics", "technology", "world", "business", "science", "sports", "entertainment", "health".
**Test approach:** Run finalization on clusters with various categories. Verify all output categories are in the allowed set.

### Property 10: lastUpdated is a valid ISO 8601 timestamp
**Requirement:** 8.4
**Type:** Invariant
**Description:** For any finalized Topic, `lastUpdated` parses as a valid Date and matches ISO 8601 format.
**Test approach:** Run finalization. Verify `new Date(topic.lastUpdated).toISOString()` does not throw and matches the original string.

### Property 11: Agent output contains no internal types
**Requirement:** 17.1, 17.2
**Type:** Invariant
**Description:** The AgentResponse object contains only fields defined in the Topic and AgentMetadata interfaces. No RawSource, SourceCluster, or AgentLoopState fields appear in the serialized response.
**Test approach:** Run the full loop with mocks. Serialize the response to JSON. Verify no internal-only field names (e.g., "content", "score", "sourcePool", "clusters", "fetchCallCount") appear at any level of the response.

## File Structure

```
lib/
  config.ts                    # AGENT_CONFIG export
  types.ts                     # Shared types (Topic, TopicSource, AgentResponse, etc.)
  utils.ts                     # Utility functions (cn helper)
  tavily.ts                    # Tavily API helper
  agent/
    loop.ts                    # runAgentLoop() — main orchestrator
    system-prompt.ts           # getSystemPrompt() — agent system message
    tools.ts                   # Tool implementations + OpenAI function schemas
    types.ts                   # Agent-internal types (RawSource, SourceCluster, etc.)
app/
  page.tsx                     # Feed page (client component with session caching)
  api/
    agent/
      route.ts                 # POST handler — triggers agent loop
components/
  feed/
    TopicCard.tsx              # Single topic card display
    ReloadButton.tsx           # Reload feed trigger button
```

## Dependencies

**New dependencies required:**
- `openai` — OpenAI Node.js SDK for chat completions with function calling
- No additional dependencies for Tavily (direct HTTP via `fetch`)
- shadcn/ui components: `card`, `badge`, `button`, `skeleton` (installed via CLI)

**Existing dependencies used:**
- `next` (App Router, API routes)
- `react`, `react-dom`
- `tailwindcss`

## Error Handling Strategy

| Failure | Behavior | Response |
|---------|----------|----------|
| Single `fetch_sources` call fails | Log error, continue with other queries | Loop continues |
| All `fetch_sources` calls fail in an iteration | Log, continue to next iteration with existing pool | Loop continues |
| `cluster_sources` fails | Return valid topics found so far | `AgentErrorResponse` with `partialTopics`, code `TOOL_FAILURE` |
| OpenAI API call fails | Retry once after 1s delay | If retry fails: `AgentErrorResponse`, code `AGENT_TIMEOUT` |
| OpenAI API call fails after retry | Return any valid topics | `AgentErrorResponse` with `partialTopics`, code `AGENT_TIMEOUT` |
| Loop completes with 0 valid topics | Return empty topics array | `AgentResponse` with `topics: []` |
| Unexpected error | Catch at API route level | `AgentErrorResponse`, code `UNKNOWN` |
