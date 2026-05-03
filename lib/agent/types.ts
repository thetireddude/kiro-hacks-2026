import type { ConfidenceLevel, Topic } from '../types'

export interface RawSource {
  url: string
  title: string
  content: string
  domain: string
  publishedDate?: string
  score: number
}

export interface SourceCluster {
  eventTitle: string
  eventSummary: string
  category: string
  sources: RawSource[]
  confidence: ConfidenceLevel
}

export interface AgentLoopState {
  iteration: number
  sourcePool: RawSource[]
  clusters: SourceCluster[]
  validTopics: Topic[]
  fetchCallCount: number
}

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
