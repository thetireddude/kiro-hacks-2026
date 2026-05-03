"use client";

import { RefreshCw } from "lucide-react";

interface ReloadButtonProps {
  onReload: () => void;
  isLoading: boolean;
}

export function ReloadButton({
  onReload,
  isLoading,
}: ReloadButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onReload}
      disabled={isLoading}
      aria-label={isLoading ? "Loading topics…" : "Reload feed"}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    >
      <RefreshCw
        className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      {isLoading ? "Discovering…" : "Reload Feed"}
    </button>
  );
}
