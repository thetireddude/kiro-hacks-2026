import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  // Accept optional topic context for the voice-agent topic page
  let topicInstructions = "";
  try {
    const body = await request.json();
    if (body?.topicContext) {
      topicInstructions = body.topicContext;
    }
  } catch {
    // No body or invalid JSON — use default instructions
  }

  const defaultInstructions = [
    "You are a friendly, concise conversational assistant.",
    "Keep your responses short and natural, like a real conversation.",
    "You do not have access to live news, files, tools, or the internet.",
    "If asked about those, politely let the user know.",
    "Be warm, helpful, and to the point.",
  ].join(" ");

  const instructions = topicInstructions || defaultInstructions;

  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "verse",
          instructions,
          input_audio_transcription: {
            model: "whisper-1",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 700,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI session error:", response.status, errorBody);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to create realtime session:", err);
    return NextResponse.json(
      { error: "Failed to create realtime session." },
      { status: 500 }
    );
  }
}
