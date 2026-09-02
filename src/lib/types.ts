// Plain serialized shapes returned by the data layer (src/lib/data.ts). Kept
// free of Mongoose types so server components, server actions and the derived
// metric helpers all work with the same simple objects — ids as strings, dates
// as real Date objects, missing values as null.

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

/** An entry in a vendor's reusable people directory (Team Management feature). */
export interface VendorMember {
  id: string;
  ownerUserId: string;
  email: string;
  name: string | null;
  role: VendorMemberRole;
  userId: string | null;
  invitePending: boolean; // derived: userId == null (person has not signed in yet)
  createdAt: Date;
  updatedAt: Date;
}

/** A named grouping of directory members, owned by one vendor. */
export interface Team {
  id: string;
  ownerUserId: string;
  name: string;
  memberIds: string[];
  members: VendorMember[];
  createdAt: Date;
  updatedAt: Date;
}

/** Global, shared client-company directory searched when creating a project. */
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
  invitePending: boolean;
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

/** The five Enosis Client Feedback Form delivery dimensions, each 1–5 (5 = best). */
export type MilestoneReview = Record<MilestoneReviewDimension, number | null>;

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string; // sanitized rich-text HTML
  url: string | null; // optional link (repo, demo, doc…)
  targetDate: Date | null;
  status: MilestoneStatus;
  assignees: MilestoneAssignee[]; // vendor teammates responsible for this milestone
  attachments: MilestoneAttachment[];
  ratings: MilestoneReview | null; // the five review dimensions
  rating: number | null; // average of `ratings`, drives all scoring
  comment: string | null;
  editRequestedByVendor: boolean;
  ratingSubmittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedByUserId: string | null; // which client contact submitted the rating
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
  attributes: string[]; // max 5, from the frozen tier pool
  testimonial: string;
  anonymous: boolean;
  tier: CapstoneTier; // frozen from finalScore at request time
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

// --- Composite shapes assembled by the data layer ---

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
