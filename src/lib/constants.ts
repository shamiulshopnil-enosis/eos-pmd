// Central place for the configurable thresholds called out in PRD §13 and §25,
// so they can be tuned later "without redesigning the feature".

/** Single-vendor MVP prototype — no auth/company model yet, so this stands in for "the vendor". */
export const VENDOR_NAME = "Waverley Software";

/** PRD §13 — Client Satisfaction Classification thresholds. */
export const SATISFACTION_THRESHOLDS = {
  happyAtOrAbove: 4.0,
  needsAttentionAtOrAbove: 3.0,
  // below needsAttentionAtOrAbove => At Risk
};

/** PRD §25 — "Client Satisfaction Rate" counts evaluations at or above this. */
export const SATISFIED_RATING_THRESHOLD = 4.0;

/** PRD §25 — "At-Risk Project" when the latest verified rating is below this. */
export const AT_RISK_RATING_THRESHOLD = 3.0;

/** A milestone becomes "Due Soon" inside this many days of its target date. */
export const DUE_SOON_WINDOW_DAYS = 7;

/** The single rating dimension a client gives each milestone (spec §6.4). */
export const MILESTONE_RATING_LABEL = "Quality of Deliverables";

/**
 * Milestones plan §11 default (TBD, "24 to 48 hours"): how long after submitting
 * a milestone rating the client can still edit it themselves, no request needed
 * (spec §6.5).
 */
export const RATING_SELF_CORRECTION_HOURS = 48;

/**
 * Spec §6.8 / §10: if the client has not confirmed completion within this many
 * days of the vendor's request, an admin can force-complete. Reuses the existing
 * EOS endorsement-link expiry window.
 */
export const COMPLETION_TIMEOUT_DAYS = 7;

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

// --- Milestones plan, Phase 1 ---

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  whole: "Whole Project",
  milestone: "Milestone Project",
};

export const ADMIN_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  published: "Published",
  rejected: "Rejected",
  edited: "Edited",
  trashed: "Trashed",
};

export const EXECUTION_STATUS_LABELS: Record<string, string> = {
  ongoing: "Ongoing",
  awaiting_completion: "Awaiting Completion",
  completed: "Completed",
};

/**
 * Milestones plan §11 default (TBD): the smaller of 2 reviewed milestones, or 25%
 * of the project's total milestone count, rounded up. Below this the public page
 * shows execution status only, no score.
 */
export function minReviewThreshold(totalMilestones: number): number {
  return Math.min(2, Math.ceil(0.25 * totalMilestones));
}

export const MILESTONE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "With Client",
  reviewed: "Reviewed",
};

export const CLIENT_HEALTH_LABELS = {
  HAPPY: "Happy",
  NEEDS_ATTENTION: "Needs Attention",
  AT_RISK: "At Risk",
  NO_DATA: "No Ratings Yet",
} as const;

export type ClientHealth = keyof typeof CLIENT_HEALTH_LABELS;

// Enum keys kept from the pre-milestone model; labels retargeted to milestone terms.
export const ACTIVITY_LABELS: Record<string, string> = {
  PROJECT_CREATED: "Project created",
  PROJECT_UPDATED: "Project updated",
  RELEASE_CREATED: "Milestone created",
  RELEASE_UPDATED: "Milestone updated",
  RELEASE_DELIVERED: "Milestone delivered",
  FEEDBACK_REQUESTED: "Sent for client review",
  FEEDBACK_REMINDER_SENT: "Client review reminder sent",
  FEEDBACK_RECEIVED: "Milestone reviewed",
  PROJECT_COMPLETED: "Project completed",
  PUBLICATION_REQUESTED: "Publication requested",
  PROJECT_PUBLISHED: "Project published",
};
