"use client";

import { useState } from "react";
import type { DashboardItem } from "@/lib/voice-agent/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExternalLink, Newspaper, MessageSquare, Video, Image as ImageIcon, PenLine } from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DashboardPanelProps {
  /** Dashboard items to render — sourced from voice-agent API responses */
  items: DashboardItem[];
  /** Optional additional class names for the root container */
  className?: string;
}

// ---------------------------------------------------------------------------
// Source type config
// ---------------------------------------------------------------------------

const SOURCE_TYPE_CONFIG: Record<
  DashboardItem["sourceType"],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  news: {
    label: "News",
    icon: Newspaper,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  opinion: {
    label: "Opinion",
    icon: PenLine,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  social: {
    label: "Social",
    icon: MessageSquare,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  video: {
    label: "Video",
    icon: Video,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  image: {
    label: "Image",
    icon: ImageIcon,
    color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  },
};

// ---------------------------------------------------------------------------
// Source image with graceful fallback
// ---------------------------------------------------------------------------

function SourceImage({ src, alt }: { src: string; alt: string }): React.JSX.Element | null {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="w-full h-32 object-cover rounded-t-xl"
      loading="lazy"
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardPanel({ items, className }: DashboardPanelProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-sm text-white/40", className)}>
        No sources yet — they&apos;ll appear as the agent researches.
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50 px-1">
        Sources ({items.length})
      </h2>

      <ul className="space-y-2" role="list">
        {items.map((item) => {
          const config = SOURCE_TYPE_CONFIG[item.sourceType] ?? SOURCE_TYPE_CONFIG.news;
          const Icon = config.icon;

          return (
            <li key={item.url}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <Card size="sm" className="transition-colors group-hover:ring-purple-500/30 overflow-hidden bg-white/5 border-purple-500/15 backdrop-blur-sm">
                  {item.imageUrl && (
                    <SourceImage src={item.imageUrl} alt={item.title} />
                  )}
                  <CardHeader className="pb-0">
                    <div className="flex items-start gap-2">
                      <CardTitle className="flex-1 line-clamp-2 text-xs leading-snug text-white/90">
                        {item.title}
                      </CardTitle>
                      <ExternalLink className="w-3 h-3 shrink-0 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-white/50 line-clamp-2 mb-2">
                      {item.snippet}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={cn("gap-1", config.color)}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                      <span className="text-[10px] text-white/40 truncate">
                        {item.domain}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
