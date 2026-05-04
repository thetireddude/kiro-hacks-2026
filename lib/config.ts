export const AGENT_CONFIG = {
  /** Target number of topics to discover */
  targetTopicCount: 5,

  /** Maximum number of loop iterations before stopping */
  maxIterations: 4,

  /** Minimum sources required to consider a topic valid */
  minSourcesPerTopic: 2,

  /** Maximum representative sources to include per topic */
  maxRepresentativeSourcesPerTopic: 4,

  /** OpenAI model for the main agent loop (orchestration + query generation) */
  model: 'gpt-4o-mini' as const,

  /** OpenAI model for cluster_sources (high token usage — use mini to avoid TPM limits) */
  clusteringModel: 'gpt-4o-mini' as const,

  /** Temperature for the agexnt (low for factual consistency) */
  temperature: 0.3,

  /** Max characters of source content to send to cluster_sources (keeps token usage low) */
  clusteringContentMaxChars: 500,
}
