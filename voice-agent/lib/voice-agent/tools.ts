import { VOICE_AGENT_CONFIG } from "../config";
import {
  getSession,
  addMessage,
  incrementTurnCount,
  addSources,
} from "./memory";
import type {
  Source,
  Viewpoint,
  DashboardItem,
  ConversationMessage,
  LimitsStatus,
} from "@/lib/voice-agent/types";

// ---------------------------------------------------------------------------
// Tool schema definition
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "deep_research_sources",
    description:
      "Search for sources on a topic using Tavily. Returns an array of Source objects.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to research",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "filter_allowed_sources",
    description:
      "Filter an array of sources to only include those from allowed domains.",
    parameters: {
      type: "object",
      properties: {
        sources: {
          type: "array",
          description: "Array of Source objects to filter",
          items: { type: "object" },
        },
      },
      required: ["sources"],
    },
  },
  {
    name: "classify_viewpoints",
    description:
      "Classify an array of sources into distinct viewpoint groups using an LLM.",
    parameters: {
      type: "object",
      properties: {
        sources: {
          type: "array",
          description: "Array of Source objects to classify",
          items: { type: "object" },
        },
      },
      required: ["sources"],
    },
  },
  {
    name: "generate_topic_briefing",
    description:
      "Generate a spoken briefing summary and suggested questions from viewpoints.",
    parameters: {
      type: "object",
      properties: {
        topicTitle: { type: "string", description: "Title of the topic" },
        topicSummary: { type: "string", description: "Summary of the topic" },
        viewpoints: {
          type: "array",
          description: "Array of Viewpoint objects",
          items: { type: "object" },
        },
      },
      required: ["topicTitle", "topicSummary", "viewpoints"],
    },
  },
  {
    name: "get_conversation_context",
    description:
      "Retrieve recent conversation messages and a sources summary for a session.",
    parameters: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "The session identifier" },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "save_conversation_turn",
    description:
      "Save a conversation message to session memory and increment the turn count.",
    parameters: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "The session identifier" },
        role: {
          type: "string",
          enum: ["user", "assistant"],
          description: "Who sent the message",
        },
        content: { type: "string", description: "The message content" },
        sources: {
          type: "array",
          description: "Optional sources cited in this turn",
          items: { type: "object" },
        },
      },
      required: ["sessionId", "role", "content"],
    },
  },
  {
    name: "web_search_followup",
    description:
      "Perform a follow-up Tavily search, filter through the whitelist, and return results.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The follow-up search query",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "check_conversation_limits",
    description:
      "Check whether conversation limits have been reached for a session.",
    parameters: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "The session identifier" },
      },
      required: ["sessionId"],
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the domain from a URL string.
 * Returns the hostname without "www." prefix, or an empty string on failure.
 */
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Infer a source type from the domain.
 * Social / forum domains → "social", everything else → "news".
 */
function inferSourceType(
  domain: string
): "news" | "opinion" | "social" | "video" | "image" {
  const socialDomains = ["reddit.com", "news.ycombinator.com"];
  if (socialDomains.includes(domain)) return "social";
  return "news";
}

/**
 * Call the OpenAI Chat Completions API and return the assistant message content.
 */
async function chatCompletion(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VOICE_AGENT_CONFIG.model,
        temperature: VOICE_AGENT_CONFIG.temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ---------------------------------------------------------------------------
// Tool executor functions
// ---------------------------------------------------------------------------

/**
 * Execute a Tavily search and map results to Source[].
 */
export async function deepResearchSources(query: string): Promise<Source[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.error("TAVILY_API_KEY is not configured — returning empty results.");
    return [];
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: VOICE_AGENT_CONFIG.targetSourceCount,
      include_answer: false,
    }),
  });

  if (!response.ok) {
    console.error(`Tavily search error: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const results: Array<{
    url: string;
    title: string;
    content: string;
    published_date?: string;
  }> = data.results ?? [];

  return results.map((r) => {
    const domain = extractDomain(r.url);
    return {
      url: r.url,
      title: r.title ?? "",
      domain,
      type: inferSourceType(domain),
      snippet: r.content ?? "",
      publishedAt: r.published_date,
    };
  });
}

/**
 * Filter sources against the allowedDomains whitelist.
 * Only sources whose domain is present in the whitelist are kept.
 */
export function filterAllowedSources(sources: Source[]): Source[] {
  if (!VOICE_AGENT_CONFIG.enableSourceWhitelist) return sources;
  const allowed = new Set(VOICE_AGENT_CONFIG.allowedDomains);
  return sources.filter((s) => allowed.has(s.domain));
}

/**
 * Classify sources into distinct viewpoint groups using an LLM.
 */
export async function classifyViewpoints(
  sources: Source[]
): Promise<Viewpoint[]> {
  if (sources.length === 0) return [];

  const sourceSummaries = sources
    .map(
      (s, i) =>
        `[${i}] "${s.title}" (${s.domain}, ${s.type}): ${s.snippet.slice(0, 200)}`
    )
    .join("\n");

  const systemPrompt = `You are a news analyst. Given a list of sources about a topic, classify them into distinct viewpoint groups. Each group represents a different perspective, narrative, or angle on the story.

Return valid JSON — an array of objects with this shape:
[
  {
    "label": "short viewpoint label",
    "summary": "1-2 sentence summary of this perspective",
    "sourceIndices": [0, 2]
  }
]

Rules:
- Create between ${VOICE_AGENT_CONFIG.minViewpointCount} and 5 groups.
- Every source must belong to exactly one group.
- Labels should be concise and descriptive.
- Return ONLY the JSON array, no other text.`;

  const raw = await chatCompletion(systemPrompt, sourceSummaries);

  try {
    const parsed = JSON.parse(raw) as Array<{
      label: string;
      summary: string;
      sourceIndices: number[];
    }>;

    return parsed.map((group) => ({
      label: group.label,
      summary: group.summary,
      sources: (group.sourceIndices ?? [])
        .filter((i) => i >= 0 && i < sources.length)
        .map((i) => sources[i]),
    }));
  } catch {
    // Fallback: put all sources in a single viewpoint
    return [
      {
        label: "General coverage",
        summary: "All collected sources on this topic.",
        sources,
      },
    ];
  }
}

/**
 * Generate a spoken briefing and suggested follow-up questions.
 */
export async function generateTopicBriefing(
  topicTitle: string,
  topicSummary: string,
  viewpoints: Viewpoint[]
): Promise<{ spokenSummary: string; suggestedQuestions: string[] }> {
  const viewpointText = viewpoints
    .map((v) => {
      const sourceList = v.sources
        .map((s) => `  - "${s.title}" (${s.domain}): ${s.snippet.slice(0, 150)}`)
        .join("\n");
      return `**${v.label}**: ${v.summary}\nSources:\n${sourceList}`;
    })
    .join("\n\n");

  const systemPrompt = `You are a neutral voice news companion. Generate a spoken briefing for the topic below.

Return valid JSON with this shape:
{
  "spokenSummary": "A 4-6 sentence spoken summary. Use natural spoken language — no markdown, no bullet points. Distinguish confirmed facts from claims. Reference specific sources by name (e.g. 'according to Reuters', 'as reported by AP News'). End with a conversational question that invites the listener to share their perspective.",
  "suggestedQuestions": ["question 1", "question 2", "question 3"]
}

Rules:
- The summary must be neutral and factual.
- Cite sources by name — mention at least 2-3 outlets by name in the summary.
- Label certainty: use phrases like "confirmed by multiple sources", "reportedly", "according to [source name]".
- Present multiple viewpoints without taking sides.
- End the summary with a personal, conversational question that uses "you" language — e.g. "How do you think this might affect…?" or "What stands out to you about…?" Keep it focused on one specific angle, not a broad multi-part question.
- Suggested questions should encourage the user to think from different viewpoints and explore different sides of the story. Use "you" language. Examples: "If you were a [stakeholder], how would you see this?", "Some see this as X, others as Y — where do you land?"
- Return ONLY the JSON, no other text.`;

  const userPrompt = `Topic: ${topicTitle}
Summary: ${topicSummary}

Viewpoints:
${viewpointText}`;

  const raw = await chatCompletion(systemPrompt, userPrompt);

  try {
    const parsed = JSON.parse(raw) as {
      spokenSummary: string;
      suggestedQuestions: string[];
    };
    return {
      spokenSummary: parsed.spokenSummary ?? "",
      suggestedQuestions: parsed.suggestedQuestions ?? [],
    };
  } catch {
    // Fallback: return a basic summary
    return {
      spokenSummary: `Here is what we know about ${topicTitle}. ${topicSummary}`,
      suggestedQuestions: [
        `What are the different perspectives on ${topicTitle}?`,
        "What evidence supports the main claims?",
        "What is still uncertain or unconfirmed?",
      ],
    };
  }
}

/**
 * Get conversation context for the LLM — recent messages and a sources summary.
 */
export function getConversationContext(sessionId: string): {
  messages: Array<{ role: string; content: string }>;
  sourcesSummary: string;
} {
  const session = getSession(sessionId);
  if (!session) {
    return { messages: [], sourcesSummary: "" };
  }

  // Return the last 10 messages to keep context manageable
  const recentMessages = session.messages.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const sourcesSummary = session.sources
    .map((s) => `- "${s.title}" (${s.domain}): ${s.snippet.slice(0, 120)}`)
    .join("\n");

  return { messages: recentMessages, sourcesSummary };
}

/**
 * Save a conversation turn to session memory and increment the turn count.
 */
export function saveConversationTurn(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  sources?: Source[]
): void {
  const message: ConversationMessage = {
    role,
    content,
    sources,
    timestamp: new Date().toISOString(),
  };

  addMessage(sessionId, message);
  incrementTurnCount(sessionId);

  // If sources were cited, merge them into the session's source list
  if (sources && sources.length > 0) {
    addSources(sessionId, sources);
  }
}

/**
 * Perform a follow-up Tavily search, filter through the whitelist, and return results.
 */
export async function webSearchFollowup(query: string): Promise<Source[]> {
  const raw = await deepResearchSources(query);
  return filterAllowedSources(raw);
}

/**
 * Check all conversation limits for a session.
 */
export function checkConversationLimits(sessionId: string): LimitsStatus {
  const session = getSession(sessionId);
  if (!session) {
    return {
      turnsReached: true,
      toolCallsReached: true,
      searchesReached: true,
    };
  }

  return {
    turnsReached:
      session.turnCount >= VOICE_AGENT_CONFIG.maxConversationTurns,
    toolCallsReached: false, // tracked per-turn by the loop, not stored in session
    searchesReached:
      session.searchCount >= VOICE_AGENT_CONFIG.maxSearchesPerConversation,
  };
}

// ---------------------------------------------------------------------------
// Mapping utility
// ---------------------------------------------------------------------------

/**
 * Map a Source to a DashboardItem for the frontend.
 * Raw Tavily response fields are never exposed — only the curated subset.
 */
export function sourceToDashboardItem(source: Source): DashboardItem {
  return {
    url: source.url,
    title: source.title,
    domain: source.domain,
    sourceType: source.type,
    snippet: source.snippet,
    imageUrl: source.imageUrl,
  };
}

/**
 * Extract images for an array of sources using the Tavily Extract API.
 * Mutates the source objects in-place by setting `imageUrl` when an image is found.
 * Fails silently — sources without images simply remain without `imageUrl`.
 */
export async function extractSourceImages(sources: Source[]): Promise<void> {
  if (sources.length === 0) return;

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.error("TAVILY_API_KEY is not configured — skipping image extraction.");
    return;
  }

  const urls = sources.map((s) => s.url);

  try {
    const response = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        urls,
        include_images: true,
      }),
    });

    if (!response.ok) {
      console.error(`Tavily extract error: ${response.status}`);
      return;
    }

    const data = await response.json();
    const results: Array<{
      url: string;
      images?: string[];
    }> = data.results ?? [];

    // Build a lookup from URL → first image
    const imageByUrl = new Map<string, string>();
    for (const result of results) {
      if (result.images && result.images.length > 0) {
        imageByUrl.set(result.url, result.images[0]);
      }
    }

    // Assign images back to sources
    for (const source of sources) {
      const img = imageByUrl.get(source.url);
      if (img) {
        source.imageUrl = img;
      }
    }
  } catch (err) {
    console.error("Tavily extract failed:", err);
    // Non-fatal — sources just won't have images
  }
}
