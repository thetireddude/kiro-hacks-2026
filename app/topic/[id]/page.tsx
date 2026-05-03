"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type ConversationState,
  fetchSessionToken,
  connectRealtime,
  disconnect,
} from "@/lib/realtime";
import type {
  Topic,
  StartResponse,
  MessageResponse,
  DashboardItem,
} from "@/lib/voice-agent/types";
import { DashboardPanel } from "@/components/voice/DashboardPanel";
import {
  ArrowLeft,
  Mic,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentPhase =
  | "loading_topic"
  | "researching"
  | "briefing_ready"
  | "conversing"
  | "limit_reached"
  | "error";

interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  final: boolean;
}

// ---------------------------------------------------------------------------
// Status config for the voice indicator
// ---------------------------------------------------------------------------

const VOICE_STATUS: Record<
  ConversationState,
  { label: string; color: string; pulse: boolean }
> = {
  idle: { label: "Ready", color: "bg-muted text-muted-foreground", pulse: false },
  connecting: {
    label: "Connecting…",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    pulse: true,
  },
  listening: {
    label: "Listening",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    pulse: true,
  },
  user_speaking: {
    label: "You're speaking",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    pulse: true,
  },
  assistant_speaking: {
    label: "Agent speaking",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    pulse: true,
  },
  error: { label: "Error", color: "bg-destructive/10 text-destructive", pulse: false },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // --- State ---------------------------------------------------------------
  const [topic, setTopic] = useState<Topic | null>(null);
  const [phase, setPhase] = useState<AgentPhase>("loading_topic");
  const [voiceState, setVoiceState] = useState<ConversationState>("idle");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [_suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // --- Refs ----------------------------------------------------------------
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const hasPlayedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const pendingUserItemRef = useRef<string | null>(null);
  const briefingTextRef = useRef<string>("");

  // Keep sessionIdRef in sync for use in callbacks
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // --- Cleanup on unmount or tab close -------------------------------------
  useEffect(() => {
    const cleanup = () => {
      // Stop WebRTC connection and microphone
      disconnect(pcRef.current);
      pcRef.current = null;
      dcRef.current = null;

      // Stop any audio playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }

      // Best-effort session cleanup on the server
      const sid = sessionIdRef.current;
      if (sid) {
        navigator.sendBeacon(
          "/api/voice-agent/end",
          new Blob([JSON.stringify({ sessionId: sid })], {
            type: "application/json",
          })
        );
      }
    };

    // Only clear sessionStorage when the tab/window is actually closing,
    // NOT on component unmount (React Strict Mode double-mounts would
    // wipe the entry before the load effect can read it).
    const handleBeforeUnload = () => {
      cleanup();
      try {
        sessionStorage.removeItem(`topic-${id}`);
      } catch {
        // ignore
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // On unmount, clean up WebRTC/audio but preserve sessionStorage
      // so Strict Mode remounts can still read the topic.
      disconnect(pcRef.current);
      pcRef.current = null;
      dcRef.current = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    };
  }, [id]);

  // --- Load topic from sessionStorage on mount -----------------------------
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(`topic-${id}`);
    } catch {
      // sessionStorage may be unavailable
    }

    // If found in sessionStorage, use it
    if (stored) {
      try {
        const parsed: Topic = JSON.parse(stored);
        queueMicrotask(() => {
          setTopic(parsed);
          setPhase("researching");
        });
        return;
      } catch {
        // fall through to mock
      }
    }

    // DEV fallback: use a mock topic so the agent can be tested without
    // the headline-feed agent wiring the sessionStorage handoff.
    const mock: Topic = {
      id,
      title: "United Arab Emirates announces exit from OPEC",
      summary:
        "The United Arab Emirates has announced its decision to leave OPEC, causing significant reactions in the oil markets and raising questions about future oil production strategies.",
      category: "Business",
      trending: true,
      fetchedAt: new Date().toISOString(),
    };

    queueMicrotask(() => {
      setTopic(mock);
      setPhase("researching");
    });
  }, [id]);

  // --- Start voice agent research when topic is loaded ---------------------
  useEffect(() => {
    if (phase !== "researching" || !topic) return;

    let cancelled = false;

    async function startAgent(): Promise<void> {
      try {
        const res = await fetch("/api/voice-agent/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
        });

        if (cancelled) return;

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `Agent start failed with status ${res.status}`
          );
        }

        const data: StartResponse = await res.json();

        if (cancelled) return;

        setSessionId(data.sessionId);
        setSuggestedQuestions(data.suggestedQuestions);
        setDashboardItems(data.dashboardItems ?? []);

        // Store the briefing for the voice agent to speak — don't add to
        // transcript yet; the Realtime API will stream it as it speaks.
        briefingTextRef.current = data.spokenSummary;

        setPhase("briefing_ready");
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to start voice agent.";
        setErrorMsg(message);
        setPhase("error");
      }
    }

    startAgent();

    return () => {
      cancelled = true;
    };
  }, [phase, topic]);

  // --- Send follow-up message to the voice agent ---------------------------
  // NOTE: sendFollowUp is available for programmatic follow-ups (e.g. from
  // suggested-question buttons). Voice follow-ups go through the WebRTC
  // data-channel handler instead.
  const _sendFollowUp = useCallback(
    async (userMessage: string): Promise<void> => {
      const sid = sessionIdRef.current;
      if (!sid || !userMessage.trim()) return;

      try {
        const res = await fetch("/api/voice-agent/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid, message: userMessage }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error("Follow-up failed:", body.error);
          return;
        }

        const data: MessageResponse = await res.json();

        // Merge any new dashboard items
        if (data.dashboardItems?.length) {
          setDashboardItems((prev) => {
            const existingUrls = new Set(prev.map((d) => d.url));
            const newItems = data.dashboardItems.filter(
              (d) => !existingUrls.has(d.url)
            );
            return newItems.length > 0 ? [...prev, ...newItems] : prev;
          });
        }

        // Add assistant reply to transcript
        setTranscript((prev) => [
          ...prev,
          {
            id: `agent-reply-${Date.now()}`,
            role: "assistant",
            text: data.reply,
            final: true,
          },
        ]);

        if (data.limitReached) {
          setPhase("limit_reached");

          // Stop WebRTC — close data channel and disconnect
          if (dcRef.current) {
            dcRef.current.onmessage = null;
            dcRef.current.close();
            dcRef.current = null;
          }
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.srcObject = null;
          }
          disconnect(pcRef.current);
          pcRef.current = null;
          setVoiceState("idle");
        }
      } catch (err) {
        console.error("Follow-up error:", err);
      }
    },
    []
  );

  // --- Handle WebRTC server events -----------------------------------------
  const handleServerEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "input_audio_buffer.speech_started":
            setVoiceState("user_speaking");
            break;

          case "input_audio_buffer.speech_stopped":
            setVoiceState("listening");
            break;

          case "conversation.item.created": {
            const item = data.item;
            if (item?.type === "message" && item?.role === "user") {
              const userId = `user-${item.id}`;
              pendingUserItemRef.current = item.id;
              setTranscript((prev) => {
                if (prev.some((e) => e.id === userId)) return prev;
                return [
                  ...prev,
                  { role: "user", text: "…", id: userId, final: false },
                ];
              });
            }
            break;
          }

          case "conversation.item.input_audio_transcription.completed": {
            const userId = `user-${data.item_id || ""}`;
            const text = data.transcript?.trim();
            if (!text) {
              setTranscript((prev) => prev.filter((e) => e.id !== userId));
              break;
            }
            setTranscript((prev) => {
              const idx = prev.findIndex((e) => e.id === userId);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], text, final: true };
                return updated;
              }
              return [
                ...prev,
                { role: "user", text, id: userId, final: true },
              ];
            });

            // Track the user message server-side for conversation limits
            // but don't display the server response — the Realtime API
            // voice model handles the spoken reply.
            const sid = sessionIdRef.current;
            if (sid && text) {
              fetch("/api/voice-agent/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: sid, message: text }),
              })
                .then((res) => res.json())
                .then((msgData) => {
                  // Merge any new dashboard items from the follow-up
                  if (msgData.dashboardItems?.length) {
                    setDashboardItems((prev) => {
                      const existingUrls = new Set(prev.map((d: DashboardItem) => d.url));
                      const newItems = msgData.dashboardItems.filter(
                        (d: DashboardItem) => !existingUrls.has(d.url)
                      );
                      return newItems.length > 0 ? [...prev, ...newItems] : prev;
                    });
                  }

                  if (msgData.limitReached) {
                    setPhase("limit_reached");
                    // Stop WebRTC
                    if (dcRef.current) {
                      dcRef.current.onmessage = null;
                      dcRef.current.close();
                      dcRef.current = null;
                    }
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current.srcObject = null;
                    }
                    disconnect(pcRef.current);
                    pcRef.current = null;
                    setVoiceState("idle");
                  }
                })
                .catch(() => {
                  // Best-effort — don't break the voice flow
                });
            }
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
            setVoiceState("assistant_speaking");
            break;
          }

          case "response.audio_transcript.done": {
            const doneId = `assistant-${data.response_id || data.item_id || crypto.randomUUID()}`;
            setTranscript((prev) => {
              const lastIdx = prev.findLastIndex(
                (e) => e.role === "assistant" && e.id === doneId
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
            setVoiceState("listening");
            // Re-enable mic input after the agent finishes speaking
            if (dcRef.current && dcRef.current.readyState === "open") {
              dcRef.current.send(JSON.stringify({
                type: "session.update",
                session: {
                  turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 700,
                  },
                },
              }));
            }
            break;

          case "error":
            console.error("Realtime API error:", data.error);
            setErrorMsg(data.error?.message || "Voice connection error.");
            setVoiceState("error");
            break;
        }
      } catch {
        // Ignore non-JSON messages
      }
    },
    []
  );

  // --- Stop WebRTC voice connection ----------------------------------------
  const stopVoice = useCallback(() => {
    disconnect(pcRef.current);
    pcRef.current = null;
    dcRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }

    setVoiceState("idle");
  }, []);

  // --- Start WebRTC voice connection ---------------------------------------
  const startVoice = useCallback(async () => {
    setErrorMsg(null);
    setVoiceState("connecting");

    try {
      // Build topic-aware instructions for the Realtime API voice model
      const briefingText = briefingTextRef.current;
      const topicContext = topic
        ? [
            `You are a neutral, factual voice news companion discussing the topic: "${topic.title}".`,
            `Category: ${topic.category}.`,
            `Here is the research briefing you already delivered to the user:`,
            briefingText,
            "",
            "Rules:",
            "- You have already briefed the user on this topic. Do NOT re-introduce yourself or say hello.",
            "- Answer follow-up questions using the information from the briefing and your knowledge.",
            "- Stay neutral and factual. Distinguish confirmed facts from claims or opinions.",
            "- Keep responses concise and natural for voice delivery — short sentences, no markdown.",
            "- If the user asks about something outside the topic, gently steer back.",
            "- Reference specific sources by name when possible (e.g. 'according to Reuters').",
            "- ALWAYS end your response with a thought-provoking question that invites the listener to think from a different perspective. Use personal 'you' language like 'how do you think...' or 'what's your take on...'. Keep it focused on one specific angle.",
            "- Encourage the listener to consider different stakeholders, viewpoints, or consequences they might not have thought about.",
          ].join("\n")
        : undefined;

      const session = await fetchSessionToken(topicContext);
      const token = session.client_secret.value;

      hasPlayedRef.current = false;

      const { pc, dc } = await connectRealtime(token, (event) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.srcObject = event.streams[0];
        if (!hasPlayedRef.current) {
          audio.play().catch(() => {});
          hasPlayedRef.current = true;
        }
      });

      pcRef.current = pc;
      dcRef.current = dc;

      dc.onopen = () => {
        setVoiceState("assistant_speaking");
        setPhase("conversing");

        // 1. Disable mic input until the briefing is spoken
        dc.send(JSON.stringify({
          type: "session.update",
          session: {
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: null, // disable VAD so it doesn't listen yet
          },
        }));

        // 2. Inject the briefing as a user-invisible context message and ask the agent to speak it
        const briefing = briefingTextRef.current;
        if (briefing) {
          dc.send(JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Please read the following briefing aloud to the user exactly as written, do not add anything:\n\n${briefing}`,
                },
              ],
            },
          }));

          dc.send(JSON.stringify({ type: "response.create" }));
        }
      };

      dc.onmessage = handleServerEvent;

      dc.onclose = () => {
        setVoiceState("idle");
      };

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "disconnected"
        ) {
          setErrorMsg("Voice connection lost. You can try reconnecting.");
          setVoiceState("error");
          stopVoice();
        }
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start voice.";

      if (
        message.includes("Permission denied") ||
        message.includes("NotAllowedError")
      ) {
        setErrorMsg(
          "Microphone access denied. Please allow microphone permission and try again."
        );
      } else {
        setErrorMsg(message);
      }

      setVoiceState("error");
      disconnect(pcRef.current);
      pcRef.current = null;
      dcRef.current = null;
    }
  }, [handleServerEvent, stopVoice, topic]);

  // --- Auto-start voice after briefing loads (brief delay) -----------------
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (phase !== "briefing_ready" || autoStartedRef.current) return;
    autoStartedRef.current = true;

    const timer = setTimeout(() => {
      startVoice();
    }, 1500);

    return () => clearTimeout(timer);
  }, [phase, startVoice]);

  // --- Back to Feed handler ------------------------------------------------
  const handleBackToFeed = useCallback(async () => {
    // 1. Close data channel immediately to stop the Realtime API from sending more audio
    if (dcRef.current) {
      dcRef.current.onmessage = null;
      dcRef.current.close();
      dcRef.current = null;
    }

    // 2. Stop audio playback immediately
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }

    // 3. Stop WebRTC / microphone
    stopVoice();

    // 4. End the server session (fire-and-forget)
    const sid = sessionIdRef.current;
    if (sid) {
      navigator.sendBeacon(
        "/api/voice-agent/end",
        new Blob([JSON.stringify({ sessionId: sid })], {
          type: "application/json",
        })
      );
    }

    // 5. Clear only topic-specific data, preserve feed-topics
    try {
      sessionStorage.removeItem(`topic-${id}`);
    } catch {
      // sessionStorage may be unavailable
    }

    // 6. Navigate home
    router.push("/");
  }, [id, router, stopVoice]);

  // --- Retry handler -------------------------------------------------------
  const handleRetry = useCallback(() => {
    setErrorMsg(null);
    setTranscript([]);
    setSuggestedQuestions([]);
    setDashboardItems([]);
    setSessionId(null);
    if (topic) {
      setPhase("researching");
    }
  }, [topic]);

  // --- Derived state -------------------------------------------------------
  const voiceActive =
    voiceState !== "idle" && voiceState !== "error";
  const statusCfg = VOICE_STATUS[voiceState];
  const showVoiceControls =
    phase === "briefing_ready" || phase === "conversing";

  // --- Render: Error / Topic not found -------------------------------------
  if (phase === "error" && !topic) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Topic Not Found</h1>
          <p className="text-sm text-muted-foreground">
            {errorMsg ||
              "The topic you&apos;re looking for doesn&apos;t exist or has expired."}
          </p>
          <Button onClick={() => router.push("/")} className="mt-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Button>
        </div>
      </main>
    );
  }

  // --- Render: Main topic page ---------------------------------------------
  return (
    <main className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToFeed}
          className="shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">
            {topic?.title ?? "Loading…"}
          </h1>
          {topic?.category && (
            <Badge variant="secondary" className="mt-0.5">
              {topic.category}
            </Badge>
          )}
        </div>

        {/* Voice status indicator */}
        {showVoiceControls && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Badge variant="secondary" className={statusCfg.color}>
                {statusCfg.label}
              </Badge>
              {statusCfg.pulse && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-ping" />
              )}
            </div>
          </div>
        )}
      </header>

      {/* Content area — sources (left, majority) + chat (right) */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Dashboard / sources pane — takes majority of width */}
        <div className="hidden md:flex md:flex-1 overflow-y-auto border-r p-4">
          {dashboardItems.length > 0 ? (
            <DashboardPanel items={dashboardItems} className="w-full" />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Sources will appear here as the agent researches.
            </div>
          )}
        </div>

        {/* Chat / conversation pane — fixed-width column on the right */}
        <div className="flex flex-col overflow-hidden w-full md:w-[380px] lg:w-[420px] shrink-0">
          {/* Researching state */}
          {phase === "researching" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Researching your topic…</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gathering sources and multiple perspectives
                </p>
              </div>
            </div>
          )}

          {/* Transcript area — visible once briefing is ready */}
          {(phase === "briefing_ready" ||
            phase === "conversing" ||
            phase === "limit_reached" ||
            (phase === "error" && topic)) && (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-3">
                {transcript.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex",
                      entry.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                        entry.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <p className="text-xs font-medium opacity-70 mb-0.5">
                        {entry.role === "user" ? "You" : "Agent"}
                      </p>
                      <p className="whitespace-pre-wrap">{entry.text}</p>
                    </div>
                  </div>
                ))}

                {/* Limit reached message */}
                {phase === "limit_reached" && (
                  <div className="flex justify-center py-4">
                    <Card className="max-w-sm">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          We&apos;ve reached the conversation limit for this topic.
                        </p>
                        <Button onClick={handleBackToFeed} size="sm">
                          <ArrowLeft className="w-4 h-4" />
                          Explore other topics
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Error with retry */}
                {phase === "error" && topic && (
                  <div className="flex justify-center py-4">
                    <Card className="max-w-sm">
                      <CardContent className="p-4 text-center">
                        <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
                        <p className="text-sm text-destructive mb-3">
                          {errorMsg || "Something went wrong."}
                        </p>
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={handleRetry}
                            size="sm"
                            variant="outline"
                          >
                            Try again
                          </Button>
                          <Button onClick={handleBackToFeed} size="sm">
                            Back to Feed
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div ref={transcriptEndRef} />
              </div>
            </div>
          )}

          {/* Voice controls footer */}
          <div className="shrink-0 border-t px-4 py-3">
            <div className="flex items-center justify-center gap-3">
              {phase === "briefing_ready" && !voiceActive && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  Connecting voice…
                </p>
              )}

              {phase === "conversing" && voiceActive && (
                <Button
                  variant="destructive"
                  onClick={stopVoice}
                  className="gap-2"
                >
                  <Mic className="w-4 h-4" />
                  Stop listening
                </Button>
              )}

              {phase === "conversing" && !voiceActive && (
                <Button onClick={startVoice} className="gap-2">
                  <Mic className="w-4 h-4" />
                  Resume voice
                </Button>
              )}

              {voiceState === "error" && (
                <p className="text-xs text-destructive text-center max-w-xs">
                  {errorMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden audio element for voice playback */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
    </main>
  );
}