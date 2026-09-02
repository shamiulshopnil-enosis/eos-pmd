// Ported from the Next.js app's src/lib/data.ts serialization block — lean
// Mongoose docs -> the plain shapes in types.ts.

import type {
  Activity,
  CapstoneEndorsement,
  ClientContact,
  Invitation,
  Milestone,
  Project,
  VendorTeamMember,
} from "./types";

type Raw = Record<string, unknown>;

const str = (v: unknown): string | null => (v == null ? null : String(v));
const num = (v: unknown): number | null => (v == null ? null : Number(v));
const date = (v: unknown): Date | null => (v == null ? null : (v as Date));

function serializeVendorMember(v: Raw): VendorTeamMember {
  return {
    userId: v.userId == null ? null : String(v.userId),
    email: String(v.email ?? ""),
    name: str(v.name),
    role: (v.role as VendorTeamMember["role"]) ?? "member",
    invitePending: Boolean(v.invitePending),
  };
}

function serializeClientContact(c: Raw): ClientContact {
  return {
    userId: c.userId == null ? null : String(c.userId),
    email: String(c.email ?? ""),
    name: str(c.name),
    designation: (c.designation as string) ?? "",
    role: (c.role as ClientContact["role"]) ?? "collaborator",
    invitePending: Boolean(c.invitePending),
  };
}

function serializeCapstone(c: Raw | null | undefined): CapstoneEndorsement | null {
  if (!c) return null;
  return {
    requested: Boolean(c.requested),
    submitted: Boolean(c.submitted),
    attributes: Array.isArray(c.attributes) ? (c.attributes as unknown[]).map(String) : [],
    testimonial: (c.testimonial as string) ?? "",
    anonymous: Boolean(c.anonymous),
    tier: (c.tier as CapstoneEndorsement["tier"]) ?? "neutral",
    requestedAt: date(c.requestedAt),
    submittedAt: date(c.submittedAt),
  };
}

export function serializeInvitation(i: Raw): Invitation {
  return {
    id: String(i._id),
    email: String(i.email ?? ""),
    projectId: String(i.projectId),
    kind: i.kind as Invitation["kind"],
    proposedRole: i.proposedRole as Invitation["proposedRole"],
    designation: str(i.designation),
    invitedByUserId: i.invitedByUserId == null ? null : String(i.invitedByUserId),
    status: (i.status as Invitation["status"]) ?? "pending",
    createdAt: date(i.createdAt) ?? new Date(0),
  };
}

export function serializeProject(p: Raw): Project {
  return {
    id: String(p._id),
    name: p.name as string,
    clientCompanyName: p.clientCompanyName as string,
    clientContactName: str(p.clientContactName),
    clientEmail: p.clientEmail as string,
    services: str(p.services),
    description: str(p.description),
    startDate: date(p.startDate),
    expectedCompletionDate: date(p.expectedCompletionDate),
    actualCompletionDate: date(p.actualCompletionDate),
    status: (p.status as Project["status"]) ?? "ACTIVE",
    teamSize: num(p.teamSize),
    engagementModel: str(p.engagementModel),
    internalRef: str(p.internalRef),
    projectUrl: str(p.projectUrl),
    visibility: (p.visibility as Project["visibility"]) ?? "PRIVATE",
    projectType: (p.projectType as Project["projectType"]) ?? "whole",
    adminStatus: (p.adminStatus as Project["adminStatus"]) ?? "draft",
    executionStatus: (p.executionStatus as Project["executionStatus"]) ?? "ongoing",
    minReviewThreshold: Number(p.minReviewThreshold ?? 0),
    completionRequestedAt: date(p.completionRequestedAt),
    completionConfirmedByClient: Boolean(p.completionConfirmedByClient),
    completionForcedByAdmin: Boolean(p.completionForcedByAdmin),
    liveScore: num(p.liveScore),
    reviewedMilestoneCount: Number(p.reviewedMilestoneCount ?? 0),
    finalScore: num(p.finalScore),
    vendorTeam: Array.isArray(p.vendorTeam) ? (p.vendorTeam as Raw[]).map(serializeVendorMember) : [],
    clientContacts: Array.isArray(p.clientContacts)
      ? (p.clientContacts as Raw[]).map(serializeClientContact)
      : [],
    capstone: serializeCapstone(p.capstone as Raw | null | undefined),
    publicSummary: str(p.publicSummary),
    publicKeyChallenges: str(p.publicKeyChallenges),
    publicSolution: str(p.publicSolution),
    publicOutcome: str(p.publicOutcome),
    publicTechStack: str(p.publicTechStack),
    publicPlatforms: str(p.publicPlatforms),
    publicBudget: str(p.publicBudget),
    publicImageUrl: str(p.publicImageUrl),
    publicPerformanceConsent: Boolean(p.publicPerformanceConsent),
    publishedAt: date(p.publishedAt),
    createdAt: date(p.createdAt) ?? new Date(0),
    updatedAt: date(p.updatedAt) ?? new Date(0),
  };
}

export function serializeMilestone(m: Raw): Milestone {
  return {
    id: String(m._id),
    projectId: String(m.projectId),
    title: m.title as string,
    description: (m.description as string) ?? "",
    targetDate: date(m.targetDate),
    status: (m.status as Milestone["status"]) ?? "draft",
    rating: num(m.rating),
    comment: str(m.comment),
    editRequestedByVendor: Boolean(m.editRequestedByVendor),
    ratingSubmittedAt: date(m.ratingSubmittedAt),
    reviewedAt: date(m.reviewedAt),
    sentAt: date(m.sentAt),
    createdAt: date(m.createdAt) ?? new Date(0),
    updatedAt: date(m.updatedAt) ?? new Date(0),
  };
}

export function serializeActivity(a: Raw): Activity {
  return {
    id: String(a._id),
    projectId: String(a.projectId),
    milestoneId: a.milestoneId == null ? null : String(a.milestoneId),
    type: a.type as Activity["type"],
    message: a.message as string,
    createdAt: date(a.createdAt) ?? new Date(0),
  };
}
