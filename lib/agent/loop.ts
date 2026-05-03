import OpenAI from 'openai'
import { AGENT_CONFIG } from '../config'
import { getSystemPrompt } from './system-prompt'
import { TOOL_DEFINITIONS, executeFetchSources, executeClusterSources } from './tools'
import type { AgentLoopState, RawSource, SourceCluster } from './types'
import type {
  Topic,
  TopicSource,
  TopicCategory,
  ConfidenceLevel,
  SourceType,
  AgentResponse,
  AgentErrorResponse,
} from '../types'

const VALID_CATEGORIES: TopicCategory[] = [
  'politics',
  'technology',
  'world',
  'business',
  'science',
  'sports',
  'entertainment',
  'health',
]

/**
 * Determine confidence level based on source count.
 */
function getConfidence(sourceCount: number): ConfidenceLevel {
  if (sourceCount >= 3) return 'high'
  if (sourceCount === 2) return 'medium'
  return 'low'
}

/**
 * Classify a source domain into a SourceType.
 * Defaults to 'news' for most domains.
 */
function classifySourceType(domain: string): SourceType {
  const socialDomains = ['twitter.com', 'x.com', 'reddit.com', 'facebook.com', 'instagram.com', 'threads.net', 'mastodon.social']
  const opinionIndicators = ['opinion', 'editorial', 'blog']
  const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com']

  const lowerDomain = domain.toLowerCase()

  if (socialDomains.some((d) => lowerDomain.includes(d))) return 'social'
  if (videoDomains.some((d) => lowerDomain.includes(d))) return 'video'
  if (opinionIndicators.some((ind) => lowerDomain.includes(ind))) return 'opinion'
  return 'news'
}

/**
 * Deduplicate sources by URL, keeping the first occurrence.
 */
function deduplicateByUrl(sources: RawSource[]): RawSource[] {
  const seen = new Set<string>()
  const result: RawSource[] = []
  for (const source of sources) {
    if (!seen.has(source.url)) {
      seen.add(source.url)
      result.push(source)
    }
  }
  return result
}

/**
 * Convert a SourceCluster to a validated Topic, or return null if invalid.
 */
function clusterToTopic(
  cluster: SourceCluster,
  config: typeof AGENT_CONFIG
): Topic | null {
  // Validate category
  const category = VALID_CATEGORIES.includes(cluster.category as TopicCategory)
    ? (cluster.category as TopicCategory)
    : null
  if (!category) return null

  // Validate source count
  if (cluster.sources.length < config.minSourcesPerTopic) return null

  // Build representative sources
  const representativeSources: TopicSource[] = cluster.sources
    .slice(0, config.maxRepresentativeSourcesPerTopic)
    .map((s) => ({
      url: s.url,
      title: s.title,
      domain: s.domain,
      type: classifySourceType(s.domain),
      snippet: s.content.slice(0, 200),
      publishedAt: s.publishedDate,
    }))

  // Ensure we have at least 2 representative sources
  if (representativeSources.length < 2) return null

  // Ensure at least one source has type "news"
  const hasNewsSource = representativeSources.some((s) => s.type === 'news')
  if (!hasNewsSource) return null

  // Reject if all sources are social media
  const allSocial = representativeSources.every((s) => s.type === 'social')
  if (allSocial) return null

  // Determine confidence based on source count
  const confidence = getConfidence(cluster.sources.length)

  const topic: Topic = {
    id: globalThis.crypto.randomUUID(),
    title: cluster.eventTitle,
    summary: cluster.eventSummary,
    category,
    sourceCount: cluster.sources.length,
    representativeSources,
    searchQuery: cluster.eventTitle,
    confidence,
    lastUpdated: new Date().toISOString(),
  }

  return topic
}

/**
 * Select top topics by confidence and category diversity, up to targetTopicCount.
 */
function selectTopTopics(topics: Topic[], targetCount: number): Topic[] {
  if (topics.length <= targetCount) return topics

  // Sort by confidence priority: high > medium > low
  const confidenceOrder: Record<ConfidenceLevel, number> = {
    high: 3,
    medium: 2,
    low: 1,
  }

  // First pass: sort by confidence
  const sorted = [...topics].sort(
    (a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
  )

  // Second pass: ensure category diversity
  const selected: Topic[] = []
  const categoriesSeen = new Set<TopicCategory>()

  // First, pick one from each unique category (highest confidence first)
  for (const topic of sorted) {
    if (selected.length >= targetCount) break
    if (!categoriesSeen.has(topic.category)) {
      categoriesSeen.add(topic.category)
      selected.push(topic)
    }
  }

  // Fill remaining slots with highest confidence topics not yet selected
  for (const topic of sorted) {
    if (selected.length >= targetCount) break
    if (!selected.includes(topic)) {
      selected.push(topic)
    }
  }

  return selected
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Run the agent loop — the core orchestrator for the Headline Discovery Agent.
 * Iteratively calls OpenAI with tool definitions, executes tool calls,
 * and produces validated Topic objects.
 */
export async function runAgentLoop(
  config?: Partial<typeof AGENT_CONFIG>
): Promise<AgentResponse | AgentErrorResponse> {
  const mergedConfig = { ...AGENT_CONFIG, ...config }
  const startTime = Date.now()

  // Initialize state (Req 2.1–2.4)
  const state: AgentLoopState = {
    iteration: 0,
    sourcePool: [],
    clusters: [],
    validTopics: [],
    fetchCallCount: 0,
  }

  const openai = new OpenAI()

  // Build messages array starting with system prompt
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: getSystemPrompt() },
  ]

  try {
    // Main iteration loop (Req 3.1–3.5, 4.1–4.6)
    while (state.iteration < mergedConfig.maxIterations) {
      state.iteration++
      console.log(`[AGENT] Iteration ${state.iteration}/${mergedConfig.maxIterations}`)

      // Call OpenAI chat completion with retry (Req 13.3)
      let response: OpenAI.Chat.Completions.ChatCompletion
      try {
        response = await openai.chat.completions.create({
          model: mergedConfig.model,
          temperature: mergedConfig.temperature,
          messages,
          tools: TOOL_DEFINITIONS,
        })
      } catch (error) {
        console.error('[AGENT] OpenAI API call failed, retrying in 1s...', error instanceof Error ? error.message : error)
        await sleep(1000)
        try {
          response = await openai.chat.completions.create({
            model: mergedConfig.model,
            temperature: mergedConfig.temperature,
            messages,
            tools: TOOL_DEFINITIONS,
          })
        } catch (retryError) {
          console.error('[AGENT] OpenAI API retry failed:', retryError instanceof Error ? retryError.message : retryError)
          const elapsed = Date.now() - startTime
          console.log(`[AGENT] Elapsed time: ${elapsed}ms (failed)`)
          return {
            error: 'OpenAI API call failed after retry',
            code: 'AGENT_TIMEOUT',
            partialTopics: state.validTopics.length > 0 ? state.validTopics : undefined,
          }
        }
      }

      const choice = response.choices[0]
      if (!choice) {
        console.error('[AGENT] No choices returned from OpenAI')
        break
      }

      const assistantMessage = choice.message

      // Append assistant message to history
      messages.push(assistantMessage)

      // Exit condition: agent sends text message with no tool calls (Req 5.3)
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        console.log('[AGENT] Agent sent text message (no tool calls) — stopping loop')
        if (assistantMessage.content) {
          console.log(`[AGENT] Agent message: ${assistantMessage.content.slice(0, 200)}`)
        }
        break
      }

      // Process tool calls (Req 4.4–4.6)
      let queriesThisIteration = 0
      let sourcesThisIteration = 0

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== 'function') {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: 'Unsupported tool call type' }),
          })
          continue
        }

        const functionName = toolCall.function.name
        let args: unknown

        try {
          args = JSON.parse(toolCall.function.arguments)
        } catch (parseError) {
          console.error(`[AGENT] Failed to parse arguments for ${functionName}:`, parseError instanceof Error ? parseError.message : parseError)
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: 'Failed to parse arguments' }),
          })
          continue
        }

        let result: string

        try {
          if (functionName === 'fetch_sources') {
            const input = args as { query: string }
            queriesThisIteration++
            state.fetchCallCount++

            const output = await executeFetchSources({ query: input.query })
            sourcesThisIteration += output.sources.length

            // Merge into source pool and deduplicate by URL (Req 4.5, 7.1)
            state.sourcePool = deduplicateByUrl([...state.sourcePool, ...output.sources])

            console.log(`[AGENT] fetch_sources: query="${input.query}", returned ${output.sources.length} sources, pool size=${state.sourcePool.length}`)
            result = JSON.stringify(output)
          } else if (functionName === 'cluster_sources') {
            // Deduplicate source pool before clustering (Req 7.1)
            state.sourcePool = deduplicateByUrl(state.sourcePool)

            const input = args as { sources?: RawSource[]; existingTopics?: string[] }
            const sourcesToCluster = input.sources ?? state.sourcePool
            const existingTopics = input.existingTopics ?? state.validTopics.map((t) => t.title)

            const output = await executeClusterSources({
              sources: sourcesToCluster,
              existingTopics,
            })

            // Update clusters
            state.clusters = output.clusters

            // Evaluate valid topics from clusters (Req 6.1–6.6)
            const newValidTopics: Topic[] = []
            for (const cluster of output.clusters) {
              const topic = clusterToTopic(cluster, mergedConfig)
              if (topic) {
                newValidTopics.push(topic)
              }
            }

            // Merge new valid topics (avoid duplicates by title)
            const existingTitles = new Set(state.validTopics.map((t) => t.title.toLowerCase()))
            for (const topic of newValidTopics) {
              if (!existingTitles.has(topic.title.toLowerCase())) {
                state.validTopics.push(topic)
                existingTitles.add(topic.title.toLowerCase())
              }
            }

            console.log(`[AGENT] cluster_sources: ${output.clusters.length} clusters formed, ${state.validTopics.length} valid topics total`)
            result = JSON.stringify(output)
          } else {
            console.error(`[AGENT] Unknown tool: ${functionName}`)
            result = JSON.stringify({ error: `Unknown tool: ${functionName}` })
          }
        } catch (toolError) {
          // Error recovery: log and continue (Req 13.1, 13.4)
          console.error(`[AGENT] Tool execution error (${functionName}):`, toolError instanceof Error ? toolError.message : toolError)
          result = JSON.stringify({ error: `Tool execution failed: ${toolError instanceof Error ? toolError.message : 'unknown error'}` })
        }

        // Append tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }

      // Log iteration summary (Req 14.2–14.5)
      console.log(`[AGENT] Iteration ${state.iteration} summary: ${queriesThisIteration} queries, ${sourcesThisIteration} sources fetched, ${state.validTopics.length} valid topics`)

      // Exit condition: valid topic count >= targetTopicCount (Req 5.1)
      if (state.validTopics.length >= mergedConfig.targetTopicCount) {
        console.log(`[AGENT] Target topic count reached (${state.validTopics.length}/${mergedConfig.targetTopicCount}) — stopping loop`)
        break
      }
    }

    // Finalization (Req 8.1–8.8)
    const finalTopics = selectTopTopics(state.validTopics, mergedConfig.targetTopicCount)

    // Assign fresh unique IDs and lastUpdated to finalized topics
    const now = new Date().toISOString()
    for (const topic of finalTopics) {
      topic.id = globalThis.crypto.randomUUID()
      topic.lastUpdated = now
    }

    const elapsed = Date.now() - startTime
    console.log(`[AGENT] Loop complete: ${finalTopics.length} topics, ${state.iteration} iterations, ${state.sourcePool.length} total sources, ${elapsed}ms elapsed`)

    // Build AgentResponse (Req 17.1–17.2)
    const agentResponse: AgentResponse = {
      topics: finalTopics,
      metadata: {
        iterations: state.iteration,
        totalSourcesAnalyzed: state.sourcePool.length,
        timestamp: now,
      },
    }

    return agentResponse
  } catch (error) {
    // Unrecoverable failure (Req 13.2)
    const elapsed = Date.now() - startTime
    console.error(`[AGENT] Unrecoverable error after ${elapsed}ms:`, error instanceof Error ? error.message : error)

    return {
      error: error instanceof Error ? error.message : 'Unknown agent error',
      code: 'UNKNOWN',
      partialTopics: state.validTopics.length > 0 ? state.validTopics : undefined,
    }
  }
}
