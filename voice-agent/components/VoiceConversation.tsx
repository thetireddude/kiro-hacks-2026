"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type ConversationState,
  type TranscriptEntry,
  fetchSessionToken,
  connectRealtime,
  disconnect,
} from "@/lib/realtime";

const STATUS_CONFIG: Record<
  ConversationState,
  { label: string; color: string; pulse: boolean }
> = {
  idle: { label: "Ready", color: "bg-muted text-muted-foreground", pulse: false },
  connecting: { label: "Connecting…", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", pulse: true },
  listening: { label: "Listening", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", pulse: true },
  user_speaking: { label: "You're speaking", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", pulse: true },
  assistant_speaking: { label: "Assistant is speaking", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", pulse: true },
  error: { label: "Error", color: "bg-destructive/10 text-destructive", pulse: false },
};

export default function VoiceConversation() {
  const [state, setState] = useState<ConversationState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const hasPlayedRef = useRef(false);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Track the item_id for the current user speech so we can reserve a
  // placeholder in the transcript before the assistant starts responding.
  const pendingUserItemRef = useRef<string | null>(null);

  const handleServerEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "input_audio_buffer.speech_started":
            setState("user_speaking");
            break;

          case "input_audio_buffer.speech_stopped":
            setState("listening");
            break;

          // Fired when a new user-audio conversation item is created.
          // This arrives *before* the transcription completes and before
          // the assistant starts responding, so we insert a placeholder
          // to hold the correct position in the transcript.
          case "conversation.item.created": {
            const item = data.item;
            if (item?.type === "message" && item?.role === "user") {
              const userId = `user-${item.id}`;
              pendingUserItemRef.current = item.id;
              setTranscript((prev) => {
                // Don't add a duplicate if it already exists
                if (prev.some((e) => e.id === userId)) return prev;
                return [
                  ...prev,
                  {
                    role: "user",
                    text: "…",
                    id: userId,
                    final: false,
                  },
                ];
              });
            }
            break;
          }

          // Whisper transcription finished — replace the placeholder text.
          case "conversation.item.input_audio_transcription.completed": {
            const userId = `user-${data.item_id || ""}`;
            const text = data.transcript?.trim();
            if (!text) {
              // Empty transcription — remove the placeholder
              setTranscript((prev) => prev.filter((e) => e.id !== userId));
              break;
            }
            setTranscript((prev) => {
              const idx = prev.findIndex((e) => e.id === userId);
              if (idx !== -1) {
                // Replace placeholder in-place so ordering is preserved
                const updated = [...prev];
                updated[idx] = { ...updated[idx], text, final: true };
                return updated;
              }
              // Fallback: no placeholder found, append at end
              return [
                ...prev,
                { role: "user", text, id: userId, final: true },
              ];
            });
            break;
          }

          case "response.audio_transcript.delta": {
            const responseId = `assistant-${data.response_id || data.item_id || crypto.randomUUID()}`;
            setTranscript((prev) => {
              const lastIdx = prev.findLastIndex(
                (e) => e.role === "assistant" && e.id === responseId
              );
              if (lastIdx !== -1 && !prev[lastIdx].final) {
                const updated = [...prev];
                updated[lastIdx] = {
                  ...updated[lastIdx],
                  text: updated[lastIdx].text + (data.delta || ""),
                };
                return updated;
              }
              return [
                ...prev,
                {
                  role: "assistant",
                  text: data.delta || "",
                  id: responseId,
                  final: false,
                },
              ];
            });
            setState("assistant_speaking");
            break;
          }

          case "response.audio_transcript.done": {
            const doneResponseId = `assistant-${data.response_id || data.item_id || crypto.randomUUID()}`;
            setTranscript((prev) => {
              const lastIdx = prev.findLastIndex(
                (e) => e.role === "assistant" && e.id === doneResponseId
              );
              if (lastIdx !== -1 && !prev[lastIdx].final) {
                const updated = [...prev];
                updated[lastIdx] = { ...updated[lastIdx], final: true };
                return updated;
              }
              return prev;
            });
            break;
          }

          case "response.done":
            setState("listening");
            break;

          case "error":
            console.error("Realtime API error:", data.error);
            setErrorMsg(data.error?.message || "An error occurred.");
            setState("error");
            break;
        }
      } catch {
        // Ignore non-JSON messages
      }
    },
    []
  );

  const endConversation = useCallback(() => {
    disconnect(pcRef.current);
    pcRef.current = null;
    dcRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }

    setState("idle");
  }, []);

  const startConversation = useCallback(async () => {
    setErrorMsg(null);
    setState("connecting");
    setTranscript([]);

    try {
      // 1. Get ephemeral token from our backend
      const session = await fetchSessionToken();
      const token = session.client_secret.value;

      // 2. Connect via WebRTC — pass ontrack handler so it's registered
      //    BEFORE setRemoteDescription (which can fire the track event).
      hasPlayedRef.current = false;

      const { pc, dc } = await connectRealtime(token, (event) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.srcObject = event.streams[0];
        if (!hasPlayedRef.current) {
          audio.play().catch(() => {
            // Autoplay blocked — will resolve on next user interaction
          });
          hasPlayedRef.current = true;
        }
      });
      pcRef.current = pc;
      dcRef.current = dc;

      // 3. Listen for data channel events
      dc.onopen = () => {
        setState("listening");
      };

      dc.onmessage = handleServerEvent;

      dc.onclose = () => {
        setState("idle");
      };

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "disconnected"
        ) {
          setErrorMsg("Connection lost. Please try again.");
          setState("error");
          endConversation();
        }
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start conversation.";

      if (message.includes("Permission denied") || message.includes("NotAllowedError")) {
        setErrorMsg("Microphone access denied. Please allow microphone permission and try again.");
      } else {
        setErrorMsg(message);
      }

      setState("error");
      disconnect(pcRef.current);
      pcRef.current = null;
      dcRef.current = null;
    }
  }, [handleServerEvent, endConversation]);

  const isActive = state !== "idle" && state !== "error";
  const statusCfg = STATUS_CONFIG[state];

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      {/* Status indicator */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex items-center justify-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
              isActive
                ? "bg-primary/10"
                : state === "error"
                ? "bg-destructive/10"
                : "bg-muted"
            }`}
          >
            {state === "idle" && (
              <MicIcon className="w-8 h-8 text-muted-foreground" />
            )}
            {state === "connecting" && (
              <LoadingIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400 animate-spin" />
            )}
            {state === "listening" && (
              <MicIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            )}
            {state === "user_speaking" && (
              <WaveIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            )}
            {state === "assistant_speaking" && (
              <SpeakerIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            )}
            {state === "error" && (
              <ErrorIcon className="w-8 h-8 text-destructive" />
            )}
          </div>
          {statusCfg.pulse && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary" />
          )}
        </div>

        <Badge variant="secondary" className={statusCfg.color}>
          {statusCfg.label}
        </Badge>
      </div>

      {/* Main action button */}
      <Button
        size="lg"
        variant={isActive ? "destructive" : "default"}
        className="h-12 px-8 text-base"
        onClick={isActive ? endConversation : startConversation}
        disabled={state === "connecting"}
      >
        {state === "connecting"
          ? "Connecting…"
          : isActive
          ? "End Conversation"
          : "Start Conversation"}
      </Button>

      {/* Error message */}
      {errorMsg && (
        <p className="text-sm text-destructive text-center max-w-md">
          {errorMsg}
        </p>
      )}

      {/* Transcript */}
      <Card className="w-full">
        <CardContent className="p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Transcript
          </h2>
          <div className="h-72 overflow-y-auto space-y-3 pr-1">
            {transcript.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {isActive
                  ? "Start speaking — your conversation will appear here."
                  : "Click \"Start Conversation\" to begin."}
              </p>
            ) : (
              transcript.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex ${
                    entry.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      entry.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-xs font-medium opacity-70 mb-0.5">
                      {entry.role === "user" ? "You" : "Assistant"}
                    </p>
                    <p>{entry.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Hidden audio element for assistant voice playback */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
    </div>
  );
}

/* ---- Inline SVG icons ---- */

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h2l3-7 4 14 4-14 3 7h2" />
    </svg>
  );
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function LoadingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
