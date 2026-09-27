"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ChordDiagramProps {
  symbol: string;
  frets: number[];
  baseFret: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const STRING_LABELS = ["E", "A", "D", "G", "B", "E"]; // low to high

/**
 * Render a guitar chord diagram for a 6-string chord.
 * `frets` is low-E to high-E; -1 = muted (×), 0 = open (○), >0 = fretted.
 */
export function ChordDiagram({ symbol, frets, baseFret, size = "md", className }: ChordDiagramProps) {
  const dims = size === "sm"
    ? { w: 80, h: 100, fretH: 14, stringW: 11, dot: 8, font: 10 }
    : size === "lg"
    ? { w: 140, h: 180, fretH: 26, stringW: 20, dot: 12, font: 14 }
    : { w: 110, h: 140, fretH: 20, stringW: 15, dot: 10, font: 12 };

  // Adjust to show all fretted positions within 4 frets starting at baseFret.
  const fretted = frets.filter((f) => f > 0);
  const maxFret = fretted.length ? Math.max(...fretted) : 1;
  const showFrom = baseFret > 1 ? baseFret : (maxFret > 4 ? Math.max(1, maxFret - 3) : 1);
  const fretWindow = 4;

  // Y for a given fret index (0..fretWindow-1)
  const yForFret = (i: number) => dims.fretH * (i + 1);
  // X for a given string (0..5)
  const xForString = (s: number) => dims.stringW * s + dims.stringW / 2;

  return (
    <div className={cn("flex flex-col items-center text-foreground", className)}>
      <div className="font-semibold" style={{ fontSize: dims.font + 2 }}>{symbol}</div>
      <svg width={dims.w} height={dims.h} role="img" aria-label={`${symbol} chord diagram`}>
        {/* Top nut (only if baseFret == 1) */}
        {baseFret === 1 && (
          <rect x={0} y={dims.fretH * 0.5} width={dims.w} height={3} fill="currentColor" />
        )}

        {/* Fret lines */}
        {Array.from({ length: fretWindow + 1 }, (_, i) => (
          <line
            key={i}
            x1={0}
            y1={yForFret(i)}
            x2={dims.w}
            y2={yForFret(i)}
            stroke="currentColor"
            strokeOpacity={0.4}
            strokeWidth={1}
          />
        ))}

        {/* Strings (low E to high E) */}
        {STRING_LABELS.map((label, s) => (
          <line
            key={s}
            x1={xForString(s)}
            y1={0}
            x2={xForString(s)}
            y2={dims.fretH * (fretWindow + 1)}
            stroke="currentColor"
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        ))}

        {/* String labels */}
        {STRING_LABELS.map((label, s) => (
          <text
            key={s}
            x={xForString(s)}
            y={dims.h - 4}
            textAnchor="middle"
            fontSize={dims.font - 2}
            fill="currentColor"
            fillOpacity={0.6}
          >
            {label}
          </text>
        ))}

        {/* Mute / open markers */}
        {frets.map((f, s) => {
          const x = xForString(s);
          if (f === -1) {
            return (
              <text key={s} x={x} y={dims.fretH * 0.4} textAnchor="middle" fontSize={dims.font} fill="currentColor">×</text>
            );
          }
          if (f === 0) {
            return (
              <circle key={s} cx={x} cy={dims.fretH * 0.4} r={dims.dot / 2.5} fill="none" stroke="currentColor" strokeWidth={1} />
            );
          }
          return null;
        })}

        {/* Position dots */}
        {frets.map((f, s) => {
          if (f <= 0) return null;
          const rel = f - showFrom + 1;
          if (rel < 1 || rel > fretWindow) return null;
          return (
            <circle
              key={s}
              cx={xForString(s)}
              cy={yForFret(rel) - dims.fretH / 2}
              r={dims.dot / 2}
              fill="currentColor"
            />
          );
        })}

        {/* Base-fret indicator */}
        {baseFret > 1 && (
          <text x={-2} y={yForFret(1) - 4} textAnchor="end" fontSize={dims.font - 2} fill="currentColor">
            {baseFret}fr
          </text>
        )}
      </svg>
    </div>
  );
}
