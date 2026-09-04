// Central place for the configurable thresholds called out in PRD §13 and §25,
// so they can be tuned later "without redesigning the feature".

/** Display label for the vendor workspace header. Per-project people now live on
 *  `Project.vendorTeam` (Milestones plan, Phase 3); this is cosmetic only. */
export const VENDOR_NAME = "Waverley Software";

/**
 * PRD §13 — Client Satisfaction Classification thresholds.
 *  - rating ≥ 4.0            → Happy
 *  - 3.0 < rating < 4.0      → Needs Attention
 *  - rating ≤ 3.0            → At Risk
 */
export const SATISFACTION_THRESHOLDS = {
  happyAtOrAbove: 4.0,
  needsAttentionAbove: 3.0,
};

/** PRD §25 — "Client Satisfaction Rate" counts evaluations at or above this. */
export const SATISFIED_RATING_THRESHOLD = 4.0;

/** PRD §25 — "At-Risk Project" when the latest verified rating is below this. */
export const AT_RISK_RATING_THRESHOLD = 3.0;

/** A milestone becomes "Due Soon" inside this many days of its target date. */
export const DUE_SOON_WINDOW_DAYS = 7;

/** Label for the milestone's overall score (the average of the review dimensions). */
export const MILESTONE_RATING_LABEL = "Overall";

/**
 * The client milestone review — the five delivery dimensions ported from the
 * Enosis "Client Feedback Form" (items 1–5). Each `options[0]` scores 5 (best)
 * down to `options[4]` scoring 1. `milestone.rating` is the average of the five,
 * so all existing scoring keeps working off one number.
 */
export const MILESTONE_REVIEW_DIMENSIONS = [
  {
    key: "deliverables",
    label: "Quality of deliverables",
    question:
      "How would you evaluate the quality of the deliverables provided in this milestone?",
    options: ["Very Good", "Good", "Satisfactory", "Poor", "Very Poor"],
  },
  {
    key: "timeliness",
    label: "Timeliness & reliability",
    question:
      "How satisfied are you with the timeliness and reliability of the team in meeting this milestone's deadlines as expected?",
    options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"],
  },
  {
    key: "understanding",
    label: "Understanding of requirements",
    question:
      "How would you rate the team's understanding of your project's requirements: your product, target users, business goals, vision, and the broader industry you operate in?",
    options: ["Very Good", "Good", "Satisfactory", "Poor", "Very Poor"],
  },
  {
    key: "planning",
    label: "Planning & management",
    question:
      "How would you assess the quality of project planning and management, including the accuracy of task estimates compared to your expectations?",
    options: ["Very Good", "Good", "Satisfactory", "Poor", "Very Poor"],
  },
  {
    key: "communication",
    label: "Communication",
    question:
      "Please rate the team's communication skills, including clarity, responsiveness, and consistency.",
    options: ["Very Good", "Good", "Satisfactory", "Poor", "Very Poor"],
  },
] as const;

export type MilestoneReviewDimensionKey = (typeof MILESTONE_REVIEW_DIMENSIONS)[number]["key"];

/** Map a stored 1–5 score back to its label for a given dimension. */
export function reviewScoreLabel(key: MilestoneReviewDimensionKey, score: number | null): string {
  if (score == null) return "—";
  const dim = MILESTONE_REVIEW_DIMENSIONS.find((d) => d.key === key);
  if (!dim) return String(score);
  const idx = 5 - Math.round(score); // 5 -> options[0]
  return dim.options[idx] ?? String(score);
}

// ---------------------------------------------------------------------------
// Milestones plan §11 — TBD numbers, each with a working default so a later
// decision is a one-line change here. (Capstone tier cut-offs are fixed by the
// spec and live in ./attributes.)
// ---------------------------------------------------------------------------

/**
 * §11 default (TBD, "24 to 48 hours"): how long after submitting a milestone
 * rating the client can still edit it themselves, no request needed (spec §6.5).
 */
export const RATING_SELF_CORRECTION_HOURS = 48;

/**
 * Spec §6.8 / §10 (fixed by spec, still a named constant): if the client has not
 * confirmed completion within this many days of the vendor's request, an admin
 * can force-complete. Reuses the existing EOS endorsement-link expiry window.
 */
export const COMPLETION_TIMEOUT_DAYS = 7;

/**
 * §11 default (TBD): a milestone that has been with the client for review longer
 * than this raises a dashboard nudge (spec §8-style delivery signal).
 */
export const STALE_MILESTONE_REVIEW_DAYS = 7;

/**
 * §11 default (TBD): the smaller of 2 reviewed milestones, or 25% of the
 * project's total milestone count, rounded up. Below this the public page shows
 * execution status only, no score (spec §6.7).
 */
export function minReviewThreshold(totalMilestones: number): number {
  return Math.min(2, Math.ceil(0.25 * totalMilestones));
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
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

export const MILESTONE_STATUS_LABELS: Record<string, string> = {
  draft: "Ongoing",
  overdue: "Overdue",
  sent: "Review Requested",
  reviewed: "Reviewed",
  rejected: "Rejected",
};

// --- Milestones plan, Phase 7 ---

/** Spec §6.9 — capstone tier, frozen from the project's final milestone average. */
export const CAPSTONE_TIER_LABELS: Record<string, string> = {
  promoter: "Promoter",
  neutral: "Neutral",
  detractor: "Detractor",
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
  MILESTONE_REJECTED: "Milestone rejected by client",
  MILESTONE_REJECTION_EMAILED: "Rejection emailed to the delivery team",
};
