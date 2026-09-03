// Plain serialized shapes returned by the data layer (src/lib/data.ts). Kept
// free of Mongoose types so server components, server actions and the derived
// metric helpers all work with the same simple objects — ids as strings, dates
// as real Date objects, missing values as null.

export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
export type ProjectVisibility = "PRIVATE" | "PUBLIC";
export type ProjectType = "whole" | "milestone";
export type AdminStatus = "draft" | "pending_approval" | "published" | "rejected" | "edited" | "trashed";
export type ExecutionStatus = "ongoing" | "awaiting_completion" | "completed";
export type MilestoneStatus = "draft" | "sent" | "reviewed" | "rejected";
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
  | "PROJECT_PUBLISHED"
  | "MILESTONE_REJECTED"
  | "MILESTONE_REJECTION_EMAILED";

export type CompanyRole = "owner" | "admin" | "member";

/** One company (company-unification PR1). Delivering or receiving per project. */
export interface Company {
  id: string;
  name: string;
  claimed: boolean;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A person in an company. Replaces VendorMember + project clientContacts people. */
export interface CompanyMember {
  id: string;
  companyId: string;
  email: string;
  name: string | null;
  role: CompanyRole;
  userId: string | null;
  invitePending: boolean; // derived: userId == null
  createdAt: Date;
  updatedAt: Date;
}

/** Company search result — a public-ish view with the company's primary contact. */
export interface CompanySummary extends Company {
  primaryContact: { name: string | null; email: string } | null;
}

/** The current viewer's derived access to a project (company-unification PR2). */
export interface ProjectAccess {
  deliveryRole: CompanyRole | null;
  reviewRole: CompanyRole | null;
  assignedDelivery: boolean;
  assignedReview: boolean;
}

export interface Project {
  id: string;
  name: string;
  clientCompanyName: string;
  clientCompanyId: string | null;
  deliveringCompanyId: string | null;
  receivingCompanyId: string | null;
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

  vendorTeam: VendorTeamMember[]; // effective delivery people (resolved)
  clientContacts: ClientContact[]; // effective review people (resolved)
  assignedMemberIds: string[]; // delivering-company people on the project
  receivingMemberIds: string[]; // receiving-company people on the project
  myAccess?: ProjectAccess;
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
  startDate: Date | null;
  dueDate: Date | null;
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
  rejectedAt: Date | null;
  rejectedByUserId: string | null; // which client contact rejected it
  rejectedByName: string | null;
  rejectedByEmail: string | null;
  rejectionReason: string | null;
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
