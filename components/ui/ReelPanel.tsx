"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CurvedPanel } from "./CurvedPanel";

interface ReelItem {
  id: string;
  content: React.ReactNode;
}

interface ReelPanelProps {
  items?: ReelItem[];
}

export function ReelPanel({ items }: ReelPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const touchStartRef = useRef(0);

  // Default demo items if none provided
  const defaultItems: ReelItem[] = [
    {
      id: "1",
      content: (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-600/20 to-violet-700/20 p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Topic 1</h3>
            <p className="text-white/80">Scroll to explore more news</p>
          </div>
        </div>
      ),
    },
    {
      id: "2",
      content: (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600/20 to-indigo-700/20 p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Topic 2</h3>
            <p className="text-white/80">Breaking news updates</p>
          </div>
        </div>
      ),
    },
    {
      id: "3",
      content: (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-600/20 p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Topic 3</h3>
            <p className="text-white/80">Latest developments</p>
          </div>
        </div>
      ),
    },
    {
      id: "4",
      content: (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-600/20 to-purple-700/20 p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Topic 4</h3>
            <p className="text-white/80">Trending stories</p>
          </div>
        </div>
      ),
    },
    {
      id: "5",
      content: (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-violet-600/20 p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Topic 5</h3>
            <p className="text-white/80">More updates</p>
          </div>
        </div>
      ),
    },
  ];

  const reelItems = items || defaultItems;

  const goToNext = () => {
    if (currentIndex < reelItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Handle wheel events (mouse scroll)
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      if (isScrollingRef.current) return;
      
      if (Math.abs(e.deltaY) > 10) {
        isScrollingRef.current = true;
        
        if (e.deltaY > 0) {
          goToNext();
        } else {
          goToPrevious();
        }
        
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 600);
      }
    };

    // Handle touch events (mobile swipe)
    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isScrollingRef.current) return;
      
      const touchEnd = e.changedTouches[0].clientY;
      const diff = touchStartRef.current - touchEnd;
      
      if (Math.abs(diff) > 50) {
        isScrollingRef.current = true;
        
        if (diff > 0) {
          goToNext();
        } else {
          goToPrevious();
        }
        
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 600);
      }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isScrollingRef.current) return;
      
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        isScrollingRef.current = true;
        goToNext();
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 600);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        isScrollingRef.current = true;
        goToPrevious();
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 600);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, reelItems.length]);

  return (
    <CurvedPanel side="left">
      <div ref={containerRef} className="relative h-full w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="absolute inset-0"
          >
            {reelItems[currentIndex].content}
          </motion.div>
        </AnimatePresence>
        
        {/* Scroll indicators */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          {reelItems.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (!isScrollingRef.current) {
                  setCurrentIndex(index);
                }
              }}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-white scale-125"
                  : "bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`Go to item ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation hints */}
        {currentIndex > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/40 text-xs">
            ↑ Scroll up
          </div>
        )}
        {currentIndex < reelItems.length - 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs">
            ↓ Scroll down
          </div>
        )}
      </div>
    </CurvedPanel>
  );
}
