// Ported from the Next.js app's src/lib/attributes.ts (Milestones plan, Phase 7).

import type { CapstoneTier } from "./types";

export const CAPSTONE_TIER_THRESHOLDS = {
  promoterAtOrAbove: 4.0,
  detractorAtOrBelow: 2.5,
} as const;

export const MAX_CAPSTONE_ATTRIBUTES = 5;

export function tierForScore(score: number | null | undefined): CapstoneTier {
  if (score == null) return "neutral";
  if (score >= CAPSTONE_TIER_THRESHOLDS.promoterAtOrAbove) return "promoter";
  if (score <= CAPSTONE_TIER_THRESHOLDS.detractorAtOrBelow) return "detractor";
  return "neutral";
}

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
