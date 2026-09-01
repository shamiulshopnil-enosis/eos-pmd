// Milestones plan, Phase 5. Pure scoring helpers over the plain shapes in
// types.ts, so pages, the recompute in actions.ts, and (later) unit tests all
// share one definition of "the score".

import { minReviewThreshold } from "./constants";
import type { ProjectWithMilestones } from "./types";

// Loose enough to accept both the serialized Milestone shape and lean Mongoose docs.
type RatedMilestone = { status: string; rating?: number | null };

/** Ratings from reviewed milestones only (spec §6.6). */
export function reviewedRatings(milestones: RatedMilestone[]): number[] {
  return milestones
    .filter((m) => m.status === "reviewed" && m.rating != null)
    .map((m) => m.rating as number);
}

/** Running average across reviewed milestones; null until the first review (spec §6.6). */
export function runningAverage(milestones: RatedMilestone[]): number | null {
  const ratings = reviewedRatings(milestones);
  if (ratings.length === 0) return null;
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

/**
 * Spec §6.7: the running average only becomes publicly visible once a minimum
 * number of milestones have been reviewed (smaller of 2 or 25% of total).
 */
export function meetsPublicThreshold(project: ProjectWithMilestones): boolean {
  const total = project.milestones.length;
  if (total === 0) return false;
  return reviewedRatings(project.milestones).length >= minReviewThreshold(total);
}

/**
 * PCS stand-in (spec §6.6, §10). For a milestone project this is the live
 * running average while ongoing, the locked final score once completed. Prefers
 * the maintained Project fields, falls back to a live recompute.
 */
export function projectCapabilityScore(project: ProjectWithMilestones): number | null {
  return project.finalScore ?? project.liveScore ?? runningAverage(project.milestones);
}
