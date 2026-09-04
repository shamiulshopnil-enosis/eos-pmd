// Derived indicators and metric calculations. Pure functions over plain data so
// they're easy to reuse between server components, server actions, and the
// dashboard. Milestones plan, Phase 2: these run off Milestone data (single
// `rating` per milestone). The running-average / public-threshold definitions
// live in ./scoring (Phase 5); this module composes them into UI-shaped views.

import type { Milestone, MilestoneReviewDimension, ProjectWithMilestones } from "./types";
import { runningAverage } from "./scoring";
import {
  AT_RISK_RATING_THRESHOLD,
  CLIENT_HEALTH_LABELS,
  COMPLETION_TIMEOUT_DAYS,
  DUE_SOON_WINDOW_DAYS,
  MILESTONE_REVIEW_DIMENSIONS,
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
  if (rating > SATISFACTION_THRESHOLDS.needsAttentionAbove) return "NEEDS_ATTENTION";
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
  completedProjects: number;
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
    completedProjects: projects.filter((p) => p.status === "COMPLETED").length,
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
  /** Short axis label, e.g. "Jul 26" (monthly) or "Sep 3" (daily). */
  label: string;
  /** Full label for tooltips, e.g. "July 2026" or "Wed, September 3, 2026". */
  fullLabel: string;
  /** Mean of the milestone ratings reviewed in this bucket, or null if none. */
  avgRating: number | null;
  /** How many milestones were reviewed in this bucket. */
  count: number;
  /** Running mean of every rating reviewed from the window start through this
   *  bucket — the stable line the noisy per-bucket average moves around. */
  cumulativeAvg: number | null;
};

/** Relative window the rating trend can be shown over. */
export type TrendPeriod = "week" | "month" | "quarter" | "year";

type TrendGranularity = "day" | "week" | "month";

/** Each window's bucket granularity and how many buckets it spans. */
export const TREND_PERIOD_CONFIG: Record<
  TrendPeriod,
  { granularity: TrendGranularity; buckets: number }
> = {
  week: { granularity: "day", buckets: 7 },
  month: { granularity: "day", buckets: 30 },
  quarter: { granularity: "week", buckets: 13 },
  year: { granularity: "month", buckets: 12 },
};

/** A single reviewed rating, serialisation-safe across the server→client boundary. */
export type RatingSample = { rating: number; reviewedAt: string };

/** Every reviewed milestone rating across the given projects, oldest first. */
export function collectRatingSamples(projects: ProjectWithMilestones[]): RatingSample[] {
  const out: RatingSample[] = [];
  for (const project of projects) {
    for (const m of project.milestones) {
      if (!isMilestoneReviewed(m) || m.rating == null || !m.reviewedAt) continue;
      out.push({ rating: m.rating, reviewedAt: new Date(m.reviewedAt).toISOString() });
    }
  }
  return out.sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfWeek = (d: Date) => {
  const s = startOfDay(d);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // Monday = 0
  return s;
};

/**
 * Reviewed milestone ratings bucketed by calendar period. Returns the per-bucket
 * mean, the review count behind it, and a running (cumulative) mean so the chart
 * can show signal (the trend) next to noise (one volatile bucket). `now` is
 * injectable for tests.
 */
export function computeRatingTrend(
  samples: RatingSample[],
  period: TrendPeriod = "quarter",
  now: Date = new Date(),
): RatingTrendPoint[] {
  const { granularity, buckets: n } = TREND_PERIOD_CONFIG[period];
  const buckets: {
    start: number;
    end: number;
    label: string;
    fullLabel: string;
    ratings: number[];
  }[] = [];

  for (let i = n - 1; i >= 0; i--) {
    let start: Date;
    let end: Date;
    let label: string;
    let fullLabel: string;
    if (granularity === "day") {
      start = startOfDay(now);
      start.setDate(start.getDate() - i);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      label = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      fullLabel = start.toLocaleDateString(undefined, {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } else if (granularity === "week") {
      start = startOfWeek(now);
      start.setDate(start.getDate() - i * 7);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      label = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      fullLabel = `Week of ${start.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      label = start.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      fullLabel = start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
    buckets.push({ start: start.getTime(), end: end.getTime(), label, fullLabel, ratings: [] });
  }

  for (const s of samples) {
    const t = new Date(s.reviewedAt).getTime();
    const bucket = buckets.find((b) => t >= b.start && t < b.end);
    if (bucket) bucket.ratings.push(s.rating);
  }

  const seen: number[] = [];
  return buckets.map((b) => {
    seen.push(...b.ratings);
    return {
      label: b.label,
      fullLabel: b.fullLabel,
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

// ---------------------------------------------------------------------------
// Client (review-side) dashboard. These run off the projects the viewer's
// company receives — `listReviewProjects()` — and answer "how is delivery
// going, and what do I owe a review?" rather than "how am I scoring".
// ---------------------------------------------------------------------------

export interface ReviewWorkload {
  /** Milestones sitting with the client, oldest first. */
  awaiting: {
    project: ProjectWithMilestones;
    milestone: Milestone;
    /** Whole days the milestone has been waiting, or null if `sentAt` is unknown. */
    waitingDays: number | null;
  }[];
  awaitingCount: number;
  /** Of those, how many have been waiting longer than the stale-review window. */
  overdueToReview: number;
  /** Reviewed milestones across every project the company receives. */
  reviewedByCompany: number;
  /** …of which this viewer personally submitted. */
  reviewedByYou: number;
}

export function computeReviewWorkload(
  projects: ProjectWithMilestones[],
  viewerId: string | null,
  now: Date = new Date(),
): ReviewWorkload {
  const awaiting = projects
    .flatMap((project) =>
      project.milestones
        .filter((m) => m.status === "sent")
        .map((milestone) => ({
          project,
          milestone,
          waitingDays:
            milestone.sentAt != null
              ? Math.floor((now.getTime() - milestone.sentAt.getTime()) / MS_PER_DAY)
              : null,
        })),
    )
    .sort(
      (a, b) =>
        (a.milestone.sentAt?.getTime() ?? 0) - (b.milestone.sentAt?.getTime() ?? 0),
    );

  const overdueToReview = awaiting.filter(
    ({ waitingDays }) => waitingDays != null && waitingDays > STALE_MILESTONE_REVIEW_DAYS,
  ).length;

  const reviewed = projects.flatMap((p) => p.milestones.filter(isMilestoneReviewed));
  const reviewedByYou = viewerId
    ? reviewed.filter((m) => m.reviewedByUserId === viewerId).length
    : 0;

  return {
    awaiting,
    awaitingCount: awaiting.length,
    overdueToReview,
    reviewedByCompany: reviewed.length,
    reviewedByYou,
  };
}

export interface DimensionAverage {
  key: MilestoneReviewDimension;
  label: string;
  avg: number | null;
  count: number;
}

export interface GivenSatisfaction {
  avgRating: number | null;
  reviewedCount: number;
  /** Share of reviews at or above the "satisfied" line. */
  satisfactionRate: number | null;
  /** Mean score the client has given on each of the five feedback dimensions. */
  dimensionAverages: DimensionAverage[];
}

export function computeGivenSatisfaction(projects: ProjectWithMilestones[]): GivenSatisfaction {
  const reviewed = projects.flatMap((p) => p.milestones.filter(isMilestoneReviewed));
  const ratings = reviewed.map((m) => m.rating);
  const satisfied = ratings.filter((r) => r >= SATISFIED_RATING_THRESHOLD).length;

  const dimensionAverages: DimensionAverage[] = MILESTONE_REVIEW_DIMENSIONS.map((dim) => {
    const values: number[] = [];
    for (const m of reviewed) {
      const v = m.ratings?.[dim.key];
      if (typeof v === "number") values.push(v);
    }
    return { key: dim.key, label: dim.label, avg: average(values), count: values.length };
  });

  return {
    avgRating: average(ratings),
    reviewedCount: reviewed.length,
    satisfactionRate: ratings.length > 0 ? (satisfied / ratings.length) * 100 : null,
    dimensionAverages,
  };
}

export interface VendorBreakdownRow {
  id: string;
  name: string;
  projectCount: number;
  totalMilestones: number;
  reviewedMilestones: number;
  latestRating: number | null;
  avgRating: number | null;
  health: ClientHealth;
}

/** Reviewed-milestone performance grouped by the delivering company. */
export function computeVendorBreakdown(projects: ProjectWithMilestones[]): VendorBreakdownRow[] {
  const byKey = new Map<string, ProjectWithMilestones[]>();
  const order: string[] = [];
  for (const p of projects) {
    const key = p.deliveringCompanyId ?? p.deliveringCompanyName ?? "Delivery team";
    if (!byKey.has(key)) {
      byKey.set(key, []);
      order.push(key);
    }
    byKey.get(key)!.push(p);
  }

  return order
    .map((key) => {
      const group = byKey.get(key)!;
      const reviewed = group
        .flatMap((p) => p.milestones.filter(isMilestoneReviewed))
        .sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0));
      const ratings = reviewed.map((m) => m.rating);
      const latestRating = ratings[0] ?? null;
      return {
        id: key,
        name: group[0].deliveringCompanyName ?? "Delivery team",
        projectCount: group.length,
        totalMilestones: group.reduce((n, p) => n + p.milestones.length, 0),
        reviewedMilestones: reviewed.length,
        latestRating,
        avgRating: average(ratings),
        health: classifyHealth(latestRating),
      };
    })
    .sort((a, b) => {
      const ah = a.avgRating ?? Infinity;
      const bh = b.avgRating ?? Infinity;
      return ah - bh || b.reviewedMilestones - a.reviewedMilestones;
    });
}

export interface ClientProjectRow {
  id: string;
  name: string;
  vendor: string;
  health: ClientHealth;
  /** Nearest un-reviewed milestone with a due date. */
  nextDue: { title: string; date: Date } | null;
  overdueCount: number;
  awaitingReview: number;
  /** Share of sent-or-reviewed milestones (with a due date) delivered by their due date. */
  onTimePct: number | null;
  reviewed: number;
  total: number;
  pct: number;
}

export function computeClientProjectRows(
  projects: ProjectWithMilestones[],
  now: Date = new Date(),
): ClientProjectRow[] {
  return projects
    .map((p) => {
      const total = p.milestones.length;
      const reviewed = p.milestones.filter((m) => m.status === "reviewed").length;
      const overdueCount = p.milestones.filter(
        (m) => getMilestoneFlag(m, now) === "OVERDUE",
      ).length;
      const awaitingReview = p.milestones.filter((m) => m.status === "sent").length;

      const upcoming = p.milestones
        .filter((m) => (m.status === "draft" || m.status === "sent") && m.dueDate != null)
        .sort((a, b) => (a.dueDate!.getTime() ?? 0) - (b.dueDate!.getTime() ?? 0))[0];

      const delivered = p.milestones.filter(
        (m) => (m.status === "sent" || m.status === "reviewed") && m.dueDate != null,
      );
      const onTime = delivered.filter((m) => {
        const mark = m.sentAt ?? m.reviewedAt;
        return mark != null && mark.getTime() <= m.dueDate!.getTime();
      }).length;

      const latestRating =
        reviewedMilestones(p)[0]?.rating ?? null;

      return {
        id: p.id,
        name: p.name,
        vendor: p.deliveringCompanyName ?? "Delivery team",
        health: classifyHealth(latestRating),
        nextDue: upcoming ? { title: upcoming.title, date: upcoming.dueDate! } : null,
        overdueCount,
        awaitingReview,
        onTimePct: delivered.length > 0 ? (onTime / delivered.length) * 100 : null,
        reviewed,
        total,
        pct: total > 0 ? (reviewed / total) * 100 : 0,
      };
    })
    .sort((a, b) => {
      // Trouble first: overdue, then awaiting review, then least complete.
      if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount;
      if (b.awaitingReview !== a.awaitingReview) return b.awaitingReview - a.awaitingReview;
      return a.pct - b.pct;
    });
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
