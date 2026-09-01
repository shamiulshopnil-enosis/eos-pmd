// Milestones plan, Phase 7. Local stand-in for the EOS-2508 adaptive attribute
// pools: a hardcoded pool split into three tiers, picked by the project's final
// milestone average. The real EOS-2508 pools would replace this module wholesale
// without touching its callers.

import type { CapstoneTier } from "./types";

/**
 * Spec §6.9 / §10 — tier cut-offs on the final milestone average. Fixed by the
 * spec: Promoter >= 4.0, Detractor <= 2.5, Neutral in between.
 */
export const CAPSTONE_TIER_THRESHOLDS = {
  promoterAtOrAbove: 4.0,
  detractorAtOrBelow: 2.5,
} as const;

/** The most attributes a client may pick for the capstone (spec §4.5, §6.9). */
export const MAX_CAPSTONE_ATTRIBUTES = 5;

/**
 * Freeze the tier from a project's `finalScore`. An unrated project (null final
 * score, e.g. force-completed with zero reviews) lands in the Neutral pool.
 */
export function tierForScore(score: number | null | undefined): CapstoneTier {
  if (score == null) return "neutral";
  if (score >= CAPSTONE_TIER_THRESHOLDS.promoterAtOrAbove) return "promoter";
  if (score <= CAPSTONE_TIER_THRESHOLDS.detractorAtOrBelow) return "detractor";
  return "neutral";
}

/** The attribute options offered for each tier. */
export const CAPSTONE_ATTRIBUTE_POOL: Record<CapstoneTier, string[]> = {
  promoter: [
    "Exceeded expectations",
    "Deep technical expertise",
    "Proactive communication",
    "Reliable delivery",
    "Strong ownership",
    "Great collaboration",
    "Flexible with change",
    "Would hire again",
  ],
  neutral: [
    "Met expectations",
    "Solid technical skills",
    "Responsive communication",
    "Delivered on scope",
    "Cooperative team",
    "Room to sharpen estimates",
  ],
  detractor: [
    "Fell short of expectations",
    "Communication needed work",
    "Missed deadlines",
    "Inconsistent quality",
    "Needed close oversight",
  ],
};
