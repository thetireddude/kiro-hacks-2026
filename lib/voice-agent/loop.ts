import { VOICE_AGENT_CONFIG } from "./config";
import {
  getSession,
  addSources,
  setViewpoints,
  addDashboardItems,
  incrementSearchCount,
} from "./memory";
import {
  deepResearchSources,
  filterAllowedSources,
  classifyViewpoints,
  generateTopicBriefing,
  getConversationContext,
  saveConversationTurn,
  webSearchFollowup,
  checkConversationLimits,
  sourceToDashboardItem,
  extractSourceImages,
} from "./tools";
import { buildSystemPrompt } from "./system-prompt";
import type {
  Topic,
  StartResponse,
  MessageResponse,
  SessionMetadata,
  Source,
  DashboardItem,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a SessionMetadata snapshot for the given session.
 * Returns zeroed metadata if the session is not found.
 */
function buildMetadata(sessionId: string): SessionMetadata {
  const session = getSession(sessionId);
  if (!session) {
    return {
      turnCount: 0,
      searchCount: 0,
      sourceCount: 0,
      maxTurns: VOICE_AGENT_CONFIG.maxConversationTurns,
    };
  }
  return {
    turnCount: session.turnCount,
    searchCount: session.searchCount,
    sourceCount: session.sources.length,
    maxTurns: VOICE_AGENT_CONFIG.maxConversationTurns,
  };
}

/**
 * Call the OpenAI Chat Completions API and return the assistant message content.
 * Shared helper used by the follow-up flow.
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

/**
 * Call the OpenAI Chat Completions API with a full message history.
 * Used for follow-up turns where conversation context matters.
 */
async function chatCompletionWithHistory(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>
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
          ...messages,
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
// Initial research loop
// ---------------------------------------------------------------------------

/**
 * Run the initial research loop for a new session.
 *
 * 1. Performs up to `maxResearchIterations` Tavily searches using the topic
 *    as seed context.
 * 2. Filters all results through the source whitelist.
 * 3. Classifies sources into viewpoint groups.
 * 4. Generates a spoken briefing with suggested questions.
 * 5. Persists everything to session memory.
 * 6. Returns a StartResponse for the API route.
 *
 * Graceful degradation: if fewer sources or viewpoints than targets are
 * collected, the loop proceeds with whatever it has rather than failing.
 */
export async function runInitialResearch(
  sessionId: string,
  topic: Topic
): Promise<StartResponse> {
  const {
    maxResearchIterations,
    targetSourceCount,
    minViewpointCount,
  } = VOICE_AGENT_CONFIG;

  const allFilteredSources: Source[] = [];
  const seenUrls = new Set<string>();

  // --- Research iterations ---------------------------------------------------
  for (let iteration = 0; iteration < maxResearchIterations; iteration++) {
    // Build a search query that varies per iteration to broaden coverage
    const query = buildSearchQuery(topic, iteration);

    let rawSources: Source[];
    try {
      rawSources = await deepResearchSources(query);
    } catch (err) {
      console.error(
        `Research iteration ${iteration} search failed:`,
        err
      );
      continue; // proceed with whatever we already have
    }

    incrementSearchCount(sessionId);

    const filtered = filterAllowedSources(rawSources);

    // Deduplicate against sources we already collected
    for (const source of filtered) {
      if (!seenUrls.has(source.url)) {
        seenUrls.add(source.url);
        allFilteredSources.push(source);
      }
    }

    // Stop early if we've met the target source count
    if (allFilteredSources.length >= targetSourceCount) {
      break;
    }
  }

  // --- Handle case where all sources were filtered out ----------------------
  if (allFilteredSources.length === 0) {
    // Save empty state and return a response indicating no approved sources
    addSources(sessionId, []);
    setViewpoints(sessionId, []);

    const noSourcesSummary =
      `I researched "${topic.title}" but could not find any sources from approved outlets. ` +
      `This may mean the topic is very new or not yet covered by major news organizations. ` +
      `You might want to check back later or try exploring a related angle.`;

    saveConversationTurn(sessionId, "assistant", noSourcesSummary);

    return {
      sessionId,
      spokenSummary: noSourcesSummary,
      suggestedQuestions: [
        `What specific aspect of ${topic.title} are you most curious about?`,
        "Would you like me to try searching for a related topic?",
      ],
      dashboardItems: [],
      metadata: buildMetadata(sessionId),
    };
  }

  // --- Persist sources to memory --------------------------------------------
  addSources(sessionId, allFilteredSources);

  // --- Extract images for sources (best-effort, non-blocking) ---------------
  await extractSourceImages(allFilteredSources);

  // --- Classify viewpoints --------------------------------------------------
  const viewpoints = await classifyViewpoints(allFilteredSources);

  // Graceful degradation: if classification returned fewer than the minimum,
  // we still proceed with what we have.
  if (viewpoints.length < minViewpointCount) {
    console.warn(
      `Only ${viewpoints.length} viewpoint(s) classified (target: ${minViewpointCount}). Proceeding with available viewpoints.`
    );
  }

  setViewpoints(sessionId, viewpoints);

  // --- Generate briefing ----------------------------------------------------
  const { spokenSummary, suggestedQuestions } =
    await generateTopicBriefing(topic.title, topic.summary, viewpoints);

  // --- Build dashboard items ------------------------------------------------
  const dashboardItems: DashboardItem[] =
    allFilteredSources.map(sourceToDashboardItem);

  addDashboardItems(sessionId, dashboardItems);

  // --- Save the briefing as the first assistant message ---------------------
  saveConversationTurn(
    sessionId,
    "assistant",
    spokenSummary,
    allFilteredSources
  );

  return {
    sessionId,
    spokenSummary,
    suggestedQuestions,
    dashboardItems,
    metadata: buildMetadata(sessionId),
  };
}

// ---------------------------------------------------------------------------
// Follow-up handler
// ---------------------------------------------------------------------------

/**
 * Handle a follow-up user message within an existing session.
 *
 * 1. Checks conversation limits — if reached, returns a wrap-up.
 * 2. Saves the user message to memory.
 * 3. Determines whether a new search is needed.
 * 4. If needed, performs a Tavily search, filters, and merges into memory.
 * 5. Generates a neutral response using conversation context.
 * 6. Saves the assistant response to memory.
 * 7. Returns a MessageResponse.
 */
export async function handleFollowUp(
  sessionId: string,
  userMessage: string
): Promise<MessageResponse> {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  // --- Check limits ---------------------------------------------------------
  const limits = checkConversationLimits(sessionId);

  if (limits.turnsReached) {
    const wrapUp = await generateWrapUp(sessionId);
    return {
      reply: wrapUp,
      dashboardItems: [],
      metadata: buildMetadata(sessionId),
      limitReached: true,
    };
  }

  // --- Save user message ----------------------------------------------------
  saveConversationTurn(sessionId, "user", userMessage);

  // --- Determine if a new search is needed ----------------------------------
  const needsSearch = shouldPerformSearch(userMessage, session.sources);
  let newDashboardItems: DashboardItem[] = [];
  let newSources: Source[] = [];

  if (needsSearch && !limits.searchesReached) {
    try {
      newSources = await webSearchFollowup(userMessage);
      incrementSearchCount(sessionId);

      if (newSources.length > 0) {
        // Extract images for the new sources (best-effort)
        await extractSourceImages(newSources);

        addSources(sessionId, newSources);
        newDashboardItems = newSources.map(sourceToDashboardItem);
        addDashboardItems(sessionId, newDashboardItems);
      }
    } catch (err) {
      console.error("Follow-up search failed:", err);
      // Continue without new sources — answer from existing context
    }
  }

  // --- Generate response ----------------------------------------------------
  const reply = await generateFollowUpResponse(
    sessionId,
    userMessage,
    newSources
  );

  // --- Save assistant response ----------------------------------------------
  saveConversationTurn(
    sessionId,
    "assistant",
    reply,
    newSources.length > 0 ? newSources : undefined
  );

  // --- Check if we've now hit the turn limit after this exchange ------------
  const postLimits = checkConversationLimits(sessionId);

  return {
    reply,
    dashboardItems: newDashboardItems,
    metadata: buildMetadata(sessionId),
    limitReached: postLimits.turnsReached,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a search query for a given research iteration.
 * Iteration 0 uses the title directly, subsequent iterations vary the angle.
 */
function buildSearchQuery(topic: Topic, iteration: number): string {
  switch (iteration) {
    case 0:
      return topic.title;
    case 1:
      return `${topic.title} analysis opinions reactions`;
    case 2:
      return `${topic.title} latest developments updates`;
    default:
      return `${topic.title} ${topic.category} news`;
  }
}

/**
 * Heuristic: determine whether the user's follow-up question likely needs
 * a new web search or can be answered from existing session context.
 *
 * Triggers a search when the message contains question-like patterns or
 * references topics not well-covered by existing sources.
 */
function shouldPerformSearch(
  userMessage: string,
  existingSources: Source[]
): boolean {
  const msg = userMessage.toLowerCase();

  // Explicit search triggers
  const searchTriggers = [
    "search for",
    "look up",
    "find out",
    "what about",
    "any news on",
    "latest on",
    "update on",
    "tell me about",
    "what happened with",
    "is there",
    "are there",
    "have there been",
  ];

  if (searchTriggers.some((trigger) => msg.includes(trigger))) {
    return true;
  }

  // If the user's message mentions something not covered by existing source
  // titles or snippets, a search may help. Simple keyword overlap check.
  const words = msg
    .split(/\s+/)
    .filter((w) => w.length > 4); // skip short common words

  if (words.length === 0) return false;

  const sourceText = existingSources
    .map((s) => `${s.title} ${s.snippet}`)
    .join(" ")
    .toLowerCase();

  const coveredWords = words.filter((w) => sourceText.includes(w));
  const coverageRatio =
    words.length > 0 ? coveredWords.length / words.length : 1;

  // If less than half the significant words appear in existing sources,
  // the user is likely asking about something new.
  return coverageRatio < 0.5;
}

/**
 * Generate a follow-up response using the conversation history and
 * available sources as context.
 */
async function generateFollowUpResponse(
  sessionId: string,
  userMessage: string,
  newSources: Source[]
): Promise<string> {
  const session = getSession(sessionId);
  if (!session) {
    return "I'm sorry, I seem to have lost our conversation context. Could you try again?";
  }

  const systemPrompt = buildSystemPrompt(session.topic);
  const { messages, sourcesSummary } = getConversationContext(sessionId);

  // Build a context block with source information
  let contextBlock = "";
  if (sourcesSummary) {
    contextBlock += `\n\nAvailable sources:\n${sourcesSummary}`;
  }
  if (newSources.length > 0) {
    const newSourceText = newSources
      .map((s) => `- [NEW] "${s.title}" (${s.domain}): ${s.snippet.slice(0, 150)}`)
      .join("\n");
    contextBlock += `\n\nNewly found sources:\n${newSourceText}`;
  }

  // Reinforce: always end with a thought-provoking question
  contextBlock += `\n\n[Reminder: After answering, always end with a thought-provoking question that invites the listener to consider a different perspective or stakeholder viewpoint. Use personal "you" language.]`;

  // Append context to the last user message
  const enrichedMessages = [
    ...messages.slice(0, -1), // all messages except the last user message
    {
      role: "user",
      content: `${userMessage}${contextBlock}`,
    },
  ];

  // If there are no prior messages (edge case), just use the user message
  const finalMessages =
    enrichedMessages.length > 0
      ? enrichedMessages
      : [{ role: "user", content: `${userMessage}${contextBlock}` }];

  return chatCompletionWithHistory(systemPrompt, finalMessages);
}

/**
 * Generate a wrap-up summary when conversation limits are reached.
 */
async function generateWrapUp(sessionId: string): Promise<string> {
  const session = getSession(sessionId);
  if (!session) {
    return "We've reached the end of our conversation. Head back to the feed to explore more topics.";
  }

  const systemPrompt = `You are a neutral voice news companion. The conversation about "${session.topic.title}" has reached its turn limit. Generate a brief, warm wrap-up that:
1. Summarizes the key points discussed (2-3 sentences).
2. Reminds the listener of any open questions or unresolved aspects.
3. Encourages them to return to the feed to explore other topics.

Keep it concise and natural for spoken delivery. Do not use markdown or bullet points.`;

  const conversationSummary = session.messages
    .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
    .join("\n");

  try {
    return await chatCompletion(
      systemPrompt,
      `Conversation so far:\n${conversationSummary}`
    );
  } catch {
    // Fallback if LLM call fails
    return (
      `We've covered a lot of ground on ${session.topic.title}. ` +
      `We've reached our conversation limit, but you can always come back to this topic later. ` +
      `Head back to the feed to explore what else is happening.`
    );
  }
}
