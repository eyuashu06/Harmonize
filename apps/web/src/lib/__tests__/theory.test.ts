import { describe, it, expect } from "vitest";
import { parseChord, transposeSymbol, transposeKey, suggestCapo } from "@/lib/theory";

describe("parseChord", () => {
  it("parses a simple major", () => {
    expect(parseChord("C")).toEqual({
      symbol: "C",
      root: "C",
      quality: "",
      bass: null,
      matched: true,
    });
  });

  it("parses minor", () => {
    const p = parseChord("Am");
    expect(p.root).toBe("A");
    expect(p.quality).toBe("m");
    expect(p.matched).toBe(true);
  });

  it("parses major seventh", () => {
    const p = parseChord("Cmaj7");
    expect(p.root).toBe("C");
    expect(p.quality).toBe("maj7");
  });

  it("parses slash chord with sharp bass", () => {
    const p = parseChord("F#m7/A#");
    expect(p.root).toBe("F#");
    expect(p.bass).toBe("A#");
  });

  it("returns matched=false for garbage", () => {
    const p = parseChord("Hwat");
    expect(p.matched).toBe(false);
  });

  it("preserves the user's spelling (F# stays F#)", () => {
    expect(parseChord("F#m").root).toBe("F#");
    expect(parseChord("Bbmaj7").root).toBe("Bb");
  });
});

describe("transposeSymbol", () => {
  it.each([
    ["C", 2, "D"],
    ["G", 5, "C"],
    ["F", 1, "F#"],
    ["Bb", 2, "C"],
    ["Em7", 3, "Gm7"],
    ["F#m", -1, "Fm"],
  ])("transpose %s by %i = %s", (input, semitones, expected) => {
    expect(transposeSymbol(input, semitones)).toBe(expected);
  });

  it("uses flats when requested", () => {
    expect(transposeSymbol("C", 1, true)).toBe("Db");
  });

  it("transposes slash chords correctly", () => {
    // F#m/A# up 2 semitones -> G#m/C
    expect(transposeSymbol("F#m/A#", 2)).toBe("G#m/C");
  });

  it("passes through unknown symbols", () => {
    expect(transposeSymbol("Hwat", 3)).toBe("Hwat");
  });
});

describe("transposeKey", () => {
  it("transposes major keys", () => {
    expect(transposeKey("G", 2)).toBe("A");
  });
  it("transposes minor keys", () => {
    expect(transposeKey("Am", 3)).toBe("Cm");
  });
  it("passes through unknown keys", () => {
    expect(transposeKey("Hwat", 3)).toBe("Hwat");
  });
});

describe("suggestCapo", () => {
  it("suggests capo for G using C shapes", () => {
    expect(suggestCapo("G", "C")).toBe(7);
  });
  it("suggests capo for D using C shapes", () => {
    expect(suggestCapo("D", "C")).toBe(2);
  });
  it("returns 0 when keys already match", () => {
    expect(suggestCapo("C", "C")).toBe(0);
  });
  it("returns null for invalid input", () => {
    expect(suggestCapo("Hwat")).toBe(null);
  });
});
