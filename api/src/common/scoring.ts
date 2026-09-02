// Ported from the Next.js app's src/lib/scoring.ts (Milestones plan, Phase 5).

import { minReviewThreshold } from "./constants";
import type { ProjectWithMilestones } from "./types";

type RatedMilestone = { status: string; rating?: number | null };

export function reviewedRatings(milestones: RatedMilestone[]): number[] {
  return milestones
    .filter((m) => m.status === "reviewed" && m.rating != null)
    .map((m) => m.rating as number);
}

export function runningAverage(milestones: RatedMilestone[]): number | null {
  const ratings = reviewedRatings(milestones);
  if (ratings.length === 0) return null;
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

export function meetsPublicThreshold(project: ProjectWithMilestones): boolean {
  const total = project.milestones.length;
  if (total === 0) return false;
  return reviewedRatings(project.milestones).length >= minReviewThreshold(total);
}

export function projectCapabilityScore(project: ProjectWithMilestones): number | null {
  return project.finalScore ?? project.liveScore ?? runningAverage(project.milestones);
}
