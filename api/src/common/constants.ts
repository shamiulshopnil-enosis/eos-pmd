// Ported from the Next.js app's src/lib/constants.ts (PRD §13, §25; Milestones
// plan §11). Kept identical so scores computed here match what the UI expects.

export const VENDOR_NAME = "Waverley Software";

export const SATISFACTION_THRESHOLDS = {
  happyAtOrAbove: 4.0,
  // 3.0 < rating < 4.0 → Needs Attention; rating ≤ 3.0 → At Risk
  needsAttentionAbove: 3.0,
};

export const SATISFIED_RATING_THRESHOLD = 4.0;
export const AT_RISK_RATING_THRESHOLD = 3.0;
export const DUE_SOON_WINDOW_DAYS = 7;
export const MILESTONE_RATING_LABEL = "Overall";

// The five delivery dimensions of a milestone review (Enosis Client Feedback
// Form, items 1–5). Each answer is stored 1–5 (5 = best); `milestone.rating` is
// their average. Keep in sync with the Next app's src/lib/constants.ts.
export const MILESTONE_REVIEW_DIMENSION_KEYS = [
  "deliverables",
  "timeliness",
  "understanding",
  "planning",
  "communication",
] as const;

export const RATING_SELF_CORRECTION_HOURS = 48;
export const COMPLETION_TIMEOUT_DAYS = 7;
export const STALE_MILESTONE_REVIEW_DAYS = 7;

export function minReviewThreshold(totalMilestones: number): number {
  return Math.min(2, Math.ceil(0.25 * totalMilestones));
}

export const CLIENT_HEALTH_LABELS = {
  HAPPY: "Happy",
  NEEDS_ATTENTION: "Needs Attention",
  AT_RISK: "At Risk",
  NO_DATA: "No Ratings Yet",
} as const;

export type ClientHealth = keyof typeof CLIENT_HEALTH_LABELS;
