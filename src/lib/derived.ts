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

export type RatingTrendPoint = {
  /** Short axis label, e.g. "Jul 26". */
  label: string;
  /** Full label for tooltips, e.g. "July 2026". */
  monthLabel: string;
  /** Mean of the milestone ratings reviewed in this month, or null if none. */
  avgRating: number | null;
  /** How many milestones were reviewed in this month. */
  count: number;
  /** Running mean of every rating reviewed from the window start through this
   *  month — the stable line the noisy monthly average moves around. */
  cumulativeAvg: number | null;
};

/**
 * Milestone rating over time, bucketed by the month it was reviewed. Returns the
 * monthly mean, the review count behind it, and a running (cumulative) mean so
 * the chart can show signal (the trend) next to noise (one volatile month).
 */
export function computeRatingTrend(
  projects: ProjectWithMilestones[],
  months = 6,
): RatingTrendPoint[] {
  const now = new Date();
  const buckets: { label: string; monthLabel: string; year: number; month: number; ratings: number[] }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      monthLabel: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
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

  const seen: number[] = [];
  return buckets.map((b) => {
    seen.push(...b.ratings);
    return {
      label: b.label,
      monthLabel: b.monthLabel,
      avgRating: average(b.ratings),
      count: b.ratings.length,
      cumulativeAvg: seen.length > 0 ? average(seen) : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Dashboard breakdowns (Jira-style summary cards)
// ---------------------------------------------------------------------------

const RATING_BANDS = ["5", "4", "3", "2", "1"] as const;
export type RatingBand = (typeof RATING_BANDS)[number];

/** Which 1–5 band a milestone's average rating falls in (5 is exact-5-only). */
export function ratingBand(r: number): RatingBand {
  if (r >= 5) return "5";
  return String(Math.min(4, Math.max(1, Math.floor(r)))) as RatingBand;
}

export type RatingDistributionBar = {
  band: RatingBand;
  label: string;
  count: number;
  tone: "good" | "warn" | "bad";
};

/** Count of reviewed milestones per rating band, highest band first. */
export function computeRatingDistribution(projects: ProjectWithMilestones[]): RatingDistributionBar[] {
  const counts: Record<RatingBand, number> = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
  for (const project of projects) {
    for (const m of reviewedMilestones(project)) {
      if (m.rating != null) counts[ratingBand(m.rating)] += 1;
    }
  }
  const label: Record<RatingBand, string> = {
    "5": "5.0",
    "4": "4.0–4.9",
    "3": "3.0–3.9",
    "2": "2.0–2.9",
    "1": "< 2.0",
  };
  const tone = (b: RatingBand): "good" | "warn" | "bad" =>
    b === "5" || b === "4" ? "good" : b === "3" ? "warn" : "bad";
  return RATING_BANDS.map((b) => ({ band: b, label: label[b], count: counts[b], tone: tone(b) }));
}

export type StatusBreakdownRow = {
  status: Milestone["status"];
  label: string;
  count: number;
  pct: number;
  tone: "good" | "warn" | "bad" | "slate";
};

/** Share of every milestone by status, most common first. */
export function computeMilestoneStatusBreakdown(
  projects: ProjectWithMilestones[],
): StatusBreakdownRow[] {
  const all = projects.flatMap((p) => p.milestones);
  const total = all.length;
  const meta: { status: Milestone["status"]; label: string; tone: StatusBreakdownRow["tone"] }[] = [
    { status: "reviewed", label: "Reviewed", tone: "good" },
    { status: "sent", label: "With client", tone: "warn" },
    { status: "draft", label: "Draft", tone: "slate" },
    { status: "rejected", label: "Rejected", tone: "bad" },
  ];
  return meta
    .map((m) => {
      const count = all.filter((x) => x.status === m.status).length;
      return { ...m, count, pct: total > 0 ? (count / total) * 100 : 0 };
    })
    .sort((a, b) => b.count - a.count);
}

export type ProjectProgressRow = {
  id: string;
  name: string;
  total: number;
  reviewed: number;
  sent: number;
  remaining: number;
  pct: number;
};

/** Per-project milestone progress (reviewed / with-client / remaining), most
 *  complete first. Projects with no milestones are dropped. */
export function computeProjectProgress(projects: ProjectWithMilestones[]): ProjectProgressRow[] {
  return projects
    .map((p) => {
      const total = p.milestones.length;
      const reviewed = p.milestones.filter((m) => m.status === "reviewed").length;
      const sent = p.milestones.filter((m) => m.status === "sent").length;
      return {
        id: p.id,
        name: p.name,
        total,
        reviewed,
        sent,
        remaining: Math.max(0, total - reviewed - sent),
        pct: total > 0 ? (reviewed / total) * 100 : 0,
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.pct - a.pct || b.total - a.total);
}

export type WorkloadRow = {
  key: string;
  name: string;
  open: number;
  done: number;
  total: number;
};

/** Milestones grouped by assignee (email), open (draft/sent/rejected) vs done
 *  (reviewed), busiest first. Milestones with no assignee roll up to
 *  "Unassigned", which is always sorted last. */
export function computeDeliveryWorkload(projects: ProjectWithMilestones[]): WorkloadRow[] {
  const byKey = new Map<string, WorkloadRow>();
  const bump = (key: string, name: string, done: boolean) => {
    const row = byKey.get(key) ?? { key, name, open: 0, done: 0, total: 0 };
    if (done) row.done += 1;
    else row.open += 1;
    row.total += 1;
    byKey.set(key, row);
  };
  for (const project of projects) {
    for (const m of project.milestones) {
      const done = m.status === "reviewed";
      if (m.assignees.length === 0) {
        bump("__unassigned__", "Unassigned", done);
        continue;
      }
      for (const a of m.assignees) {
        bump(a.email.toLowerCase(), a.name ?? a.email, done);
      }
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.key === "__unassigned__") return 1;
    if (b.key === "__unassigned__") return -1;
    return b.total - a.total || b.open - a.open;
  });
}
