// Derived indicators and metric calculations. Pure functions over plain data so
// they're easy to reuse between server components, server actions, and the
// dashboard. Milestones plan, Phase 2: these run off Milestone data (single
// `rating` per milestone). The running-average / public-threshold definitions
// live in ./scoring (Phase 5); this module composes them into UI-shaped views.

import type { Milestone, ProjectWithMilestones } from "./types";
import { runningAverage } from "./scoring";
import {
  AT_RISK_RATING_THRESHOLD,
  CLIENT_HEALTH_LABELS,
  COMPLETION_TIMEOUT_DAYS,
  DUE_SOON_WINDOW_DAYS,
  SATISFACTION_THRESHOLDS,
  SATISFIED_RATING_THRESHOLD,
  STALE_MILESTONE_REVIEW_DAYS,
  type ClientHealth,
} from "./constants";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type { ProjectWithMilestones } from "./types";

/** Derived indicators layered on top of the milestone status (spec §8-style). */
export type MilestoneFlag = "OVERDUE" | "DUE_SOON" | "AWAITING_REVIEW" | null;

export function getMilestoneFlag(milestone: Milestone, now: Date = new Date()): MilestoneFlag {
  // A due date can lapse while the milestone is still a draft or already with
  // the client (Milestones plan, Phase 8 — spec §8-style delivery signal).
  if (milestone.dueDate && (milestone.status === "draft" || milestone.status === "sent")) {
    const daysUntil = (new Date(milestone.dueDate).getTime() - now.getTime()) / MS_PER_DAY;
    if (daysUntil < 0) return "OVERDUE";
    if (milestone.status === "draft" && daysUntil <= DUE_SOON_WINDOW_DAYS) return "DUE_SOON";
  }
  if (milestone.status === "sent") return "AWAITING_REVIEW";
  return null;
}

export function isAwaitingReview(milestone: Milestone): boolean {
  return milestone.status === "sent";
}

/** A milestone is "reviewed" once the client has recorded a rating. */
export function isMilestoneReviewed(m: Milestone | null): m is Milestone & { rating: number } {
  return !!m && m.status === "reviewed" && m.rating != null;
}

export function classifyHealth(rating: number | null): ClientHealth {
  if (rating == null) return "NO_DATA";
  if (rating >= SATISFACTION_THRESHOLDS.happyAtOrAbove) return "HAPPY";
  if (rating >= SATISFACTION_THRESHOLDS.needsAttentionAtOrAbove) return "NEEDS_ATTENTION";
  return "AT_RISK";
}

export function healthLabel(health: ClientHealth): string {
  return CLIENT_HEALTH_LABELS[health];
}

/** Reviewed milestones for a project, most recent review first. */
export function reviewedMilestones(project: ProjectWithMilestones) {
  return project.milestones
    .filter(isMilestoneReviewed)
    .sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0));
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export interface ProjectPerformance {
  avgRating: number | null;
  latestRating: number | null;
  health: ClientHealth;
  activeMilestones: number;
  totalMilestones: number;
  milestonesReviewed: number;
  responseRate: number | null;
  isAtRisk: boolean;
  satisfactionDeclined: boolean;
}

export function computeProjectPerformance(project: ProjectWithMilestones): ProjectPerformance {
  const reviewed = reviewedMilestones(project);
  const ratings = reviewed.map((m) => m.rating as number);
  const avgRating = runningAverage(project.milestones);
  const latestRating = ratings[0] ?? null;
  const previousRating = ratings[1] ?? null;

  // A milestone counts as "requested" once it has been sent to the client.
  const sentOrReviewed = project.milestones.filter((m) => m.status === "sent" || m.status === "reviewed").length;

  return {
    avgRating,
    latestRating,
    health: classifyHealth(latestRating),
    activeMilestones: project.milestones.filter((m) => m.status === "draft").length,
    totalMilestones: project.milestones.length,
    milestonesReviewed: reviewed.length,
    responseRate: sentOrReviewed > 0 ? (reviewed.length / sentOrReviewed) * 100 : null,
    isAtRisk: latestRating != null && latestRating < AT_RISK_RATING_THRESHOLD,
    satisfactionDeclined: latestRating != null && previousRating != null && latestRating < previousRating,
  };
}

export interface DashboardKpis {
  activeProjects: number;
  activeMilestones: number;
  milestonesReviewed: number;
  awaitingReview: number;
  averageMilestoneRating: number | null;
  clientSatisfactionRate: number | null;
  atRiskProjects: number;
}

export function computeDashboardKpis(
  projects: ProjectWithMilestones[],
  periodStart: Date | null,
): DashboardKpis {
  const allMilestones = projects.flatMap((p) => p.milestones);
  const allReviewed = projects.flatMap((p) => reviewedMilestones(p));
  const inPeriod = (d: Date | null) => !periodStart || (d != null && d >= periodStart);

  const ratings = allReviewed.map((m) => m.rating as number);
  const satisfiedCount = ratings.filter((r) => r >= SATISFIED_RATING_THRESHOLD).length;

  return {
    activeProjects: projects.filter((p) => p.status === "ACTIVE").length,
    activeMilestones: allMilestones.filter((m) => m.status === "draft").length,
    milestonesReviewed: allReviewed.filter((m) => inPeriod(m.reviewedAt)).length,
    awaitingReview: allMilestones.filter((m) => m.status === "sent").length,
    averageMilestoneRating: average(ratings),
    clientSatisfactionRate: ratings.length > 0 ? (satisfiedCount / ratings.length) * 100 : null,
    atRiskProjects: projects.filter((p) => computeProjectPerformance(p).isAtRisk).length,
  };
}

export interface AlertItem {
  id: string;
  severity: "warning" | "critical";
  message: string;
  href: string;
}

/**
 * Milestones plan, Phase 8 — dashboard signals rebuilt for the milestone era:
 * overdue milestones, milestones sitting unrated with the client, projects stuck
 * awaiting completion confirmation, and projects tracking below the at-risk line.
 */
export function computeAlerts(projects: ProjectWithMilestones[], now: Date = new Date()): AlertItem[] {
  const alerts: AlertItem[] = [];
  const allMilestones = projects.flatMap((p) => p.milestones);

  const overdueCount = allMilestones.filter((m) => getMilestoneFlag(m, now) === "OVERDUE").length;
  if (overdueCount > 0) {
    alerts.push({
      id: "overdue",
      severity: "critical",
      message: `${overdueCount} milestone${overdueCount === 1 ? "" : "s"} overdue`,
      href: "/milestones?flag=OVERDUE",
    });
  }

  const staleReviewCount = allMilestones.filter(
    (m) =>
      m.status === "sent" &&
      m.sentAt != null &&
      now.getTime() - m.sentAt.getTime() > STALE_MILESTONE_REVIEW_DAYS * MS_PER_DAY,
  ).length;
  if (staleReviewCount > 0) {
    alerts.push({
      id: "awaiting-review",
      severity: "warning",
      message: `${staleReviewCount} milestone${staleReviewCount === 1 ? "" : "s"} awaiting a client rating for over ${STALE_MILESTONE_REVIEW_DAYS} days`,
      href: "/milestones?status=sent",
    });
  }

  for (const project of projects) {
    if (
      project.executionStatus === "awaiting_completion" &&
      project.completionRequestedAt != null &&
      now.getTime() - project.completionRequestedAt.getTime() >= COMPLETION_TIMEOUT_DAYS * MS_PER_DAY
    ) {
      alerts.push({
        id: `completion-timeout-${project.id}`,
        severity: "warning",
        message: `${project.name} has been awaiting completion confirmation for over ${COMPLETION_TIMEOUT_DAYS} days`,
        href: `/projects/${project.id}`,
      });
    }

    if (project.liveScore != null && project.liveScore < AT_RISK_RATING_THRESHOLD) {
      alerts.push({
        id: `at-risk-${project.id}`,
        severity: "critical",
        message: `${project.name} is tracking below ${AT_RISK_RATING_THRESHOLD.toFixed(1)} on reviewed milestones`,
        href: `/projects/${project.id}`,
      });
    } else if (computeProjectPerformance(project).satisfactionDeclined) {
      alerts.push({
        id: `declined-${project.id}`,
        severity: "warning",
        message: `Client satisfaction declined on ${project.name}`,
        href: `/projects/${project.id}`,
      });
    }
  }

  return alerts;
}

/** Average milestone rating over time, bucketed by the month it was reviewed. */
export function computeRatingTrend(projects: ProjectWithMilestones[], months = 6) {
  const now = new Date();
  const buckets: { label: string; year: number; month: number; ratings: number[] }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      year: d.getFullYear(),
      month: d.getMonth(),
      ratings: [],
    });
  }

  for (const project of projects) {
    for (const milestone of reviewedMilestones(project)) {
      const reviewed = milestone.reviewedAt;
      if (!reviewed) continue;
      const bucket = buckets.find((b) => b.year === reviewed.getFullYear() && b.month === reviewed.getMonth());
      if (bucket) bucket.ratings.push(milestone.rating as number);
    }
  }

  return buckets.map((b) => ({ label: b.label, avgRating: average(b.ratings) }));
}
