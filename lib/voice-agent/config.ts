export interface VoiceAgentConfig {
  /** OpenAI model identifier for chat completions */
  model: string;
  /** LLM temperature (0–1) */
  temperature: number;
  /** Max Tavily search iterations during initial research */
  maxResearchIterations: number;
  /** Target number of sources to collect during initial research */
  targetSourceCount: number;
  /** Minimum distinct viewpoints to surface */
  minViewpointCount: number;
  /** Max user turns before conversation ends */
  maxConversationTurns: number;
  /** Max tool calls the agent can make in a single turn */
  maxToolCallsPerTurn: number;
  /** Max total Tavily searches across the entire session */
  maxSearchesPerConversation: number;
  /** Whether to enforce the source whitelist. Set to false to allow all domains. */
  enableSourceWhitelist: boolean;
  /** Allowed source domains — results from other domains are discarded */
  allowedDomains: string[];
}

export const VOICE_AGENT_CONFIG: VoiceAgentConfig = {
  model: "gpt-4o",
  temperature: 0.4,
  maxResearchIterations: 3,
  targetSourceCount: 6,
  minViewpointCount: 2,
  maxConversationTurns: 10,
  maxToolCallsPerTurn: 5,
  maxSearchesPerConversation: 8,
  enableSourceWhitelist: false,
  allowedDomains: [
    // Major wire services
    "apnews.com",
    "reuters.com",

    // US broadsheets & networks
    "nytimes.com",
    "washingtonpost.com",
    "wsj.com",
    "cnn.com",
    "nbcnews.com",
    "abcnews.go.com",
    "cbsnews.com",
    "npr.org",
    "politico.com",
    "thehill.com",
    "usatoday.com",

    // International
    "bbc.com",
    "bbc.co.uk",
    "theguardian.com",
    "aljazeera.com",
    "france24.com",
    "dw.com",

    // Tech & business
    "techcrunch.com",
    "theverge.com",
    "arstechnica.com",
    "wired.com",
    "bloomberg.com",
    "ft.com",
    "cnbc.com",
    "forbes.com",

    // Analysis & opinion
    "theatlantic.com",
    "economist.com",
    "foreignaffairs.com",
    "vox.com",

    // Public reaction / social
    "reddit.com",
    "news.ycombinator.com",
  ],
};
