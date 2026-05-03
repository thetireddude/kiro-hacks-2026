export type TopicCategory =
  | 'politics'
  | 'technology'
  | 'world'
  | 'business'
  | 'science'
  | 'sports'
  | 'entertainment'
  | 'health'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type SourceType = 'news' | 'opinion' | 'social' | 'video' | 'image'

export interface TopicSource {
  /** Source article URL */
  url: string

  /** Source article title */
  title: string

  /** Domain name (e.g., "reuters.com") */
  domain: string

  /** Source type classification */
  type: SourceType

  /** Short excerpt or snippet */
  snippet: string

  /** ISO timestamp of publication, if available */
  publishedAt?: string
}

export interface Topic {
  /** Unique identifier for this topic */
  id: string

  /** Short, event-specific headline */
  title: string

  /** 1–2 sentence neutral summary of the event */
  summary: string

  /** Category label */
  category: TopicCategory

  /** Number of sources that support this topic */
  sourceCount: number

  /** 2–4 representative sources for display */
  representativeSources: TopicSource[]

  /** Search query that can be used to fetch more about this topic later */
  searchQuery: string

  /** Agent confidence level */
  confidence: ConfidenceLevel

  /** ISO timestamp of when this topic was last updated */
  lastUpdated: string

  /** Optional image URL from a source */
  imageUrl?: string
}

export interface AgentMetadata {
  /** Number of agentic loop iterations performed */
  iterations: number

  /** Total sources analyzed across all iterations */
  totalSourcesAnalyzed: number

  /** ISO timestamp of when the response was generated */
  timestamp: string
}

export interface AgentResponse {
  topics: Topic[]
  metadata: AgentMetadata
}

export type AgentErrorCode =
  | 'AGENT_TIMEOUT'
  | 'TOOL_FAILURE'
  | 'INSUFFICIENT_TOPICS'
  | 'UNKNOWN'

export interface AgentErrorResponse {
  error: string
  code: AgentErrorCode
  partialTopics?: Topic[]
}
