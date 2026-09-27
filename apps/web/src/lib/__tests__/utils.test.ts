import { describe, it, expect } from "vitest";
import { cn, formatDuration, formatNumber, initials } from "@/lib/utils";

describe("cn", () => {
  it("merges and dedupes classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });
});

describe("formatDuration", () => {
  it("formats seconds as mm:ss", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(0)).toBe("0:00");
  });
  it("returns em-dash for nullish", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined)).toBe("—");
  });
});

describe("formatNumber", () => {
  it("rounds to the requested digit count", () => {
    expect(formatNumber(3.14159, 2)).toBe("3.14");
  });
});

describe("initials", () => {
  it("handles single names", () => {
    expect(initials("Cher")).toBe("CH");
  });
  it("uses first and last", () => {
    expect(initials("John Doe")).toBe("JD");
  });
  it("returns ? for nullish", () => {
    expect(initials(null)).toBe("?");
    expect(initials("")).toBe("?");
  });
});
