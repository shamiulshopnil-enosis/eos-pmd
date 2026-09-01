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
  DUE_SOON_WINDOW_DAYS,
  SATISFACTION_THRESHOLDS,
  SATISFIED_RATING_THRESHOLD,
  type ClientHealth,
} from "./constants";

export type { ProjectWithMilestones } from "./types";

/** Derived indicators layered on top of the milestone status (spec §8-style). */
export type MilestoneFlag = "OVERDUE" | "DUE_SOON" | "AWAITING_REVIEW" | null;

export function getMilestoneFlag(milestone: Milestone, now: Date = new Date()): MilestoneFlag {
  if (milestone.targetDate && milestone.status === "draft") {
    const target = new Date(milestone.targetDate);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntil = (target.getTime() - now.getTime()) / msPerDay;
    if (daysUntil < 0) return "OVERDUE";
    if (daysUntil <= DUE_SOON_WINDOW_DAYS) return "DUE_SOON";
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

export function computeAlerts(projects: ProjectWithMilestones[]): AlertItem[] {
  const alerts: AlertItem[] = [];
  const allMilestones = projects.flatMap((p) => p.milestones);

  const awaitingCount = allMilestones.filter((m) => m.status === "sent").length;
  if (awaitingCount > 0) {
    alerts.push({
      id: "awaiting-review",
      severity: "warning",
      message: `${awaitingCount} milestone${awaitingCount === 1 ? "" : "s"} awaiting client review`,
      href: "/milestones?status=sent",
    });
  }

  const overdueCount = allMilestones.filter((m) => getMilestoneFlag(m) === "OVERDUE").length;
  if (overdueCount > 0) {
    alerts.push({
      id: "overdue",
      severity: "critical",
      message: `${overdueCount} milestone${overdueCount === 1 ? "" : "s"} overdue`,
      href: "/milestones?flag=OVERDUE",
    });
  }

  for (const project of projects) {
    const perf = computeProjectPerformance(project);
    if (perf.isAtRisk) {
      alerts.push({
        id: `at-risk-${project.id}`,
        severity: "critical",
        message: `${project.name} received a rating below ${AT_RISK_RATING_THRESHOLD.toFixed(1)}`,
        href: `/projects/${project.id}`,
      });
    } else if (perf.satisfactionDeclined) {
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
