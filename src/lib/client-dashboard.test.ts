import { describe, it, expect } from "vitest";
import {
  computeClientProjectRows,
  computeGivenSatisfaction,
  computeReviewWorkload,
  computeVendorBreakdown,
} from "./derived";
import type { Milestone, MilestoneReview, ProjectWithMilestones } from "./types";

const NOW = new Date("2026-06-01T00:00:00.000Z");
const daysFrom = (base: Date, n: number) => new Date(base.getTime() + n * 24 * 60 * 60 * 1000);

function milestone(p: Partial<Milestone>): Milestone {
  return {
    id: "m",
    projectId: "p",
    title: "M",
    description: "",
    url: null,
    startDate: null,
    dueDate: null,
    status: "draft",
    assignees: [],
    attachments: [],
    ratings: null,
    ratingNotes: null,
    reviewDraft: null,
    rating: null,
    comment: null,
    editRequestedByVendor: false,
    ratingSubmittedAt: null,
    reviewedAt: null,
    reviewedByUserId: null,
    reviewedByName: null,
    reviewedByEmail: null,
    sentAt: null,
    rejectedAt: null,
    rejectedByUserId: null,
    rejectedByName: null,
    rejectedByEmail: null,
    rejectionReason: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...p,
  };
}

const fiveDim = (v: number): MilestoneReview => ({
  deliverables: v,
  timeliness: v,
  understanding: v,
  planning: v,
  communication: v,
});

function reviewed(
  overrides: Partial<Milestone> & { rating: number },
): Milestone {
  return milestone({
    status: "reviewed",
    ratings: fiveDim(overrides.rating),
    reviewedAt: NOW,
    ...overrides,
  });
}

function project(p: Partial<ProjectWithMilestones>): ProjectWithMilestones {
  return {
    id: "p",
    name: "Project",
    clientCompanyName: "Client Co",
    clientCompanyId: null,
    deliveringCompanyId: null,
    receivingCompanyId: null,
    deliveringCompanyName: "Vendor Co",
    receivingCompanyName: "Client Co",
    clientContactName: null,
    clientEmail: "",
    services: null,
    description: null,
    startDate: null,
    expectedCompletionDate: null,
    actualCompletionDate: null,
    status: "ACTIVE",
    teamSize: null,
    engagementModel: null,
    internalRef: null,
    projectUrl: null,
    visibility: "PRIVATE",
    adminStatus: "published",
    executionStatus: "ongoing",
    minReviewThreshold: 0,
    completionRequestedAt: null,
    completionConfirmedByClient: false,
    completionForcedByAdmin: false,
    liveScore: null,
    reviewedMilestoneCount: 0,
    finalScore: null,
    vendorTeam: [],
    clientContacts: [],
    assignedMemberIds: [],
    receivingMemberIds: [],
    capstone: null,
    publicSummary: null,
    publicKeyChallenges: null,
    publicSolution: null,
    publicOutcome: null,
    publicTechStack: null,
    publicPlatforms: null,
    publicBudget: null,
    publicImageUrl: null,
    publicPerformanceConsent: false,
    publishedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    milestones: [],
    ...p,
  };
}

describe("computeReviewWorkload", () => {
  it("orders awaiting milestones oldest-sent first and flags stale ones", () => {
    const p = project({
      milestones: [
        milestone({ id: "fresh", status: "sent", sentAt: daysFrom(NOW, -2) }),
        milestone({ id: "stale", status: "sent", sentAt: daysFrom(NOW, -20) }),
        milestone({ id: "draft", status: "draft" }),
      ],
    });
    const w = computeReviewWorkload([p], null, NOW);
    expect(w.awaiting.map((a) => a.milestone.id)).toEqual(["stale", "fresh"]);
    expect(w.awaitingCount).toBe(2);
    expect(w.overdueToReview).toBe(1);
  });

  it("counts reviews the viewer personally submitted", () => {
    const p = project({
      milestones: [
        reviewed({ id: "a", rating: 4, reviewedByUserId: "u1" }),
        reviewed({ id: "b", rating: 5, reviewedByUserId: "u2" }),
        reviewed({ id: "c", rating: 3, reviewedByUserId: "u1" }),
      ],
    });
    const w = computeReviewWorkload([p], "u1", NOW);
    expect(w.reviewedByCompany).toBe(3);
    expect(w.reviewedByYou).toBe(2);
  });
});

describe("computeGivenSatisfaction", () => {
  it("averages ratings, the satisfaction rate and each dimension", () => {
    const p = project({
      milestones: [
        reviewed({ id: "a", rating: 5 }),
        reviewed({ id: "b", rating: 3 }),
        milestone({ id: "c", status: "sent" }),
      ],
    });
    const s = computeGivenSatisfaction([p]);
    expect(s.reviewedCount).toBe(2);
    expect(s.avgRating).toBe(4);
    expect(s.satisfactionRate).toBe(50); // one of two >= 4.0
    const deliverables = s.dimensionAverages.find((d) => d.key === "deliverables");
    expect(deliverables?.avg).toBe(4);
    expect(deliverables?.count).toBe(2);
  });

  it("is empty-safe", () => {
    const s = computeGivenSatisfaction([project({ milestones: [] })]);
    expect(s.avgRating).toBeNull();
    expect(s.satisfactionRate).toBeNull();
    expect(s.dimensionAverages.every((d) => d.avg === null)).toBe(true);
  });
});

describe("computeVendorBreakdown", () => {
  it("groups by delivering company and puts the weakest average first", () => {
    const strong = project({
      id: "p1",
      deliveringCompanyId: "v1",
      deliveringCompanyName: "Strong Vendor",
      milestones: [reviewed({ id: "a", rating: 5 })],
    });
    const weak = project({
      id: "p2",
      deliveringCompanyId: "v2",
      deliveringCompanyName: "Weak Vendor",
      milestones: [reviewed({ id: "b", rating: 2 })],
    });
    const rows = computeVendorBreakdown([strong, weak]);
    expect(rows.map((r) => r.name)).toEqual(["Weak Vendor", "Strong Vendor"]);
    expect(rows[0].reviewedMilestones).toBe(1);
    expect(rows[0].health).toBe("AT_RISK");
  });
});

describe("computeClientProjectRows", () => {
  it("surfaces overdue work first and computes on-time delivery", () => {
    const healthy = project({
      id: "ok",
      name: "Healthy",
      milestones: [
        reviewed({ id: "a", rating: 5, dueDate: daysFrom(NOW, -10), sentAt: daysFrom(NOW, -12) }),
      ],
    });
    const troubled = project({
      id: "bad",
      name: "Troubled",
      milestones: [
        milestone({ id: "late", status: "draft", dueDate: daysFrom(NOW, -3) }),
        milestone({ id: "sent-late", status: "sent", dueDate: daysFrom(NOW, -30), sentAt: daysFrom(NOW, -1) }),
      ],
    });
    const rows = computeClientProjectRows([healthy, troubled], NOW);
    expect(rows[0].id).toBe("bad");
    // both the past-due draft and the past-due sent milestone read as overdue
    expect(rows[0].overdueCount).toBe(2);
    expect(rows[0].awaitingReview).toBe(1);
    expect(rows[0].onTimePct).toBe(0); // sent-late delivered after its due date
    expect(rows[1].onTimePct).toBe(100);
    expect(rows[1].nextDue).toBeNull();
  });
});
