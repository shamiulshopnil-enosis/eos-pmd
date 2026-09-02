// Ported from the Next.js app's src/lib/data.ts serialization block — lean
// Mongoose docs -> the plain shapes in types.ts.

import type {
  Activity,
  CapstoneEndorsement,
  ClientCompany,
  ClientContact,
  Invitation,
  Milestone,
  Project,
  Team,
  VendorMember,
  VendorTeamMember,
} from "./types";

type Raw = Record<string, unknown>;

const str = (v: unknown): string | null => (v == null ? null : String(v));
const num = (v: unknown): number | null => (v == null ? null : Number(v));
const date = (v: unknown): Date | null => (v == null ? null : (v as Date));
const idList = (v: unknown): string[] =>
  Array.isArray(v) ? (v as unknown[]).map((x) => String(x)) : [];

function serializeEmbeddedVendorMember(v: Raw): VendorTeamMember {
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

export function serializeVendorMember(v: Raw): VendorMember {
  return {
    id: String(v._id),
    ownerUserId: String(v.ownerUserId),
    email: String(v.email ?? ""),
    name: str(v.name),
    role: (v.role as VendorMember["role"]) ?? "member",
    userId: v.userId == null ? null : String(v.userId),
    invitePending: v.userId == null,
    createdAt: date(v.createdAt) ?? new Date(0),
    updatedAt: date(v.updatedAt) ?? new Date(0),
  };
}

export function serializeTeam(t: Raw, members: VendorMember[] = []): Team {
  return {
    id: String(t._id),
    ownerUserId: String(t.ownerUserId),
    name: String(t.name ?? ""),
    memberIds: idList(t.memberIds),
    members,
    createdAt: date(t.createdAt) ?? new Date(0),
    updatedAt: date(t.updatedAt) ?? new Date(0),
  };
}

export function serializeClientCompany(c: Raw): ClientCompany {
  return {
    id: String(c._id),
    name: String(c.name ?? ""),
    contactName: str(c.contactName),
    contactEmail: String(c.contactEmail ?? ""),
    designation: (c.designation as string) ?? "",
    createdByUserId: c.createdByUserId == null ? null : String(c.createdByUserId),
    createdAt: date(c.createdAt) ?? new Date(0),
    updatedAt: date(c.updatedAt) ?? new Date(0),
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
    clientCompanyId: p.clientCompanyId == null ? null : String(p.clientCompanyId),
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
    vendorTeam: Array.isArray(p.vendorTeam)
      ? (p.vendorTeam as Raw[]).map(serializeEmbeddedVendorMember)
      : [],
    clientContacts: Array.isArray(p.clientContacts)
      ? (p.clientContacts as Raw[]).map(serializeClientContact)
      : [],
    assignedTeamIds: idList(p.assignedTeamIds),
    assignedMemberIds: idList(p.assignedMemberIds),
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

function serializeMilestoneAssignee(a: Raw): Milestone["assignees"][number] {
  return {
    userId: a.userId == null ? null : String(a.userId),
    email: String(a.email ?? ""),
    name: str(a.name),
    invitePending: a.userId == null,
  };
}

function serializeMilestoneAttachment(a: Raw): Milestone["attachments"][number] {
  return {
    id: String(a._id),
    fileId: String(a.fileId),
    filename: String(a.filename ?? ""),
    contentType: (a.contentType as string) ?? "application/octet-stream",
    size: Number(a.size ?? 0),
    uploadedByUserId: a.uploadedByUserId == null ? null : String(a.uploadedByUserId),
    uploadedByName: str(a.uploadedByName),
    uploadedByEmail: str(a.uploadedByEmail),
    uploadedAt: date(a.uploadedAt) ?? new Date(0),
  };
}

function serializeMilestoneReview(r: Raw | null | undefined): Milestone["ratings"] {
  if (!r) return null;
  return {
    deliverables: num(r.deliverables),
    timeliness: num(r.timeliness),
    understanding: num(r.understanding),
    planning: num(r.planning),
    communication: num(r.communication),
  };
}

export function serializeMilestone(m: Raw): Milestone {
  return {
    id: String(m._id),
    projectId: String(m.projectId),
    title: m.title as string,
    description: (m.description as string) ?? "",
    url: str(m.url),
    targetDate: date(m.targetDate),
    status: (m.status as Milestone["status"]) ?? "draft",
    assignees: Array.isArray(m.assignees)
      ? (m.assignees as Raw[]).map(serializeMilestoneAssignee)
      : [],
    attachments: Array.isArray(m.attachments)
      ? (m.attachments as Raw[]).map(serializeMilestoneAttachment)
      : [],
    ratings: serializeMilestoneReview(m.ratings as Raw | null | undefined),
    rating: num(m.rating),
    comment: str(m.comment),
    editRequestedByVendor: Boolean(m.editRequestedByVendor),
    ratingSubmittedAt: date(m.ratingSubmittedAt),
    reviewedAt: date(m.reviewedAt),
    reviewedByUserId: m.reviewedByUserId == null ? null : String(m.reviewedByUserId),
    reviewedByName: str(m.reviewedByName),
    reviewedByEmail: str(m.reviewedByEmail),
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
