import { NextResponse } from "next/server";
import { getSession } from "@/lib/voice-agent/memory";
import { handleFollowUp } from "@/lib/voice-agent/loop";

export const runtime = "nodejs";

/**
 * POST /api/voice-agent/message
 *
 * Handles a follow-up user message within an existing voice-agent session.
 * Validates the request, looks up the session, processes the turn through
 * the agent loop, and returns a MessageResponse.
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

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const { sessionId, message } = body as Record<string, unknown>;

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid required field: sessionId." },
      { status: 400 }
    );
  }

  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid required field: message." },
      { status: 400 }
    );
  }

  // Look up the session — return 404 if not found
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  try {
    const messageResponse = await handleFollowUp(sessionId, message);
    return NextResponse.json(messageResponse);
  } catch (err) {
    console.error("Voice agent message processing failed:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error processing message.";
    return NextResponse.json(
      { error: `Failed to process message: ${errorMessage}` },
      { status: 500 }
    );
  }
}
