// Plain serialized shapes returned by the API. Ported verbatim from the Next.js
// app's src/lib/types.ts so both sides agree on the wire format. Dates are real
// Date objects here; they go over HTTP as ISO strings and the Next client
// revives them.

export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
export type ProjectVisibility = "PRIVATE" | "PUBLIC";
export type ProjectType = "whole" | "milestone";
export type AdminStatus = "draft" | "pending_approval" | "published" | "rejected" | "edited" | "trashed";
export type ExecutionStatus = "ongoing" | "awaiting_completion" | "completed";
export type MilestoneStatus = "draft" | "sent" | "reviewed";
export type CapstoneTier = "promoter" | "neutral" | "detractor";
export type VendorTeamRole = "owner" | "member";
export type ClientContactRole = "primary" | "collaborator";
export type InvitationKind = "vendor_team" | "client_contact";
export type InvitationRole = VendorTeamRole | ClientContactRole;
export type InvitationStatus = "pending" | "accepted" | "revoked";
export type ActivityType =
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "RELEASE_CREATED"
  | "RELEASE_UPDATED"
  | "RELEASE_DELIVERED"
  | "FEEDBACK_REQUESTED"
  | "FEEDBACK_REMINDER_SENT"
  | "FEEDBACK_RECEIVED"
  | "PROJECT_COMPLETED"
  | "PUBLICATION_REQUESTED"
  | "PROJECT_PUBLISHED";

export type VendorMemberRole = "owner" | "member";

export interface VendorMember {
  id: string;
  ownerUserId: string;
  email: string;
  name: string | null;
  role: VendorMemberRole;
  userId: string | null;
  invitePending: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  ownerUserId: string;
  name: string;
  memberIds: string[];
  members: VendorMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientCompany {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string;
  designation: string;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  clientCompanyName: string;
  clientCompanyId: string | null;
  clientContactName: string | null;
  clientEmail: string;
  services: string | null;
  description: string | null;
  startDate: Date | null;
  expectedCompletionDate: Date | null;
  actualCompletionDate: Date | null;
  status: ProjectStatus;
  teamSize: number | null;
  engagementModel: string | null;
  internalRef: string | null;
  projectUrl: string | null;
  visibility: ProjectVisibility;

  projectType: ProjectType;
  adminStatus: AdminStatus;
  executionStatus: ExecutionStatus;
  minReviewThreshold: number;
  completionRequestedAt: Date | null;
  completionConfirmedByClient: boolean;
  completionForcedByAdmin: boolean;
  liveScore: number | null;
  reviewedMilestoneCount: number;
  finalScore: number | null;

  vendorTeam: VendorTeamMember[];
  clientContacts: ClientContact[];
  assignedTeamIds: string[];
  assignedMemberIds: string[];
  capstone: CapstoneEndorsement | null;

  publicSummary: string | null;
  publicKeyChallenges: string | null;
  publicSolution: string | null;
  publicOutcome: string | null;
  publicTechStack: string | null;
  publicPlatforms: string | null;
  publicBudget: string | null;
  publicImageUrl: string | null;
  publicPerformanceConsent: boolean;
  publishedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface MilestoneAssignee {
  userId: string | null;
  email: string;
  name: string | null;
  invitePending: boolean; // derived: userId == null
}

export interface MilestoneAttachment {
  id: string;
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedByUserId: string | null;
  uploadedByName: string | null;
  uploadedByEmail: string | null;
  uploadedAt: Date;
}

export type MilestoneReviewDimension =
  | "deliverables"
  | "timeliness"
  | "understanding"
  | "planning"
  | "communication";

export type MilestoneReview = Record<MilestoneReviewDimension, number | null>;

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  url: string | null;
  targetDate: Date | null;
  status: MilestoneStatus;
  assignees: MilestoneAssignee[];
  attachments: MilestoneAttachment[];
  ratings: MilestoneReview | null; // the five Enosis feedback dimensions, 1–5
  rating: number | null; // average of `ratings`, drives all scoring
  comment: string | null;
  editRequestedByVendor: boolean;
  ratingSubmittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  reviewedByEmail: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorTeamMember {
  userId: string | null;
  email: string;
  name: string | null;
  role: VendorTeamRole;
  invitePending: boolean;
}

export interface ClientContact {
  userId: string | null;
  email: string;
  name: string | null;
  designation: string;
  role: ClientContactRole;
  invitePending: boolean;
}

export interface CapstoneEndorsement {
  requested: boolean;
  submitted: boolean;
  attributes: string[];
  testimonial: string;
  anonymous: boolean;
  tier: CapstoneTier;
  requestedAt: Date | null;
  submittedAt: Date | null;
}

export interface Invitation {
  id: string;
  email: string;
  projectId: string;
  kind: InvitationKind;
  proposedRole: InvitationRole;
  designation: string | null;
  invitedByUserId: string | null;
  status: InvitationStatus;
  createdAt: Date;
}

export interface Activity {
  id: string;
  projectId: string;
  milestoneId: string | null;
  type: ActivityType;
  message: string;
  createdAt: Date;
}

export type ProjectWithMilestones = Project & {
  milestones: Milestone[];
};

export type ActivityWithMilestoneName = Activity & {
  milestone: { title: string } | null;
};

export type RecentActivity = Activity & {
  project: { id: string; name: string };
};

export type MilestoneWithProject = Milestone & {
  project: Pick<Project, "id" | "name" | "clientCompanyName">;
};

export type MilestoneWithFullProject = Milestone & {
  project: Project;
};

// --- Identity ---

export type UserRole = "buyer" | "vendor" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}
