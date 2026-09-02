import { describe, it, expect } from "vitest";
import {
  canAccessDelivery,
  canAccessReview,
  canManageProject,
  canManageReview,
  canRateMilestone,
  canViewProject,
  deliveryLead,
  reviewLead,
} from "./permissions";
import type { ProjectAccess } from "./types";

const mk = (a: Partial<ProjectAccess>): { myAccess: ProjectAccess } => ({
  myAccess: {
    deliveryRole: null,
    reviewRole: null,
    assignedDelivery: false,
    assignedReview: false,
    ...a,
  },
});

const deliveryOwner = mk({ deliveryRole: "owner" });
const deliveryAdmin = mk({ deliveryRole: "admin" });
const deliveryMemberAssigned = mk({ deliveryRole: "member", assignedDelivery: true });
const deliveryMemberUnassigned = mk({ deliveryRole: "member" });
const reviewOwner = mk({ reviewRole: "owner" });
const reviewMemberAssigned = mk({ reviewRole: "member", assignedReview: true });
const reviewMemberUnassigned = mk({ reviewRole: "member" });
const outsider = mk({});

describe("delivery side", () => {
  it("owner/admin manage the project; members do not", () => {
    expect(canManageProject(deliveryOwner)).toBe(true);
    expect(canManageProject(deliveryAdmin)).toBe(true);
    expect(canManageProject(deliveryMemberAssigned)).toBe(false);
    expect(canManageProject(reviewOwner)).toBe(false);
  });

  it("assigned members (and leads) can act on milestones; unassigned members cannot", () => {
    expect(canAccessDelivery(deliveryOwner)).toBe(true);
    expect(canAccessDelivery(deliveryMemberAssigned)).toBe(true);
    expect(canAccessDelivery(deliveryMemberUnassigned)).toBe(false);
    expect(deliveryLead(deliveryMemberAssigned)).toBe(false);
  });
});

describe("review side", () => {
  it("any assigned receiving-company member (or lead) can rate", () => {
    expect(canRateMilestone(reviewOwner)).toBe(true);
    expect(canRateMilestone(reviewMemberAssigned)).toBe(true);
    expect(canRateMilestone(reviewMemberUnassigned)).toBe(false);
    expect(canRateMilestone(deliveryOwner)).toBe(false);
  });

  it("only receiving-company owner/admin confirm completion / manage review staffing", () => {
    expect(canManageReview(reviewOwner)).toBe(true);
    expect(canManageReview(reviewMemberAssigned)).toBe(false);
    expect(reviewLead(reviewOwner)).toBe(true);
  });
});

describe("visibility", () => {
  it("either side grants view; an outsider gets nothing", () => {
    expect(canViewProject(deliveryMemberAssigned)).toBe(true);
    expect(canViewProject(reviewMemberAssigned)).toBe(true);
    expect(canViewProject(outsider)).toBe(false);
    expect(canAccessReview(outsider)).toBe(false);
  });

  it("a project with no myAccess denies everything", () => {
    expect(canViewProject({})).toBe(false);
    expect(canManageProject({})).toBe(false);
  });
});
