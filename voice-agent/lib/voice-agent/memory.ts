import { randomUUID } from "crypto";
import type {
  VoiceAgentSession,
  Topic,
  ConversationMessage,
  Source,
  Viewpoint,
  DashboardItem,
} from "./types";

/** In-memory session store keyed by sessionId */
const sessions = new Map<string, VoiceAgentSession>();

/** Create a new session seeded with the given topic. Returns the sessionId. */
export function createSession(topic: Topic): string {
  const sessionId = randomUUID();
  const now = new Date().toISOString();

  const session: VoiceAgentSession = {
    sessionId,
    topic,
    messages: [],
    sources: [],
    viewpoints: [],
    dashboardItems: [],
    turnCount: 0,
    searchCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  sessions.set(sessionId, session);
  return sessionId;
}

/** Retrieve a session by ID, or undefined if not found. */
export function getSession(
  sessionId: string
): VoiceAgentSession | undefined {
  return sessions.get(sessionId);
}

/** Append a conversation message to the session. */
export function addMessage(
  sessionId: string,
  message: ConversationMessage
): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.messages.push(message);
  session.updatedAt = new Date().toISOString();
}

/** Merge new sources into the session, deduplicating by URL. */
export function addSources(sessionId: string, sources: Source[]): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  const existingUrls = new Set(session.sources.map((s) => s.url));
  for (const source of sources) {
    if (!existingUrls.has(source.url)) {
      session.sources.push(source);
      existingUrls.add(source.url);
    }
  }

  session.updatedAt = new Date().toISOString();
}

/** Replace the session's classified viewpoints. */
export function setViewpoints(
  sessionId: string,
  viewpoints: Viewpoint[]
): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.viewpoints = viewpoints;
  session.updatedAt = new Date().toISOString();
}

/** Append dashboard items to the session. */
export function addDashboardItems(
  sessionId: string,
  items: DashboardItem[]
): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.dashboardItems.push(...items);
  session.updatedAt = new Date().toISOString();
}

/** Increment the turn count and return the new value. */
export function incrementTurnCount(sessionId: string): number {
  const session = sessions.get(sessionId);
  if (!session) return -1;

  session.turnCount += 1;
  session.updatedAt = new Date().toISOString();
  return session.turnCount;
}

/** Increment the search count and return the new value. */
export function incrementSearchCount(sessionId: string): number {
  const session = sessions.get(sessionId);
  if (!session) return -1;

  session.searchCount += 1;
  session.updatedAt = new Date().toISOString();
  return session.searchCount;
}

/** Delete a session. No-op if the session doesn't exist. */
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Exposed only for testing — clears all sessions.
 * @internal
 */
export function _clearAllSessions(): void {
  sessions.clear();
}
