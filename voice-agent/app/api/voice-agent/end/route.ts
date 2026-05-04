import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/voice-agent/memory";

export const runtime = "nodejs";

/**
 * POST /api/voice-agent/end
 *
 * Terminates a voice-agent session by clearing all associated memory.
 * Idempotent — returns success even for unknown or already-cleared sessions.
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

  const { sessionId } = body as Record<string, unknown>;

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid required field: sessionId." },
      { status: 400 }
    );
  }

  // deleteSession is a no-op for unknown/already-cleared sessions
  deleteSession(sessionId);

  return NextResponse.json({ success: true });
}
