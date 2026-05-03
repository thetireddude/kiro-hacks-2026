import OpenAI from 'openai'
import type {
  RawSource,
  FetchSourcesInput,
  FetchSourcesOutput,
  ClusterSourcesInput,
  ClusterSourcesOutput,
  SourceCluster,
} from './types'
import { searchTavily } from '../tavily'
import { AGENT_CONFIG } from '../config'
import type { ConfidenceLevel } from '../types'

/**
 * OpenAI function schema definitions for the agent's two tools.
 */
export const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'fetch_sources',
      description:
        'Search for current news sources using a query string. Returns articles with titles, URLs, content, and metadata.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for news discovery',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cluster_sources',
      description:
        'Group all accumulated news sources into event-level topic clusters. Filters out broad themes and returns only specific event clusters. Always operates on the full source pool.',
      parameters: {
        type: 'object',
        properties: {
          existingTopics: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Titles of already-accepted topics to avoid duplicates',
          },
        },
        required: [],
      },
    },
  },
]


/**
 * Execute the fetch_sources tool: calls Tavily search and maps results to RawSource[].
 * Returns `{ sources: [] }` on error with `[AGENT]` logging.
 */
export async function executeFetchSources(
  input: FetchSourcesInput
): Promise<FetchSourcesOutput> {
  // Fail fast if API key is missing — no point running the loop
  if (!process.env.TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY is not set. Add it to .env.local to enable news search.')
  }

  try {
    const results = await searchTavily(input.query)

    const sources: RawSource[] = results.map((result) => ({
      url: result.url,
      title: result.title,
      content: result.content,
      domain: new URL(result.url).hostname.replace(/^www\./, ''),
      publishedDate: undefined,
      score: result.score,
    }))

    console.log(
      `[AGENT] fetch_sources query="${input.query}" returned ${sources.length} sources`
    )

    return { sources }
  } catch (error) {
    console.error(
      `[AGENT] fetch_sources failed for query="${input.query}":`,
      error instanceof Error ? error.message : error
    )
    // Re-throw so the loop can surface the error rather than silently returning empty
    throw error
  }
}

/**
 * Execute the cluster_sources tool: uses an OpenAI call to semantically group
 * sources into event-level SourceCluster[].
 * Returns `{ clusters: [] }` on error with `[AGENT]` logging.
 */
export async function executeClusterSources(
  input: ClusterSourcesInput
): Promise<ClusterSourcesOutput> {
  try {
    const openai = new OpenAI()

    const sourceSummaries = input.sources.map((s, i) => ({
      index: i,
      title: s.title,
      domain: s.domain,
      content: s.content.slice(0, AGENT_CONFIG.clusteringContentMaxChars),
      url: s.url,
    }))

    const existingTopicsClause = input.existingTopics?.length
      ? `\n\nAlready accepted topics (do NOT create clusters that duplicate these):\n${input.existingTopics.map((t) => `- ${t}`).join('\n')}`
      : ''

    const clusteringPrompt = `You are a news clustering engine. Given a list of news source articles, group them into event-level topic clusters.

Rules:
- Each cluster must represent a SPECIFIC, identifiable real-world event (e.g., "Earthquake strikes northern Japan")
- REJECT broad themes like "US politics", "AI trends", "Climate change debate"
- Group sources that cover the SAME specific event together
- A source can only belong to one cluster
- Each cluster needs an eventTitle (short headline), eventSummary (1-2 sentences), category, and confidence level
- Valid categories: "politics", "technology", "world", "business", "science", "sports", "entertainment", "health"
- Confidence: "high" if 3+ strong sources, "medium" if 2 sources, "low" if limited support
- Only include clusters with at least 2 sources${existingTopicsClause}

Sources:
${JSON.stringify(sourceSummaries, null, 2)}

Respond with a JSON object containing a "clusters" array. Each cluster has:
- eventTitle: string (specific event headline)
- eventSummary: string (1-2 sentence neutral summary)
- category: string (one of the valid categories)
- sourceIndices: number[] (indices of sources in this cluster)
- confidence: "high" | "medium" | "low"`

    const response = await openai.chat.completions.create({
      model: AGENT_CONFIG.clusteringModel,
      temperature: AGENT_CONFIG.temperature,
      messages: [
        { role: 'system', content: 'You are a precise JSON-outputting news clustering engine. Always respond with valid JSON only, no markdown fences.' },
        { role: 'user', content: clusteringPrompt },
      ],
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.error('[AGENT] cluster_sources returned empty response')
      return { clusters: [] }
    }

    const parsed: {
      clusters?: Array<{
        eventTitle: string
        eventSummary: string
        category: string
        sourceIndices: number[]
        confidence: string
      }>
    } = JSON.parse(content)

    if (!parsed.clusters || !Array.isArray(parsed.clusters)) {
      console.error('[AGENT] cluster_sources response missing clusters array')
      return { clusters: [] }
    }

    const validConfidence = new Set<string>(['high', 'medium', 'low'])

    const clusters: SourceCluster[] = parsed.clusters
      .filter((c) => c.sourceIndices && c.sourceIndices.length >= 2)
      .map((c) => ({
        eventTitle: c.eventTitle,
        eventSummary: c.eventSummary,
        category: c.category,
        sources: c.sourceIndices
          .filter((idx) => idx >= 0 && idx < input.sources.length)
          .map((idx) => input.sources[idx]),
        confidence: (validConfidence.has(c.confidence)
          ? c.confidence
          : 'low') as ConfidenceLevel,
      }))
      .filter((c) => c.sources.length >= 2)

    console.log(
      `[AGENT] cluster_sources formed ${clusters.length} clusters from ${input.sources.length} sources`
    )

    return { clusters }
  } catch (error) {
    console.error(
      '[AGENT] cluster_sources failed:',
      error instanceof Error ? error.message : error
    )
    return { clusters: [] }
  }
}
