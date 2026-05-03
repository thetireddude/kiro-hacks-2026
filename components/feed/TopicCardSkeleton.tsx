"use client";

export function TopicCardSkeleton(): React.ReactElement {
  return (
    <div
      className="w-full h-full rounded-none border-0 bg-card p-8 flex flex-col"
      aria-label="Loading topic…"
      role="status"
    >
      {/* Category badge skeleton */}
      <div className="h-6 w-24 animate-pulse rounded-full bg-border" />

      {/* Title skeleton */}
      <div className="mt-3 space-y-2">
        <div className="h-7 w-full animate-pulse rounded bg-border" />
        <div className="h-7 w-3/4 animate-pulse rounded bg-border" />
      </div>

      {/* Summary skeleton */}
      <div className="mt-3 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-border" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-border" />
      </div>

      {/* Metadata row skeleton */}
      <div className="mt-4 flex items-center gap-4">
        <div className="h-4 w-20 animate-pulse rounded bg-border" />
        <div className="h-4 w-16 animate-pulse rounded bg-border" />
      </div>

      <span className="sr-only">Loading topic…</span>
    </div>
  );
}
