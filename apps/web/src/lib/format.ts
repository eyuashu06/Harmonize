// Frontend-side formatting helpers.
import { parseChord } from "@/lib/theory";

const KEY_TO_SEMITONE: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3,
  E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8,
  Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

function intervals(quality: string): number[] {
  if (quality.startsWith("m") && !quality.startsWith("maj")) {
    return [0, 3, 7, 10].filter((_, i) => quality.includes("7") || i < 3);
  }
  if (quality.startsWith("dim")) return [0, 3, 6];
  if (quality.startsWith("aug")) return [0, 4, 8];
  if (quality.startsWith("sus2")) return [0, 2, 7];
  if (quality.startsWith("sus4")) return [0, 5, 7];
  if (quality.includes("maj7")) return [0, 4, 7, 11];
  if (quality.includes("7")) return [0, 4, 7, 10];
  return [0, 4, 7];
}

/** Return the MIDI notes for a chord symbol, starting at MIDI 48 (C3). */
export function pianoMidi(symbol: string): number[] {
  const p = parseChord(symbol);
  if (!(p.root in KEY_TO_SEMITONE)) return [];
  const root = 48 + KEY_TO_SEMITONE[p.root];
  return intervals(p.quality).map((iv) => root + iv);
}

export function formatBpm(bpm: number | null | undefined): string {
  if (!bpm) return "—";
  return `${Math.round(bpm)} BPM`;
}

export function formatKeySignature(key: string | null | undefined, scale: string | null | undefined): string {
  if (!key) return "—";
  return scale ? `${key} ${scale}` : key;
}
