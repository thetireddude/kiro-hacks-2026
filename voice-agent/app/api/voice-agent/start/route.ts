import { NextResponse } from "next/server";
import { createSession } from "@/lib/voice-agent/memory";
import { runInitialResearch } from "@/lib/voice-agent/loop";
import type { Topic } from "@/lib/voice-agent/types";

export const runtime = "nodejs";

/**
 * Validate that the request body contains a valid Topic object with all
 * required fields present and of the correct type.
 */
function validateTopic(
  body: unknown
): { valid: true; topic: Topic } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const obj = body as Record<string, unknown>;

  // The topic may be nested under a "topic" key or provided at the top level
  const candidate = (
    obj.topic && typeof obj.topic === "object" ? obj.topic : obj
  ) as Record<string, unknown>;

  const requiredStringFields = ["id", "title", "summary", "category"] as const;
  const missing: string[] = [];
  const wrongType: string[] = [];

  for (const field of requiredStringFields) {
    if (candidate[field] === undefined || candidate[field] === null) {
      missing.push(field);
    } else if (typeof candidate[field] !== "string") {
      wrongType.push(field);
    } else if ((candidate[field] as string).trim() === "") {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required topic fields: ${missing.join(", ")}.`,
    };
  }

  if (wrongType.length > 0) {
    return {
      valid: false,
      error: `Invalid type for topic fields (expected string): ${wrongType.join(", ")}.`,
    };
  }

  const topic: Topic = {
    id: candidate.id as string,
    title: candidate.title as string,
    summary: candidate.summary as string,
    category: candidate.category as string,
    trending: typeof candidate.trending === "boolean" ? candidate.trending : false,
    fetchedAt:
      typeof candidate.fetchedAt === "string"
        ? candidate.fetchedAt
        : new Date().toISOString(),
  };

  return { valid: true, topic };
}

/**
 * POST /api/voice-agent/start
 *
 * Creates a new voice-agent session, runs the initial research loop, and
 * returns a StartResponse with the briefing, suggested questions, dashboard
 * items, and session metadata.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  const validation = validateTopic(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const { topic } = validation;

  try {
    const sessionId = createSession(topic);
    const startResponse = await runInitialResearch(sessionId, topic);
    return NextResponse.json(startResponse);
  } catch (err) {
    console.error("Voice agent start failed:", err);
    const message =
      err instanceof Error ? err.message : "Unknown error during research.";
    return NextResponse.json(
      { error: `Failed to start voice agent session: ${message}` },
      { status: 500 }
    );
  }
}
