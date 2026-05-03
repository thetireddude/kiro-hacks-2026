"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ReelPanel } from "@/components/ui/ReelPanel";
import { TopicCard } from "./TopicCard";
import { TopicCardSkeleton } from "./TopicCardSkeleton";
import { ReloadButton } from "./ReloadButton";
import type { Topic, AgentResponse, AgentErrorResponse } from "@/lib/types";

type FeedState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; topics: Topic[] }
  | { status: "error"; message: string; partialTopics?: Topic[] };

export function NewsFeed(): React.ReactElement {
  const [feedState, setFeedState] = useState<FeedState>({ status: "loading" });

  const fetchTopics = useCallback(async () => {
    setFeedState({ status: "loading" });

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data: AgentResponse | AgentErrorResponse = await res.json();

      if (!res.ok || "error" in data) {
        const errData = data as AgentErrorResponse;
        setFeedState({
          status: "error",
          message: errData.error ?? "Agent failed to return topics.",
          partialTopics: errData.partialTopics,
        });
        return;
      }

      const { topics } = data as AgentResponse;

      if (!topics || topics.length === 0) {
        setFeedState({
          status: "error",
          message: "No trending topics found. Try again in a moment.",
        });
        return;
      }

      setFeedState({ status: "success", topics });
    } catch (err) {
      setFeedState({
        status: "error",
        message:
          err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // Build reel items from topics
  const buildReelItems = (topics: Topic[]) =>
    topics.map((topic) => ({
      id: topic.id,
      content: (
        <div className="flex h-full w-full items-center justify-center p-4">
          <TopicCard topic={topic} />
        </div>
      ),
    }));

  // Loading state — show skeleton inside the reel
  if (feedState.status === "loading") {
    const skeletonItems = Array.from({ length: 3 }, (_, i) => ({
      id: `skeleton-${i}`,
      content: (
        <div className="flex h-full w-full items-center justify-center p-4">
          <TopicCardSkeleton />
        </div>
      ),
    }));

    return (
      <div className="flex flex-col items-center gap-4">
        <ReelPanel items={skeletonItems} />
        <p className="text-white/50 text-sm animate-pulse">
          Agent is discovering topics…
        </p>
      </div>
    );
  }

  // Error state with optional partial results
  if (feedState.status === "error") {
    const partials = feedState.partialTopics;

    if (partials && partials.length > 0) {
      return (
        <div className="flex flex-col items-center gap-4">
          <p className="text-amber-400/80 text-sm">
            Partial results — agent encountered an issue.
          </p>
          <ReelPanel items={buildReelItems(partials)} />
          <ReloadButton
            onReload={fetchTopics}
            isLoading={false}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-white/70 text-base">{feedState.message}</p>
        </div>
        <ReloadButton onReload={fetchTopics} isLoading={false} />
      </div>
    );
  }

  // Success state
  return (
    <div className="flex flex-col items-center gap-4">
      <ReelPanel items={buildReelItems(feedState.topics)} />
      <ReloadButton
        onReload={fetchTopics}
        isLoading={false}
      />
    </div>
  );
}
