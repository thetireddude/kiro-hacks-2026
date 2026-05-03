"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TopicCard } from "@/components/feed/TopicCard";
import { TopicCardSkeleton } from "@/components/feed/TopicCardSkeleton";
import { ReloadButton } from "@/components/feed/ReloadButton";
import { AlertCircle, Inbox } from "lucide-react";
import type { Topic, AgentResponse, AgentErrorResponse } from "@/lib/types";

const SESSION_CACHE_KEY = "newnews-topics";

function getCachedTopics(): Topic[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Topic[];
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedTopics(topics: Topic[]): void {
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(topics));
  } catch {
    // sessionStorage may be unavailable — silently ignore
  }
}

type FeedState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; topics: Topic[] }
  | { status: "error"; message: string; partialTopics?: Topic[] }
  | { status: "empty" };

async function callAgentApi(
  setState: React.Dispatch<React.SetStateAction<FeedState>>,
  signal?: AbortSignal,
): Promise<void> {
  setState({ status: "loading" });

  try {
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal,
    });

    if (signal?.aborted) return;

    if (res.ok) {
      const data: AgentResponse = await res.json();
      if (data.topics.length === 0) {
        setState({ status: "empty" });
      } else {
        setCachedTopics(data.topics);
        setState({ status: "success", topics: data.topics });
      }
    } else {
      const errorData: AgentErrorResponse = await res.json();
      if (errorData.partialTopics && errorData.partialTopics.length > 0) {
        setCachedTopics(errorData.partialTopics);
        setState({
          status: "error",
          message: errorData.error,
          partialTopics: errorData.partialTopics,
        });
      } else {
        setState({ status: "error", message: errorData.error });
      }
    }
  } catch (err) {
    if (signal?.aborted) return;
    const message =
      err instanceof Error ? err.message : "Failed to connect to the server";
    setState({ status: "error", message });
  }
}

export default function Home(): React.ReactElement {
  const [state, setState] = useState<FeedState>({ status: "idle" });
  const hasFetchedRef = useRef(false);

  // On mount, restore from cache or fetch from API
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    // Check session cache first
    const cached = getCachedTopics();
    if (cached) {
      setState({ status: "success", topics: cached });
      return;
    }

    // No cache — fetch from API
    const controller = new AbortController();
    callAgentApi(setState, controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  const handleReload = useCallback((): void => {
    callAgentApi(setState);
  }, []);

  const isLoading = state.status === "loading";

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8">
      {/* Header */}
      <header className="mb-8 flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          New News
        </h1>
        <ReloadButton onReload={handleReload} isLoading={isLoading} />
      </header>

      {/* Loading state */}
      {state.status === "loading" && (
        <div className="flex w-full flex-col items-center gap-4">
          <TopicCardSkeleton />
          <TopicCardSkeleton />
          <TopicCardSkeleton />
        </div>
      )}

      {/* Success state */}
      {state.status === "success" && (
        <div className="flex w-full flex-col items-center gap-4">
          {state.topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      )}

      {/* Error state with partial topics */}
      {state.status === "error" && state.partialTopics && (
        <div className="flex w-full flex-col items-center gap-4">
          <div
            className="mx-auto flex w-full max-w-[480px] items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 sm:max-w-[560px]"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Results may be incomplete. {state.message}</span>
          </div>
          {state.partialTopics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      )}

      {/* Error state without partial topics */}
      {state.status === "error" && !state.partialTopics && (
        <div
          className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center sm:max-w-[560px]"
          role="alert"
        >
          <AlertCircle
            className="h-10 w-10 text-destructive"
            aria-hidden="true"
          />
          <p className="text-lg font-medium text-card-foreground">
            Something went wrong
          </p>
          <p className="text-sm text-muted">{state.message}</p>
          <button
            type="button"
            onClick={handleReload}
            className="mt-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {state.status === "empty" && (
        <div className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center sm:max-w-[560px]">
          <Inbox className="h-10 w-10 text-muted" aria-hidden="true" />
          <p className="text-lg font-medium text-card-foreground">
            No trending topics found
          </p>
          <p className="text-sm text-muted">
            Try again in a moment — the news cycle moves fast.
          </p>
          <button
            type="button"
            onClick={handleReload}
            className="mt-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Reload Feed
          </button>
        </div>
      )}
    </main>
  );
}
