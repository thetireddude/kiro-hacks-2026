/** Topic object passed from the headline-feed agent via sessionStorage */
export interface Topic {
  id: string;
  title: string;
  summary: string;
  category: string;
  trending: boolean;
  fetchedAt: string;
}

/** A single source discovered by Tavily */
export interface Source {
  url: string;
  title: string;
  domain: string;
  type: "news" | "opinion" | "social" | "video" | "image";
  snippet: string;
  publishedAt?: string;
  /** Primary image URL extracted from the source page via Tavily Extract */
  imageUrl?: string;
}

/** A classified viewpoint group */
export interface Viewpoint {
  label: string;
  summary: string;
  sources: Source[];
}

/** A dashboard item for the frontend */
export interface DashboardItem {
  url: string;
  title: string;
  domain: string;
  sourceType: "news" | "opinion" | "social" | "video" | "image";
  snippet: string;
  /** Primary image URL for the source, if available */
  imageUrl?: string;
}

/** A single conversation message */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: string;
}

/** Full session state stored in memory */
export interface VoiceAgentSession {
  sessionId: string;
  topic: Topic;
  messages: ConversationMessage[];
  sources: Source[];
  viewpoints: Viewpoint[];
  dashboardItems: DashboardItem[];
  turnCount: number;
  searchCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Response from the start route */
export interface StartResponse {
  sessionId: string;
  spokenSummary: string;
  suggestedQuestions: string[];
  dashboardItems: DashboardItem[];
  metadata: SessionMetadata;
}

/** Response from the message route */
export interface MessageResponse {
  reply: string;
  dashboardItems: DashboardItem[];
  metadata: SessionMetadata;
  limitReached: boolean;
}

/** Session metadata returned in API responses */
export interface SessionMetadata {
  turnCount: number;
  searchCount: number;
  sourceCount: number;
  maxTurns: number;
}

/** Limits check result */
export interface LimitsStatus {
  turnsReached: boolean;
  toolCallsReached: boolean;
  searchesReached: boolean;
}
