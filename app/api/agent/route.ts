import { runAgentLoop } from '@/lib/agent/loop'
import type { AgentErrorResponse } from '@/lib/types'

export async function POST(request: Request): Promise<Response> {
  try {
    // Parse optional topicCount from request body (Req 11.2)
    let topicCount: number | undefined
    try {
      const body = (await request.json()) as { topicCount?: unknown }
      if (
        body.topicCount !== undefined &&
        typeof body.topicCount === 'number' &&
        Number.isFinite(body.topicCount) &&
        body.topicCount > 0
      ) {
        topicCount = Math.floor(body.topicCount)
      }
    } catch {
      // Empty body or invalid JSON is fine — use defaults
    }

    // Run the agent loop with optional config override (Req 11.3)
    const result = await runAgentLoop(
      topicCount ? { targetTopicCount: topicCount } : undefined
    )

    // Check if the result is an error response (Req 11.4–11.5)
    if ('error' in result) {
      return Response.json(result, { status: 500 })
    }

    // Success (Req 11.6)
    return Response.json(result, { status: 200 })
  } catch (error) {
    // Top-level catch for unexpected errors (Req 11.4)
    console.error(
      '[API] Unexpected error in /api/agent:',
      error instanceof Error ? error.message : error
    )

    const errorResponse: AgentErrorResponse = {
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      code: 'UNKNOWN',
    }

    return Response.json(errorResponse, { status: 500 })
  }
}
