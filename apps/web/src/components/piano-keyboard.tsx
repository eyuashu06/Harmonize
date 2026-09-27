"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PianoKeyboardProps {
  highlightMidi?: number[]; // MIDI notes to highlight (0..127)
  startOctave?: number;     // lowest octave shown
  octaves?: number;         // how many octaves to show (default 2)
  className?: string;
}

const WHITE_KEYS_PER_OCTAVE = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_KEYS_AFTER: Record<string, number> = {
  C: 1, D: 2, F: 1, G: 2, A: 3,
};
const BLACK_KEY_NAMES = ["C#", "D#", "F#", "G#", "A#"];

/**
 * Lightweight SVG piano keyboard. Highlights any MIDI notes passed in.
 */
export function PianoKeyboard({
  highlightMidi = [],
  startOctave = 3,
  octaves = 2,
  className,
}: PianoKeyboardProps) {
  const whiteW = 28;
  const whiteH = 110;
  const blackW = 18;
  const blackH = 70;
  const totalWhites = 7 * octaves;
  const totalW = whiteW * totalWhites;

  const isHighlighted = (midi: number) => highlightMidi.includes(midi);

  // Build white keys
  const whiteKeys: React.ReactNode[] = [];
  let whiteIndex = 0;
  for (let o = 0; o < octaves; o++) {
    for (const name of WHITE_KEYS_PER_OCTAVE) {
      const midi = (startOctave + o + 1) * 12 + ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].indexOf(name);
      whiteKeys.push(
        <g key={`w-${o}-${name}`}>
          <rect
            x={whiteIndex * whiteW}
            y={0}
            width={whiteW}
            height={whiteH}
            className={cn(
              "fill-white stroke-slate-300 dark:fill-slate-100 dark:stroke-slate-400",
              isHighlighted(midi) && "fill-primary stroke-primary",
            )}
          />
          <text
            x={whiteIndex * whiteW + whiteW / 2}
            y={whiteH - 6}
            textAnchor="middle"
            className={cn(
              "fill-slate-500 text-[9px]",
              isHighlighted(midi) && "fill-primary-foreground",
            )}
          >
            {name}{startOctave + o}
          </text>
        </g>,
      );
      whiteIndex++;
    }
  }

  // Build black keys
  const blackKeys: React.ReactNode[] = [];
  for (let o = 0; o < octaves; o++) {
    let whiteCount = 0;
    for (const name of WHITE_KEYS_PER_OCTAVE) {
      const offset = BLACK_KEYS_AFTER[name];
      if (offset) {
        const blackName = BLACK_KEY_NAMES[whiteCount % 5];
        const x = (whiteCount + 1) * whiteW - blackW / 2 + (o * 7 * whiteW);
        const midi = (startOctave + o + 1) * 12 + ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].indexOf(blackName);
        blackKeys.push(
          <rect
            key={`b-${o}-${blackName}`}
            x={x}
            y={0}
            width={blackW}
            height={blackH}
            rx={2}
            className={cn(
              "fill-slate-800 stroke-slate-900",
              isHighlighted(midi) && "fill-primary stroke-primary",
            )}
          />,
        );
        void offset;
      }
      whiteCount++;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${totalW} ${whiteH}`}
      width="100%"
      height={120}
      className={cn("rounded-md border bg-card", className)}
      role="img"
      aria-label="Piano keyboard"
    >
      {whiteKeys}
      {blackKeys}
    </svg>
  );
}
