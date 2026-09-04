import Link from "next/link";
import type { ProjectWithMilestones } from "@/lib/types";
import {
  collectRatingSamples,
  computeClientProjectRows,
  computeGivenSatisfaction,
  computeRatingDistribution,
  computeReviewWorkload,
  computeVendorBreakdown,
} from "@/lib/derived";
import { formatDate, formatPercent, formatRating } from "@/lib/format";
import {
  EmptyState,
  HealthBadge,
  MilestoneStatusBadge,
  PageHeader,
  SectionHeading,
  StarRating,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { TrendChart } from "@/components/TrendChart";
import { RatingBarChart } from "@/components/RatingBarChart";

function Figure({
  label,
  value,
  icon,
  hint,
  tone,
  href,
}: {
  label: string;
  value: string | number;
  icon: string;
  hint?: string;
  tone?: "warn" | "bad";
  href?: string;
}) {
  const figCls = `text-[1.625rem] font-semibold leading-none tabular-nums ${
    tone === "bad" ? "text-rag-bad" : tone === "warn" ? "text-rag-warn" : "text-ink"
  }`;
  const chipCls = `flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] ${
    tone === "bad"
      ? "bg-[var(--rag-bad-bg,rgba(174,46,36,0.12))] text-rag-bad"
      : tone === "warn"
        ? "bg-[var(--rag-warn-bg,rgba(127,95,1,0.12))] text-rag-warn"
        : "bg-band text-ink-muted"
  }`;
  const cls = `flex items-start gap-3 rounded-[8px] border border-rule bg-panel px-4 py-3.5 ${
    href ? "transition-colors hover:border-link" : ""
  }`;
  const body = (
    <>
      <span className={chipCls}>
        <Icon name={icon} className="text-[16px]" />
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="flex items-center gap-1 text-xs font-medium text-ink-muted">
          {label}
          {href ? <Icon name="north_east" className="text-[12px]" /> : null}
        </span>
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className={`${figCls} shrink-0`}>{value}</span>
          {hint ? (
            <span className="truncate whitespace-nowrap text-xs text-ink-subtle">{hint}</span>
          ) : null}
        </span>
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function DimensionBars({
  rows,
}: {
  rows: { key: string; label: string; avg: number | null; count: number }[];
}) {
  const withData = rows.filter((r) => r.avg != null);
  if (withData.length === 0) {
    return <p className="py-4 text-center text-sm text-ink-muted">No dimension scores yet.</p>;
  }
  const tone = (v: number) =>
    v >= 4 ? "var(--rag-good)" : v >= 3 ? "var(--rag-warn)" : "var(--rag-bad)";
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.key}
          className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-3 text-sm"
        >
          <span className="truncate text-ink-muted" title={r.label}>
            {r.label}
          </span>
          <span className="h-2 min-w-0 rounded-full bg-band">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${r.avg != null ? Math.max((r.avg / 5) * 100, 2) : 0}%`,
                background: r.avg != null ? tone(r.avg) : "var(--ink-subtle)",
              }}
            />
          </span>
          <span className="font-mono text-xs tabular-nums text-ink">
            {r.avg != null ? r.avg.toFixed(1) : "—"}
            <span className="ml-1.5 text-ink-subtle">n={r.count}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ClientDashboard({
  projects,
  viewerId,
}: {
  projects: ProjectWithMilestones[];
  viewerId: string | null;
}) {
  if (projects.length === 0) {
    return (
      <div>
        <PageHeader title="Client register" description="Projects your company reviews." />
        <EmptyState
          icon="inbox"
          title="Nothing to review yet"
          description="When a delivery team adds you to a project and sends a milestone for review, it will show up here."
        />
      </div>
    );
  }

  const workload = computeReviewWorkload(projects, viewerId);
  const satisfaction = computeGivenSatisfaction(projects);
  const vendors = computeVendorBreakdown(projects);
  const projectRows = computeClientProjectRows(projects);
  const distribution = computeRatingDistribution(projects);
  const ratingSamples = collectRatingSamples(projects);

  const overdueFromVendor = projectRows.reduce((n, r) => n + r.overdueCount, 0);

  return (
    <div>
      <PageHeader
        title="Client register"
        description="Every engagement you review — delivery health and what's waiting on you."
      />

      {/* Summary */}
      <section>
        <SectionHeading>Summary</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Figure
            label="Projects reviewed"
            value={projects.length}
            icon="folder_open"
            href="/projects"
          />
          <Figure
            label="Awaiting your review"
            value={workload.awaitingCount}
            icon="hourglass_top"
            tone={workload.awaitingCount > 0 ? "warn" : undefined}
            href="/milestones?status=sent"
          />
          <Figure
            label="Overdue to review"
            value={workload.overdueToReview}
            icon="schedule"
            tone={workload.overdueToReview > 0 ? "bad" : undefined}
            hint="over 7 days"
          />
          <Figure
            label="Milestones reviewed"
            value={workload.reviewedByCompany}
            icon="check_circle"
            href="/milestones?status=reviewed"
          />
          <Figure
            label="Reviewed by you"
            value={workload.reviewedByYou}
            icon="verified"
            hint={
              workload.reviewedByCompany > 0
                ? `of ${workload.reviewedByCompany} total`
                : undefined
            }
          />
          <Figure
            label="Avg. rating given"
            value={formatRating(satisfaction.avgRating)}
            icon="star"
            hint={
              satisfaction.reviewedCount > 0
                ? `across ${satisfaction.reviewedCount} reviewed`
                : "none reviewed yet"
            }
          />
          <Figure
            label="Satisfaction rate"
            value={formatPercent(satisfaction.satisfactionRate)}
            icon="thumb_up"
          />
          <Figure
            label="Overdue from vendor"
            value={overdueFromVendor}
            icon="event_busy"
            tone={overdueFromVendor > 0 ? "bad" : undefined}
            href="/milestones?flag=OVERDUE"
          />
          <Figure label="Delivery teams" value={vendors.length} icon="groups" />
        </div>
      </section>

      {/* Awaiting your review */}
      <section className="mt-10">
        <SectionHeading
          action={
            workload.awaitingCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--rag-warn-bg,rgba(127,95,1,0.12))] px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-rag-warn">
                {workload.awaitingCount} open
              </span>
            ) : null
          }
        >
          Awaiting your review
        </SectionHeading>
        {workload.awaiting.length === 0 ? (
          <p className="flex items-center gap-1.5 rounded-ledger border border-rule bg-panel px-3 py-2.5 text-sm text-ink-muted">
            <Icon name="check_circle" className="text-[15px] text-rag-good" fill />
            You&rsquo;re all caught up — nothing is waiting on your review.
          </p>
        ) : (
          <div className="rounded-ledger border border-rule bg-panel">
            <ul className="divide-y divide-rule">
              {workload.awaiting.map(({ project, milestone, waitingDays }) => {
                const stale = waitingDays != null && waitingDays > 7;
                return (
                  <li
                    key={milestone.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2.5 hover:bg-band"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/projects/${project.id}/milestones/${milestone.id}/review`}
                        className="truncate font-medium text-ink hover:text-link hover:underline"
                      >
                        {milestone.title}
                      </Link>
                      <div className="truncate text-xs text-ink-muted">
                        {project.name}
                        <span className="text-ink-subtle">
                          {" "}
                          · {project.deliveringCompanyName ?? "Delivery team"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 justify-self-end">
                      {waitingDays != null ? (
                        <span
                          className={`font-mono text-xs tabular-nums ${
                            stale ? "text-rag-bad" : "text-ink-muted"
                          }`}
                        >
                          {waitingDays}d waiting
                        </span>
                      ) : null}
                      <MilestoneStatusBadge status={milestone.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Rating trend */}
      <section className="mt-10">
        <SectionHeading>Rating trend</SectionHeading>
        <div className="rounded-ledger border border-rule bg-panel px-3 pb-2 pt-3">
          <TrendChart samples={ratingSamples} />
        </div>
      </section>

      {/* Breakdowns */}
      <section className="mt-10">
        <SectionHeading>Breakdowns</SectionHeading>
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <div className="min-w-0 rounded-ledger border border-rule bg-panel p-4">
            <h3 className="mb-1 text-sm font-semibold text-ink">Rating distribution</h3>
            <p className="mb-3 text-xs text-ink-muted">
              Where your scores land across every reviewed milestone.
            </p>
            <RatingBarChart bars={distribution} />
          </div>
          <div className="min-w-0 rounded-ledger border border-rule bg-panel p-4">
            <h3 className="mb-1 text-sm font-semibold text-ink">Ratings by dimension</h3>
            <p className="mb-3 text-xs text-ink-muted">
              Mean score you&rsquo;ve given on each feedback dimension (out of 5).
            </p>
            <DimensionBars rows={satisfaction.dimensionAverages} />
          </div>
        </div>
      </section>

      {/* Delivery health */}
      <section className="mt-10">
        <SectionHeading>Delivery health</SectionHeading>
        <div className="overflow-hidden rounded-ledger border border-rule bg-panel">
          <ul className="divide-y divide-rule">
            {projectRows.map((r) => (
              <li key={r.id} className="px-3 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link
                    href={`/projects/${r.id}`}
                    className="font-medium text-ink hover:text-link hover:underline"
                  >
                    {r.name}
                  </Link>
                  <span className="text-xs text-ink-subtle">· {r.vendor}</span>
                  <span className="ml-auto">
                    <HealthBadge health={r.health} />
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-ink-muted">
                  <span>
                    Reviewed <span className="text-ink">{r.reviewed}/{r.total}</span> ·{" "}
                    {Math.round(r.pct)}%
                  </span>
                  {r.awaitingReview > 0 ? (
                    <span className="text-rag-warn">{r.awaitingReview} awaiting review</span>
                  ) : null}
                  {r.overdueCount > 0 ? (
                    <span className="text-rag-bad">{r.overdueCount} overdue</span>
                  ) : null}
                  <span>
                    On time{" "}
                    <span className="text-ink">
                      {r.onTimePct != null ? `${Math.round(r.onTimePct)}%` : "—"}
                    </span>
                  </span>
                  {r.nextDue ? (
                    <span>
                      Next due <span className="text-ink">{formatDate(r.nextDue.date)}</span>
                      <span className="text-ink-subtle"> · {r.nextDue.title}</span>
                    </span>
                  ) : null}
                </div>
                <span className="mt-2 flex h-2 overflow-hidden rounded-full bg-band">
                  <span
                    className="block h-full"
                    style={{
                      width: `${r.total > 0 ? (r.reviewed / r.total) * 100 : 0}%`,
                      background: "var(--rag-good)",
                    }}
                  />
                  <span
                    className="block h-full"
                    style={{
                      width: `${r.total > 0 ? (r.awaitingReview / r.total) * 100 : 0}%`,
                      background: "var(--rag-warn)",
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Vendors / engagement ledger */}
      <section className="mt-10">
        <SectionHeading>Delivery teams</SectionHeading>
        <div className="overflow-hidden rounded-ledger border border-rule bg-panel">
          <ul className="divide-y divide-rule">
            {vendors.map((v) => (
              <li
                key={v.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2.5 hover:bg-band sm:grid-cols-[1fr_9rem_6rem_auto]"
              >
                <div className="min-w-0">
                  <span className="truncate font-medium text-ink">{v.name}</span>
                  <div className="text-xs text-ink-muted">
                    {v.projectCount} project{v.projectCount === 1 ? "" : "s"} ·{" "}
                    {v.reviewedMilestones}/{v.totalMilestones} reviewed
                  </div>
                </div>
                <span className="hidden justify-self-end sm:block">
                  <StarRating value={v.avgRating} />
                </span>
                <span className="hidden justify-self-end font-mono text-xs tabular-nums text-ink-muted sm:block">
                  {formatRating(v.latestRating)} latest
                </span>
                <span className="justify-self-end">
                  <HealthBadge health={v.health} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
