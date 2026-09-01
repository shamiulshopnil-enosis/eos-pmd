import { describe, it, expect } from "vitest";
import { tierForScore, CAPSTONE_ATTRIBUTE_POOL, MAX_CAPSTONE_ATTRIBUTES } from "./attributes";

describe("tierForScore", () => {
  it("uses the spec cut-offs (Promoter >= 4.0, Detractor <= 2.5)", () => {
    expect(tierForScore(5)).toBe("promoter");
    expect(tierForScore(4.0)).toBe("promoter");
    expect(tierForScore(3.9)).toBe("neutral");
    expect(tierForScore(2.51)).toBe("neutral");
    expect(tierForScore(2.5)).toBe("detractor");
    expect(tierForScore(1)).toBe("detractor");
  });

  it("treats an unrated project as neutral", () => {
    expect(tierForScore(null)).toBe("neutral");
    expect(tierForScore(undefined)).toBe("neutral");
  });
});

describe("CAPSTONE_ATTRIBUTE_POOL", () => {
  it("has a non-empty option list for every tier", () => {
    for (const tier of ["promoter", "neutral", "detractor"] as const) {
      expect(CAPSTONE_ATTRIBUTE_POOL[tier].length).toBeGreaterThan(0);
    }
  });

  it("caps selections at 5", () => {
    expect(MAX_CAPSTONE_ATTRIBUTES).toBe(5);
  });
});
