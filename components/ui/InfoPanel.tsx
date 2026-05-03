"use client";

import React from "react";
import { CurvedPanel } from "./CurvedPanel";

interface InfoPanelProps {
  children?: React.ReactNode;
}

export function InfoPanel({ children }: InfoPanelProps) {
  return (
    <CurvedPanel side="right">
      <div className="flex h-full w-full items-center justify-center p-8">
        {children || (
          <div className="text-center">
            <div className="text-white/60 text-lg">
              Additional content panel
            </div>
          </div>
        )}
      </div>
    </CurvedPanel>
  );
}
