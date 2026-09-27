// Frontend theory helpers (mirrored from the backend for instant UX).
// Kept in sync with apps/api/app/songs/theory.py.

export const NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

const ENHARMONIC: Record<string, string> = {
  "C#": "Db", Db: "C#",
  "D#": "Eb", Eb: "D#",
  "F#": "Gb", Gb: "F#",
  "G#": "Ab", Ab: "G#",
  "A#": "Bb", Bb: "A#",
};

const KEY_TO_SEMITONE: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3,
  E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8,
  Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

const CHORD_RE = /^([A-G])([#b]?)(m(?:aj)?(?:7|9|11|13)?|7|9|11|13|dim|aug|sus[24]|add9|6)?(\/[A-G][#b]?)?$/;

export interface ParsedChord {
  symbol: string;
  root: string;
  quality: string;
  bass: string | null;
  matched: boolean;
}

function _semitoneFor(note: string): number {
  return KEY_TO_SEMITONE[note] ?? 0;
}

export function parseChord(symbol: string): ParsedChord {
  const m = CHORD_RE.exec(symbol.trim());
  if (!m) return { symbol, root: "", quality: "", bass: null, matched: false };
  const [, letter, acc, quality, bassRaw] = m;
  const root = letter + (acc ?? "");
  let bass: string | null = null;
  if (bassRaw) bass = bassRaw.slice(1);
  return { symbol, root, quality: quality ?? "", bass, matched: true };
}

export function transposeSymbol(symbol: string, semitones: number, preferFlats = false): string {
  const p = parseChord(symbol);
  if (!p.matched || !p.root) return symbol;
  const names = preferFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  const newRoot = names[((_semitoneFor(p.root) + semitones) % 12 + 12) % 12];
  let newBass: string | null = null;
  if (p.bass && p.bass in KEY_TO_SEMITONE) {
    newBass = names[((_semitoneFor(p.bass) + semitones) % 12 + 12) % 12];
  }
  return `${newRoot}${p.quality}${newBass ? `/${newBass}` : ""}`;
}

export function transposeKey(key: string, semitones: number, preferFlats = false): string {
  const p = parseChord(key);
  if (!p.matched || !p.root) return key;
  const names = preferFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  return `${names[((_semitoneFor(p.root) + semitones) % 12 + 12) % 12]}${p.quality}`;
}

export function suggestCapo(originalKey: string, targetKey = "C"): number | null {
  const a = parseChord(originalKey);
  const b = parseChord(targetKey);
  if (!a.matched || !b.matched || !a.root || !b.root) return null;
  const delta = ((_semitoneFor(a.root) - _semitoneFor(b.root)) + 12) % 12;
  return delta <= 7 ? delta : null;
}

export const KEY_NAMES: readonly string[] = [
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
];

export function semitoneToName(s: number, preferFlats = false): string {
  const names = preferFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  return names[((s % 12) + 12) % 12];
}
