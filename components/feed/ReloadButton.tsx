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
      className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-[#1a1025]/80 backdrop-blur-sm px-5 py-2.5 text-sm font-medium text-white/80 shadow-sm transition-colors hover:bg-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0514] disabled:pointer-events-none disabled:opacity-50"
    >
      <RefreshCw
        className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      {isLoading ? "Discovering…" : "Reload Feed"}
    </button>
  );
}
