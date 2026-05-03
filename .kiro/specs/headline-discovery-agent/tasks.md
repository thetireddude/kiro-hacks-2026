# Implementation Plan: Headline Discovery Agent

## Overview

Minimal implementation to get the agent loop discovering topics and displaying them on screen. Stripped to core functionality only.

## Tasks

- [x] 1. Install openai dependency
  - Run `npm install openai`
  - _Requirements: N/A (infrastructure)_

- [x] 2. Create shared types and config
  - Create `lib/config.ts` with `AGENT_CONFIG` export (`targetTopicCount: 5`, `maxIterations: 3`, `minSourcesPerTopic: 2`, `maxRepresentativeSourcesPerTopic: 4`, `model: 'gpt-4o'`, `temperature: 0.3`)
  - Create `lib/types.ts` with all shared type exports: `Topic`, `TopicSource`, `TopicCategory`, `ConfidenceLevel`, `SourceType`, `AgentResponse`, `AgentMetadata`, `AgentErrorResponse`, `AgentErrorCode`
  - Create `lib/agent/types.ts` with agent-internal types: `RawSource`, `SourceCluster`, `AgentLoopState`, `FetchSourcesInput`, `FetchSourcesOutput`, `ClusterSourcesInput`, `ClusterSourcesOutput`
  - _Requirements: 1.1–1.7, 17.1_

- [x] 3. Implement Tavily helper
  - Create `lib/tavily.ts` with `searchTavily(query: string)` that calls Tavily search API using `fetch`, reads `TAVILY_API_KEY` from env, returns raw results, and throws on HTTP errors
  - _Requirements: 9.3_

- [x] 4. Implement agent tools
  - Create `lib/agent/tools.ts` with OpenAI function schema definitions for `fetch_sources` and `cluster_sources`, exported as `TOOL_DEFINITIONS`
  - Implement `executeFetchSources` that calls `searchTavily`, maps results to `RawSource[]`, returns `{ sources: [] }` on error with `[AGENT]` logging
  - Implement `executeClusterSources` that uses an OpenAI call to semantically group sources into `SourceCluster[]`, returns `{ clusters: [] }` on error with `[AGENT]` logging
  - _Requirements: 9.1–9.4, 10.1–10.5_

- [x] 5. Create agent system prompt
  - Create `lib/agent/system-prompt.ts` with `getSystemPrompt()` returning the system message string
  - Prompt must instruct the agent to: act as a neutral factual news analyst, discover event-level topics (not broad themes), balance US and world coverage, use social media only as supporting signal, and explain the two available tools
  - _Requirements: 12.1–12.5_

- [x] 6. Implement agent loop
  - Create `lib/agent/loop.ts` with `runAgentLoop(config?: Partial<typeof AGENT_CONFIG>): Promise<AgentResponse | AgentErrorResponse>`
  - Initialize `AgentLoopState` with empty sourcePool, clusters, validTopics, iteration 0, fetchCallCount 0
  - Implement main iteration loop: call OpenAI chat completion with system prompt, message history, and tool definitions; process tool_calls by executing the appropriate tool and appending results to messages
  - Deduplicate source pool by URL using a `Set<string>` before each `cluster_sources` call
  - Implement exit conditions: valid topic count >= targetTopicCount, iteration >= maxIterations, or agent sends text message (no tool calls)
  - Implement topic validation: verify id, sourceCount >= minSourcesPerTopic, representativeSources (2 to max, at least one "news" type), valid category, confidence matching source count rules
  - Implement finalization: select top topics by confidence and category diversity, assign unique IDs via `crypto.randomUUID()`, set `lastUpdated`, build and return `AgentResponse`
  - Implement error recovery: try/catch around tool execution (log and continue), try/catch around OpenAI calls (retry once with 1s delay), return `AgentErrorResponse` with partialTopics on failure
  - Add `[AGENT]` prefixed logging: iteration number, queries per iteration, sources fetched, clusters formed, valid topics, elapsed time
  - _Requirements: 2.1–2.4, 3.1–3.5, 4.1–4.6, 5.1–5.3, 6.1–6.6, 7.1–7.3, 8.1–8.8, 13.1–13.4, 14.1–14.6, 17.2–17.3_

- [x] 7. Checkpoint
  - Ensure all agent code compiles, ask the user if questions arise.

- [x] 8. Create API route
  - Create `app/api/agent/route.ts` with `POST` handler that parses optional `topicCount` from request body, calls `runAgentLoop`, returns HTTP 200 with `AgentResponse` on success, HTTP 500 with `AgentErrorResponse` on failure, and wraps in top-level try/catch returning code `UNKNOWN` for unexpected errors
  - _Requirements: 11.1–11.6_

- [x] 9. Build feed page and topic cards
  - Rewrite `app/page.tsx` as a `"use client"` component managing topics, loading, and error state
  - On mount, call `POST /api/agent` and display results
  - Create `components/feed/TopicCard.tsx` rendering: category badge (colored pill), title (bold, large), summary (muted), metadata row (source count, confidence indicator), styled with Tailwind CSS, centered, max-width 480px mobile / 560px desktop
  - Create `components/feed/ReloadButton.tsx` with `onReload` and `isLoading` props, disabled while loading
  - Implement UI states: loading (skeleton/shimmer), error (message + retry button), empty (no topics + reload), partial (partial topics + incomplete notice)
  - _Requirements: 16.1–16.6_

- [x] 10. Final checkpoint
  - Ensure everything compiles and wires together end-to-end, ask the user if questions arise.

## Notes

- No property-based tests, session caching, utils.ts, or shadcn installation steps — just the bare minimum to get the agent discovering topics and showing them on screen
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
