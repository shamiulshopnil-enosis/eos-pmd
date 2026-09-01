// Derived indicators and metric calculations (PRD §8, §13, §25). Kept as pure
// functions over plain data so they're easy to unit test and reuse between
// server components, server actions, and the dashboard.

import type { ReleaseModel as Release, FeedbackRequestModel as FeedbackRequest, ProjectModel as Project } from "@/generated/prisma/models";
import {
  AT_RISK_RATING_THRESHOLD,
  CLIENT_HEALTH_LABELS,
  DUE_SOON_WINDOW_DAYS,
  SATISFACTION_THRESHOLDS,
  SATISFIED_RATING_THRESHOLD,
  type ClientHealth,
} from "./constants";

export type ReleaseWithFeedback = Release & {
  feedbackRequest: FeedbackRequest | null;
};

export type ProjectWithReleases = Project & {
  releases: ReleaseWithFeedback[];
};

/** PRD §8 — derived indicators layered on top of the manual release status. */
export type ReleaseFlag = "OVERDUE" | "DUE_SOON" | "AWAITING_FEEDBACK" | null;

export function getReleaseFlag(release: Release, now: Date = new Date()): ReleaseFlag {
  const openStatuses = new Set(["DRAFT", "IN_PROGRESS"]);
  if (release.plannedDeliveryDate && openStatuses.has(release.status)) {
    const planned = new Date(release.plannedDeliveryDate);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntil = (planned.getTime() - now.getTime()) / msPerDay;
    if (daysUntil < 0) return "OVERDUE";
    if (daysUntil <= DUE_SOON_WINDOW_DAYS) return "DUE_SOON";
  }
  if (release.status === "FEEDBACK_REQUESTED") return "AWAITING_FEEDBACK";
  return null;
}

export function isAwaitingFeedback(feedbackRequest: FeedbackRequest | null): boolean {
  return feedbackRequest?.status === "PENDING";
}

/** A release evaluation is "complete" once overallSatisfaction has been recorded. */
export function isEvaluationComplete(fr: FeedbackRequest | null): fr is FeedbackRequest & { overallSatisfaction: number } {
  return !!fr && fr.status === "COMPLETED" && fr.overallSatisfaction != null;
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

/** Completed evaluations for a project, most recent first. */
export function completedEvaluations(project: ProjectWithReleases) {
  return project.releases
    .map((r) => r.feedbackRequest)
    .filter(isEvaluationComplete)
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export interface ProjectPerformance {
  avgRating: number | null;
  latestRating: number | null;
  health: ClientHealth;
  activeReleases: number;
  totalReleases: number;
  releasesCompleted: number;
  responseRate: number | null;
  isAtRisk: boolean;
  satisfactionDeclined: boolean;
}

/** PRD §6 Performance Summary + §15 Project Performance Table, in one pass. */
export function computeProjectPerformance(project: ProjectWithReleases): ProjectPerformance {
  const evals = completedEvaluations(project);
  const ratings = evals.map((e) => e.overallSatisfaction as number);
  const avgRating = average(ratings);
  const latestRating = ratings[0] ?? null;
  const previousRating = ratings[1] ?? null;

  const sentRequests = project.releases.filter((r) => r.feedbackRequest).length;
  const completedRequests = evals.length;

  return {
    avgRating,
    latestRating,
    health: classifyHealth(latestRating),
    activeReleases: project.releases.filter((r) => r.status === "IN_PROGRESS").length,
    totalReleases: project.releases.length,
    releasesCompleted: project.releases.filter((r) => r.status === "CLOSED" || r.status === "REVIEWED").length,
    responseRate: sentRequests > 0 ? (completedRequests / sentRequests) * 100 : null,
    isAtRisk: latestRating != null && latestRating < AT_RISK_RATING_THRESHOLD,
    satisfactionDeclined: latestRating != null && previousRating != null && latestRating < previousRating,
  };
}

export interface DashboardKpis {
  activeProjects: number;
  activeReleases: number;
  releasesDelivered: number;
  awaitingFeedback: number;
  averageReleaseRating: number | null;
  clientSatisfactionRate: number | null;
  atRiskProjects: number;
}

export function computeDashboardKpis(
  projects: ProjectWithReleases[],
  periodStart: Date | null,
): DashboardKpis {
  const allReleases = projects.flatMap((p) => p.releases);
  const allEvals = projects.flatMap((p) => completedEvaluations(p));
  const inPeriod = (d: Date | null) => !periodStart || (d != null && d >= periodStart);

  const ratings = allEvals.map((e) => e.overallSatisfaction as number);
  const satisfiedCount = ratings.filter((r) => r >= SATISFIED_RATING_THRESHOLD).length;

  return {
    activeProjects: projects.filter((p) => p.status === "ACTIVE").length,
    activeReleases: allReleases.filter((r) => r.status === "IN_PROGRESS").length,
    releasesDelivered: allReleases.filter((r) => r.actualDeliveryDate && inPeriod(r.actualDeliveryDate)).length,
    awaitingFeedback: allReleases.filter((r) => isAwaitingFeedback(r.feedbackRequest)).length,
    averageReleaseRating: average(ratings),
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

/** PRD §17 — Alerts / Attention Required. */
export function computeAlerts(projects: ProjectWithReleases[]): AlertItem[] {
  const alerts: AlertItem[] = [];
  const allReleases = projects.flatMap((p) => p.releases.map((r) => ({ ...r, project: p })));

  const awaitingCount = allReleases.filter((r) => isAwaitingFeedback(r.feedbackRequest)).length;
  if (awaitingCount > 0) {
    alerts.push({
      id: "awaiting-feedback",
      severity: "warning",
      message: `${awaitingCount} release${awaitingCount === 1 ? "" : "s"} awaiting feedback`,
      href: "/releases?feedback=PENDING",
    });
  }

  const overdueCount = allReleases.filter((r) => getReleaseFlag(r) === "OVERDUE").length;
  if (overdueCount > 0) {
    alerts.push({
      id: "overdue",
      severity: "critical",
      message: `${overdueCount} release${overdueCount === 1 ? "" : "s"} overdue`,
      href: "/releases?flag=OVERDUE",
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

/** PRD §14 — Average Release Rating Over Time, bucketed by month. */
export function computeRatingTrend(projects: ProjectWithReleases[], months = 6) {
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
    for (const evaluation of completedEvaluations(project)) {
      const completed = evaluation.completedAt;
      if (!completed) continue;
      const bucket = buckets.find((b) => b.year === completed.getFullYear() && b.month === completed.getMonth());
      if (bucket) bucket.ratings.push(evaluation.overallSatisfaction as number);
    }
  }

  return buckets.map((b) => ({ label: b.label, avgRating: average(b.ratings) }));
}
