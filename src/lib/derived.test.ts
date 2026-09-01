import { describe, it, expect } from "vitest";
import { getMilestoneFlag, isMilestoneReviewed, classifyHealth, computeAlerts } from "./derived";
import type { Milestone, ProjectWithMilestones } from "./types";

const NOW = new Date("2026-06-01T00:00:00.000Z");
const daysFrom = (base: Date, n: number) => new Date(base.getTime() + n * 24 * 60 * 60 * 1000);

function milestone(p: Partial<Milestone>): Milestone {
  return {
    id: "m",
    projectId: "p",
    title: "M",
    description: "",
    targetDate: null,
    status: "draft",
    rating: null,
    comment: null,
    editRequestedByVendor: false,
    ratingSubmittedAt: null,
    reviewedAt: null,
    sentAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...p,
  };
}

describe("getMilestoneFlag", () => {
  it("flags a lapsed target date while draft or sent", () => {
    expect(getMilestoneFlag(milestone({ status: "draft", targetDate: daysFrom(NOW, -1) }), NOW)).toBe("OVERDUE");
    expect(getMilestoneFlag(milestone({ status: "sent", targetDate: daysFrom(NOW, -1) }), NOW)).toBe("OVERDUE");
  });

  it("only shows DUE_SOON for a draft inside the window", () => {
    expect(getMilestoneFlag(milestone({ status: "draft", targetDate: daysFrom(NOW, 3) }), NOW)).toBe("DUE_SOON");
    // a sent milestone in the same window reads as awaiting review, not due soon
    expect(getMilestoneFlag(milestone({ status: "sent", targetDate: daysFrom(NOW, 3) }), NOW)).toBe("AWAITING_REVIEW");
  });

  it("falls back to AWAITING_REVIEW / null", () => {
    expect(getMilestoneFlag(milestone({ status: "sent", targetDate: null }), NOW)).toBe("AWAITING_REVIEW");
    expect(getMilestoneFlag(milestone({ status: "draft", targetDate: daysFrom(NOW, 30) }), NOW)).toBeNull();
    expect(getMilestoneFlag(milestone({ status: "reviewed", rating: 5, targetDate: daysFrom(NOW, -30) }), NOW)).toBeNull();
  });
});

describe("isMilestoneReviewed", () => {
  it("requires both the reviewed status and a rating", () => {
    expect(isMilestoneReviewed(milestone({ status: "reviewed", rating: 4 }))).toBe(true);
    expect(isMilestoneReviewed(milestone({ status: "reviewed", rating: null }))).toBe(false);
    expect(isMilestoneReviewed(milestone({ status: "sent", rating: 4 }))).toBe(false);
    expect(isMilestoneReviewed(null)).toBe(false);
  });
});

describe("classifyHealth", () => {
  it("buckets the rating", () => {
    expect(classifyHealth(null)).toBe("NO_DATA");
    expect(classifyHealth(4)).toBe("HAPPY");
    expect(classifyHealth(3)).toBe("NEEDS_ATTENTION");
    expect(classifyHealth(2.5)).toBe("AT_RISK");
  });
});

describe("computeAlerts", () => {
  function project(p: Partial<ProjectWithMilestones>): ProjectWithMilestones {
    return {
      id: "p1",
      name: "Demo",
      milestones: [],
      executionStatus: "ongoing",
      completionRequestedAt: null,
      liveScore: null,
      ...p,
    } as ProjectWithMilestones;
  }

  it("raises overdue, stale-review, completion-timeout and at-risk signals", () => {
    const projects = [
      project({
        id: "p1",
        name: "Overdue + stale",
        milestones: [
          milestone({ status: "draft", targetDate: daysFrom(NOW, -2) }),
          milestone({ status: "sent", sentAt: daysFrom(NOW, -10) }),
        ],
      }),
      project({
        id: "p2",
        name: "Stuck completion",
        executionStatus: "awaiting_completion",
        completionRequestedAt: daysFrom(NOW, -9),
      }),
      project({ id: "p3", name: "Low score", liveScore: 2.4 }),
    ];

    const ids = computeAlerts(projects, NOW).map((a) => a.id);
    expect(ids).toContain("overdue");
    expect(ids).toContain("awaiting-review");
    expect(ids).toContain("completion-timeout-p2");
    expect(ids).toContain("at-risk-p3");
  });

  it("stays quiet when nothing is wrong", () => {
    const projects = [
      project({
        milestones: [milestone({ status: "sent", sentAt: daysFrom(NOW, -1) })],
        liveScore: 4.5,
      }),
    ];
    expect(computeAlerts(projects, NOW)).toHaveLength(0);
  });
});
