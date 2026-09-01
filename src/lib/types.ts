// Plain serialized shapes returned by the data layer (src/lib/data.ts). Kept
// free of Mongoose types so server components, server actions and the derived
// metric helpers all work with the same simple objects — ids as strings, dates
// as real Date objects, missing values as null.

export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
export type ProjectVisibility = "PRIVATE" | "PUBLIC";
export type ReleaseStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "FEEDBACK_REQUESTED"
  | "REVIEWED"
  | "CLOSED";
export type FeedbackRequestStatus = "PENDING" | "COMPLETED";
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

export interface Project {
  id: string;
  name: string;
  clientCompanyName: string;
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

export interface Release {
  id: string;
  projectId: string;
  name: string;
  versionLabel: string | null;
  description: string | null;
  objectives: string | null;
  deliverables: string | null;
  plannedDeliveryDate: Date | null;
  actualDeliveryDate: Date | null;
  startDate: Date | null;
  status: ReleaseStatus;
  demoUrl: string | null;
  internalNotes: string | null;
  clientFacingNotes: string | null;
  teamSize: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackRequest {
  id: string;
  releaseId: string;
  clientEmail: string;
  token: string;
  status: FeedbackRequestStatus;
  sentAt: Date;
  remindersSent: number;
  completedAt: Date | null;

  overallSatisfaction: number | null;
  qualityOfDeliverables: number | null;
  timeliness: number | null;
  communication: number | null;
  understandingOfRequirements: number | null;
  deliveryAgainstScope: number | null;
  wouldContinue: number | null;
  comments: string | null;
  reviewerEmail: string | null;
  verified: boolean;
  flagged: boolean;
}

export interface Activity {
  id: string;
  projectId: string;
  releaseId: string | null;
  type: ActivityType;
  message: string;
  createdAt: Date;
}

// --- Composite shapes assembled by the data layer ---

export type ReleaseWithFeedback = Release & {
  feedbackRequest: FeedbackRequest | null;
};

export type ProjectWithReleases = Project & {
  releases: ReleaseWithFeedback[];
};

export type ActivityWithReleaseName = Activity & {
  release: { name: string } | null;
};

export type RecentActivity = Activity & {
  project: { id: string; name: string };
};

export type ReleaseWithProject = ReleaseWithFeedback & {
  project: Pick<Project, "id" | "name" | "clientCompanyName">;
};

export type ReleaseWithFullProject = ReleaseWithFeedback & {
  project: Project;
};

export type FeedbackRequestWithContext = FeedbackRequest & {
  release: Release & { project: Project };
};
