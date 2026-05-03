"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface GlitchTitleProps {
  text: string;
  className?: string;
  initialGlitchInterval?: number; // ms between glitches at start
  finalGlitchInterval?: number; // ms between glitches at end
  transitionDuration?: number; // seconds to reach max glitch frequency
}

export function GlitchTitle({
  text,
  className,
  initialGlitchInterval = 3000,
  finalGlitchInterval = 800,
  transitionDuration = 10,
}: GlitchTitleProps): React.ReactElement {
  const [isGlitching, setIsGlitching] = useState(false);
  const [glitchColor, setGlitchColor] = useState("#FFFF00"); // yellow or blue
  const [currentInterval, setCurrentInterval] = useState(initialGlitchInterval);

  useEffect(() => {
    // Gradually decrease the interval (increase frequency)
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const progress = Math.min(elapsed / transitionDuration, 1);
      
      // Interpolate between initial and final interval
      const newInterval = initialGlitchInterval - (progress * (initialGlitchInterval - finalGlitchInterval));
      setCurrentInterval(newInterval);
      
      if (progress >= 1) {
        clearInterval(progressInterval);
      }
    }, 100); // Update every 100ms

    return () => clearInterval(progressInterval);
  }, [initialGlitchInterval, finalGlitchInterval, transitionDuration]);

  useEffect(() => {
    const glitchCycle = () => {
      // Randomly choose yellow or blue for this glitch cycle
      const colors = ["#FFFF00", "#00FFFF"]; // neon yellow, neon blue
      setGlitchColor(colors[Math.floor(Math.random() * colors.length)]);
      
      // Create multiple rapid glitches for more chaotic effect
      const glitchCount = Math.floor(Math.random() * 3) + 3; // 3-5 rapid glitches
      let currentGlitch = 0;

      const rapidGlitch = () => {
        if (currentGlitch >= glitchCount) {
          // Ensure we end in the off state (sans-serif)
          setIsGlitching(false);
          return;
        }
        
        setIsGlitching(true);
        
        // Random short duration for each glitch flash
        const flashDuration = Math.random() * 60 + 50; // 50-110ms
        
        setTimeout(() => {
          setIsGlitching(false);
          currentGlitch++;
          
          if (currentGlitch < glitchCount) {
            // Short pause before next glitch
            setTimeout(rapidGlitch, Math.random() * 50 + 30); // 30-80ms pause
          }
        }, flashDuration);
      };

      rapidGlitch();
    };

    // Start immediately on mount
    glitchCycle();

    // Set up recurring glitches with dynamic interval
    const interval = setInterval(glitchCycle, currentInterval);

    return () => {
      clearInterval(interval);
    };
  }, [currentInterval]);

  return (
    <h1
      className={cn(
        "relative font-bold tracking-wider transition-none",
        isGlitching ? "text-6xl md:text-8xl lg:text-9xl" : "text-5xl md:text-7xl lg:text-8xl",
        className
      )}
      style={{
        fontFamily: isGlitching
          ? "'Chomsky', serif"  // GLITCH to Chomsky
          : "'Inter', ui-sans-serif, system-ui, sans-serif",  // BASE is sans-serif
        color: isGlitching ? glitchColor : "#FFFFFF",  // Yellow/blue when Chomsky, white when sans-serif
        fontWeight: isGlitching ? "normal" : "300",
        letterSpacing: isGlitching ? "0.02em" : "0.1em",
        textTransform: isGlitching ? "uppercase" : "lowercase",
        textShadow: isGlitching 
          ? `0 0 20px ${glitchColor}, 2px 2px 0 ${glitchColor}40, -2px -2px 0 ${glitchColor}40`
          : "none",
      }}
    >
      {isGlitching ? text : text.toLowerCase()}
    </h1>
  );
}
