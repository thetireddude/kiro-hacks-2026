'use client';

import { CSSProperties, useEffect, useState } from 'react';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxRandomDelay?: number;
  className?: string;
  style?: CSSProperties;
  loop?: boolean;
  loopInterval?: number;
}

export function DecryptedText({
  text,
  speed = 50,
  maxRandomDelay = 150,
  className = '',
  style = {},
  loop = false,
  loopInterval = 5000,
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [decryptedIndices, setDecryptedIndices] = useState<Set<number>>(new Set());
  const [scrambleFrames, setScrambleFrames] = useState<Map<number, number>>(new Map());
  const [triggerKey, setTriggerKey] = useState(0);

  useEffect(() => {
    const chars = text.split('');
    let currentDecrypted = new Set<number>();
    let currentScrambles = new Map<number, number>();

    // Initialize scramble counters for each character
    chars.forEach((_, index) => {
      currentScrambles.set(index, 0);
    });

    const decryptChar = (index: number) => {
      currentDecrypted.add(index);
      setDecryptedIndices(new Set(currentDecrypted));
    };

    // Stagger the decryption of each character with more scramble frames
    chars.forEach((_, index) => {
      const delay = index * speed + Math.random() * maxRandomDelay;
      
      // Add multiple scramble frames before revealing
      const scrambleCount = 8 + Math.floor(Math.random() * 5); // 8-12 scrambles per character
      for (let i = 0; i < scrambleCount; i++) {
        setTimeout(() => {
          currentScrambles.set(index, i);
          setScrambleFrames(new Map(currentScrambles));
        }, delay + (i * 60)); // 60ms between scrambles
      }
      
      // Final reveal after all scrambles
      setTimeout(() => decryptChar(index), delay + (scrambleCount * 60));
    });

    // Set up loop if enabled
    if (loop) {
      const loopTimer = setTimeout(() => {
        setDecryptedIndices(new Set());
        setScrambleFrames(new Map());
        setTriggerKey(prev => prev + 1);
      }, loopInterval);

      return () => clearTimeout(loopTimer);
    }
  }, [text, speed, maxRandomDelay, loop, loopInterval, triggerKey]);

  const randomChar = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
    return chars[Math.floor(Math.random() * chars.length)];
  };

  return (
    <span className={className} style={style}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="inline-block"
        >
          {decryptedIndices.has(index) ? char : randomChar()}
        </span>
      ))}
    </span>
  );
}
