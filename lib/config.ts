export const AGENT_CONFIG = {
  /** Target number of topics to discover */
  targetTopicCount: 5,

  /** Maximum number of loop iterations before stopping */
  maxIterations: 3,

  /** Minimum sources required to consider a topic valid */
  minSourcesPerTopic: 2,

  /** Maximum representative sources to include per topic */
  maxRepresentativeSourcesPerTopic: 4,

  /** OpenAI model to use */
  model: 'gpt-4o' as const,

  /** Temperature for the agent (low for factual consistency) */
  temperature: 0.3,
}
