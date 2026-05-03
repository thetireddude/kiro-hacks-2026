"use client";

import { Newspaper, CircleDot } from "lucide-react";
import type { Topic, TopicCategory, ConfidenceLevel } from "@/lib/types";

const CATEGORY_COLORS: Record<TopicCategory, string> = {
  politics: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  technology: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  world: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  business: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  science: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  sports: "bg-red-500/15 text-red-700 dark:text-red-400",
  entertainment: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  health: "bg-green-500/15 text-green-700 dark:text-green-400",
};

const CONFIDENCE_STYLES: Record<
  ConfidenceLevel,
  { color: string; label: string }
> = {
  high: { color: "text-green-500", label: "High confidence" },
  medium: { color: "text-yellow-500", label: "Medium confidence" },
  low: { color: "text-gray-400", label: "Low confidence" },
};

interface TopicCardProps {
  topic: Topic;
}

export function TopicCard({ topic }: TopicCardProps): React.ReactElement {
  const categoryStyle =
    CATEGORY_COLORS[topic.category] ?? CATEGORY_COLORS.world;
  const confidence = CONFIDENCE_STYLES[topic.confidence];

  return (
    <article
      className="mx-auto w-full max-w-[480px] rounded-2xl border border-border bg-card p-6 shadow-sm sm:max-w-[560px]"
      aria-label={`Topic: ${topic.title}`}
    >
      {/* Category badge */}
      <span
        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${categoryStyle}`}
      >
        {topic.category}
      </span>

      {/* Title */}
      <h2 className="mt-3 text-2xl font-bold leading-tight text-card-foreground sm:text-3xl">
        {topic.title}
      </h2>

      {/* Summary */}
      <p className="mt-2 text-base leading-relaxed text-muted">
        {topic.summary}
      </p>

      {/* Metadata row */}
      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5" aria-label={`${topic.sourceCount} sources`}>
          <Newspaper className="h-4 w-4" aria-hidden="true" />
          {topic.sourceCount} {topic.sourceCount === 1 ? "source" : "sources"}
        </span>

        <span className="flex items-center gap-1.5" aria-label={confidence.label}>
          <CircleDot
            className={`h-4 w-4 ${confidence.color}`}
            aria-hidden="true"
          />
          {topic.confidence}
        </span>
      </div>
    </article>
  );
}
