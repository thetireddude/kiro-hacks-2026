"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CurvedPanelProps {
  children: React.ReactNode;
  className?: string;
  side?: "left" | "right";
}

export function CurvedPanel({ children, className, side = "left" }: CurvedPanelProps) {
  return (
    <div
      className={cn(
        "relative h-[600px] w-[480px] overflow-hidden",
        "backdrop-blur-md bg-white/10 dark:bg-black/10",
        "border border-white/20 dark:border-white/10",
        "shadow-2xl shadow-purple-500/20",
        side === "left" ? "rounded-[40px_20px_40px_20px]" : "rounded-[20px_40px_20px_40px]",
        className
      )}
      style={{
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {children}
    </div>
  );
}
