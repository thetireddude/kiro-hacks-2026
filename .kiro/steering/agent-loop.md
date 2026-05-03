# Agent Loop Implementation Guide

This document defines the detailed behavior of the agentic loop — the core intelligence engine of the system.

## Loop Overview

The agent loop is an iterative process that transforms raw search results into validated, structured topic objects. It runs server-side and is triggered by the frontend via `POST /api/agent`.

## Configuration

All loop parameters should live in `lib/config.ts`:

```typescript
const AGENT_CONFIG = {
  /** Target number of topics to discover */
  targetTopicCount: 8,

  /** Maximum number of loop iterations before stopping */
  maxIterations: 5,

  /** Maximum total fetch_sources calls across all iterations */
  maxFetchCalls: 15,

  /** Minimum sources required to consider a topic valid */
  minSourcesPerTopic: 2,

  /** Maximum representative sources to include per topic */
  maxRepresentativeSourcesPerTopic: 4,

  /** OpenAI model to use */
  model: 'gpt-4o',

  /** Temperature for the agent (low for factual consistency) */
  temperature: 0.3,
}
```

## Loop Lifecycle

### Phase 1: Initialization
1. Receive trigger from API route
2. Initialize empty source pool and topic list
3. Set iteration counter to 0

### Phase 2: Broad Discovery (Iteration 1)
1. Agent generates 3–5 broad, diverse search queries
2. Call `fetch_sources` for each query
3. Accumulate all returned sources into the source pool
4. Call `cluster_sources` on the full pool
5. Evaluate resulting clusters

### Phase 3: Iterative Refinement (Iterations 2+)
1. Count valid topics from clustering
2. If target reached → exit loop
3. If not, agent analyzes gaps:
   - Which categories are underrepresented?
   - Which regions are missing?
   - Are there signals of events that need more sources?
4. Agent generates targeted refinement queries
5. Call `fetch_sources` with new queries
6. Merge new sources into the pool (deduplicate by URL)
7. Call `cluster_sources` again on the expanded pool
8. Repeat evaluation

### Phase 4: Finalization
1. Select top N topics by confidence and diversity
2. Validate each topic against the output contract (see `topic-contract.md`)
3. Assign unique IDs
4. Return structured `AgentResponse`

## Tool Call Patterns

### fetch_sources
```typescript
// Input
interface FetchSourcesInput {
  query: string
}

// Output
interface FetchSourcesOutput {
  sources: RawSource[]
}

interface RawSource {
  url: string
  title: string
  content: string
  domain: string
  publishedDate?: string
  score: number
}
```

### cluster_sources
```typescript
// Input
interface ClusterSourcesInput {
  sources: RawSource[]
  existingTopics?: string[]  // titles of already-accepted topics, to avoid duplicates
}

// Output
interface ClusterSourcesOutput {
  clusters: SourceCluster[]
}

interface SourceCluster {
  eventTitle: string
  eventSummary: string
  category: string
  sources: RawSource[]
  confidence: 'high' | 'medium' | 'low'
}
```

## Deduplication

- Deduplicate sources by URL before clustering
- Deduplicate topics by semantic similarity (agent should not return two topics about the same event)
- If two clusters describe the same event, merge them

## Exit Conditions

The loop exits when ANY of these are true:
1. Target topic count is reached
2. Maximum iterations reached
3. Maximum fetch calls exhausted
4. Agent determines no further useful queries can be generated

## Error Recovery

- If a `fetch_sources` call fails, log the error and continue with remaining queries
- If `cluster_sources` fails, return whatever valid topics exist as `partialTopics`
- If the OpenAI API call fails, retry once with exponential backoff, then fail gracefully
- Never let a single tool failure crash the entire loop

## Logging (Development)

During development, log:
- Each iteration number
- Queries generated per iteration
- Number of sources fetched per query
- Number of clusters formed
- Number of valid topics after each iteration
- Total elapsed time

Use `console.log` with a `[AGENT]` prefix for easy filtering.
