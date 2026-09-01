import { describe, it, expect } from "vitest";
import {
  reviewedRatings,
  runningAverage,
  meetsPublicThreshold,
  projectCapabilityScore,
} from "./scoring";
import type { Milestone, ProjectWithMilestones } from "./types";

function milestone(status: Milestone["status"], rating: number | null): Milestone {
  return { status, rating } as Milestone;
}

function project(milestones: Milestone[], extra: Partial<ProjectWithMilestones> = {}): ProjectWithMilestones {
  return { milestones, liveScore: null, finalScore: null, ...extra } as ProjectWithMilestones;
}

describe("reviewedRatings", () => {
  it("keeps only reviewed milestones that carry a rating", () => {
    const ms = [
      milestone("reviewed", 4),
      milestone("reviewed", null), // reviewed but unrated — excluded
      milestone("sent", 5), // not reviewed — excluded
      milestone("draft", null),
      milestone("reviewed", 2),
    ];
    expect(reviewedRatings(ms)).toEqual([4, 2]);
  });
});

describe("runningAverage", () => {
  it("is null before the first review", () => {
    expect(runningAverage([milestone("draft", null), milestone("sent", null)])).toBeNull();
  });

  it("averages the reviewed ratings only", () => {
    const ms = [milestone("reviewed", 5), milestone("reviewed", 4), milestone("sent", 1)];
    expect(runningAverage(ms)).toBe(4.5);
  });
});

describe("meetsPublicThreshold", () => {
  it("is false with no milestones", () => {
    expect(meetsPublicThreshold(project([]))).toBe(false);
  });

  it("needs 1 review at 1–4 total milestones", () => {
    expect(meetsPublicThreshold(project([milestone("draft", null)]))).toBe(false); // 1 total, 0 reviewed
    expect(meetsPublicThreshold(project([milestone("reviewed", 5)]))).toBe(true); // 1 total, 1 reviewed

    const fourTotalOneReviewed = [
      milestone("reviewed", 4),
      milestone("draft", null),
      milestone("draft", null),
      milestone("sent", null),
    ];
    expect(meetsPublicThreshold(project(fourTotalOneReviewed))).toBe(true); // ceil(0.25*4) = 1
  });

  it("needs 2 reviews once total milestones reach 5", () => {
    const base = Array.from({ length: 8 }, () => milestone("draft", null));

    const oneReviewed = [milestone("reviewed", 4), ...base.slice(1)];
    expect(meetsPublicThreshold(project(oneReviewed))).toBe(false); // 1 < ceil(0.25*8) = 2

    const twoReviewed = [milestone("reviewed", 4), milestone("reviewed", 3), ...base.slice(2)];
    expect(meetsPublicThreshold(project(twoReviewed))).toBe(true);
  });
});

describe("projectCapabilityScore", () => {
  it("prefers finalScore, then liveScore, then a live recompute", () => {
    const ms = [milestone("reviewed", 4), milestone("reviewed", 2)];
    expect(projectCapabilityScore(project(ms, { finalScore: 5, liveScore: 4 }))).toBe(5);
    expect(projectCapabilityScore(project(ms, { finalScore: null, liveScore: 4 }))).toBe(4);
    expect(projectCapabilityScore(project(ms, { finalScore: null, liveScore: null }))).toBe(3);
  });
});
