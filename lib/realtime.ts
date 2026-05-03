export type ConversationState =
  | "idle"
  | "connecting"
  | "listening"
  | "user_speaking"
  | "assistant_speaking"
  | "error";

export interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
  id: string;
  final: boolean;
}

/**
 * Fetch an ephemeral session token from our backend API route.
 * Optionally pass topicContext to configure the Realtime API with topic-aware instructions.
 */
export async function fetchSessionToken(topicContext?: string): Promise<{
  client_secret: { value: string };
}> {
  const res = await fetch("/api/realtime-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(topicContext ? { topicContext } : {}),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Session request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Create a WebRTC peer connection to the OpenAI Realtime API.
 * Returns the peer connection and the data channel for events.
 *
 * The onTrack callback is registered BEFORE setRemoteDescription so the
 * caller never misses the initial track event.
 */
export async function connectRealtime(
  ephemeralToken: string,
  onTrack: (event: RTCTrackEvent) => void
): Promise<{
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
}> {
  const pc = new RTCPeerConnection();

  // Register ontrack EARLY — before setRemoteDescription which can fire it.
  pc.ontrack = onTrack;

  // Create a data channel for Realtime API events
  const dc = pc.createDataChannel("oai-events");

  // Get user microphone
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  // Create and set local offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Send offer to OpenAI Realtime API
  const sdpResponse = await fetch(
    "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ephemeralToken}`,
        "Content-Type": "application/sdp",
      },
      body: offer.sdp,
    }
  );

  if (!sdpResponse.ok) {
    pc.close();
    throw new Error(`WebRTC SDP exchange failed: ${sdpResponse.status}`);
  }

  const answerSdp = await sdpResponse.text();
  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

  return { pc, dc };
}

/**
 * Cleanly disconnect: close data channel, stop all tracks, close peer connection.
 */
export function disconnect(pc: RTCPeerConnection | null) {
  if (!pc) return;
  // Stop all local media tracks
  pc.getSenders().forEach((sender) => {
    sender.track?.stop();
  });
  pc.close();
}
