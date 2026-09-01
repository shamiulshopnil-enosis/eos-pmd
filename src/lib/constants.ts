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

/** PRD §8 — a release becomes "Due Soon" inside this many days of its planned date. */
export const DUE_SOON_WINDOW_DAYS = 7;

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

export const RELEASE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  DELIVERED: "Delivered",
  FEEDBACK_REQUESTED: "Feedback Requested",
  REVIEWED: "Reviewed",
  CLOSED: "Closed",
};

export const RELEASE_STATUS_ORDER = [
  "DRAFT",
  "IN_PROGRESS",
  "DELIVERED",
  "FEEDBACK_REQUESTED",
  "REVIEWED",
  "CLOSED",
] as const;

export const CLIENT_HEALTH_LABELS = {
  HAPPY: "Happy",
  NEEDS_ATTENTION: "Needs Attention",
  AT_RISK: "At Risk",
  NO_DATA: "No Ratings Yet",
} as const;

export type ClientHealth = keyof typeof CLIENT_HEALTH_LABELS;

export const ACTIVITY_LABELS: Record<string, string> = {
  PROJECT_CREATED: "Project created",
  PROJECT_UPDATED: "Project updated",
  RELEASE_CREATED: "Release created",
  RELEASE_UPDATED: "Release updated",
  RELEASE_DELIVERED: "Release delivered",
  FEEDBACK_REQUESTED: "Feedback requested",
  FEEDBACK_REMINDER_SENT: "Feedback reminder sent",
  FEEDBACK_RECEIVED: "Feedback received",
  PROJECT_COMPLETED: "Project completed",
  PUBLICATION_REQUESTED: "Publication requested",
  PROJECT_PUBLISHED: "Project published",
};

export const RATING_CATEGORIES = [
  { key: "overallSatisfaction", label: "Overall Satisfaction", required: true },
  { key: "qualityOfDeliverables", label: "Quality of Deliverables", required: true },
  { key: "timeliness", label: "Timeliness", required: true },
  { key: "communication", label: "Communication & Collaboration", required: true },
  { key: "understandingOfRequirements", label: "Understanding of Requirements", required: false },
  { key: "deliveryAgainstScope", label: "Delivery Against Agreed Scope", required: false },
  { key: "wouldContinue", label: "Would You Continue Working With This Vendor?", required: false },
] as const;
