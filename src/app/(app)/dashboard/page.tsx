import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMyProjectSides, listProjectsWithMilestones, listReviewProjects } from "@/lib/data";
import { getViewMode } from "@/lib/view-mode";
import { ClientDashboard } from "@/components/ClientDashboard";
import {
  average,
  collectRatingSamples,
  computeAlerts,
  computeDashboardKpis,
  computeProjectPerformance,
  getMilestoneDisplayStatus,
  getMilestoneFlag,
} from "@/lib/derived";
import { formatDate, formatPercent, formatRating } from "@/lib/format";
import { SATISFIED_RATING_THRESHOLD, type ClientHealth } from "@/lib/constants";
import { EmptyState, InkLink, PageHeader, SectionHeading } from "@/components/ui";
import { Icon } from "@/components/icon";
import { TrendChart } from "@/components/TrendChart";
import { DashboardBreakdowns } from "@/components/DashboardBreakdowns";
import { DashboardAlerts } from "@/components/DashboardAlerts";
import { DashboardLedger, type ClientGroup, type LedgerRow } from "@/components/DashboardLedger";

// Live metrics — always render against the current database, never a build snapshot.
export const dynamic = "force-dynamic";

const HEALTH_RANK: Record<ClientHealth, number> = {
  AT_RISK: 0,
  NEEDS_ATTENTION: 1,
  NO_DATA: 2,
  HAPPY: 3,
};

export default async function DashboardPage() {
  const user = await requireUser();
  const sides = await getMyProjectSides().catch(() => ({ delivery: false, review: false }));
  const viewMode = await getViewMode(sides);

  if (viewMode === "client") {
    const reviewProjects = await listReviewProjects();
    return <ClientDashboard projects={reviewProjects} viewerId={user.id} />;
  }

  // The review-side view lives entirely behind the Client switch above — no
  // need to fetch it here just to say how many review projects exist.
  const projects = await listProjectsWithMilestones();

  if (projects.length === 0 && !sides.review) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <EmptyState
          icon="menu_book"
          title="The register is empty"
          description="Create your first project, break it into milestones, collect client reviews, and track performance over time."
          actionHref="/projects/new"
          actionLabel="Create project"
        />
      </div>
    );
  }

  if (projects.length === 0) {
    // Reaching here means `sides.review` is true — a dual-role user with
    // nothing on the delivery side yet.
    return (
      <div>
        <PageHeader title="Delivery register" description="Every client engagement, ruled and scored." />
        <EmptyState
          icon="folder_open"
          title="You're not delivering any projects"
          description="Switch to Client view above to see what you review."
          actionHref="/projects/new"
          actionLabel="Create project"
        />
      </div>
    );
  }

  const kpis = computeDashboardKpis(projects, null);
  const alerts = computeAlerts(projects);
  const ratingSamples = collectRatingSamples(projects);

  const allMilestones = projects.flatMap((p) => p.milestones);
  const overdueCount = allMilestones.filter((m) => getMilestoneFlag(m) === "OVERDUE").length;
  const dueSoonCount = allMilestones.filter((m) => getMilestoneFlag(m) === "DUE_SOON").length;

  const sorted = projects
    .map((p) => {
      const perf = computeProjectPerformance(p);
      const lastActivity = p.milestones.reduce(
        (acc, m) => Math.max(acc, m.updatedAt.getTime()),
        p.updatedAt.getTime(),
      );
      const spark = p.milestones
        .filter((m) => m.status === "reviewed" && m.rating != null)
        .sort((a, b) => (a.reviewedAt?.getTime() ?? 0) - (b.reviewedAt?.getTime() ?? 0))
        .map((m) => m.rating as number)
        .slice(-6);
      return { project: p, perf, lastActivity, spark };
    })
    .sort((a, b) => {
      const rank =
        (HEALTH_RANK[a.perf.health] - (a.perf.satisfactionDeclined ? 0.5 : 0)) -
        (HEALTH_RANK[b.perf.health] - (b.perf.satisfactionDeclined ? 0.5 : 0));
      if (rank !== 0) return rank;
      return b.lastActivity - a.lastActivity;
    });

  const projectRow = ({
    project: p,
    perf,
    spark,
  }: (typeof sorted)[number]): LedgerRow => ({
    id: p.id,
    name: p.name,
    client: p.clientCompanyName,
    href: `/projects/${p.id}`,
    health: perf.health,
    latestText: formatRating(perf.latestRating),
    avgText: formatRating(perf.avgRating),
    reviewedText: `${perf.milestonesReviewed} / ${perf.totalMilestones}`,
    execStatus: p.executionStatus,
    visibility: p.visibility,
    spark,
    declining: perf.satisfactionDeclined,
    milestones: p.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      status: getMilestoneDisplayStatus(m),
      ratingText: m.status === "reviewed" && m.rating != null ? formatRating(m.rating) : null,
      due: m.dueDate ? formatDate(m.dueDate) : "—",
    })),
  });

  // The ledger is keyed by client company: one line per client, its projects and
  // their milestones tucked into the expansion. `sorted` is already health-first,
  // so the client's worst project decides where the group lands.
  const groupOrder: string[] = [];
  const grouped = new Map<string, (typeof sorted)[number][]>();
  for (const entry of sorted) {
    const key = entry.project.clientCompanyId ?? entry.project.clientCompanyName;
    if (!grouped.has(key)) {
      grouped.set(key, []);
      groupOrder.push(key);
    }
    grouped.get(key)!.push(entry);
  }

  const clientGroups: ClientGroup[] = groupOrder.map((key) => {
    const entries = grouped.get(key)!;
    const ratings = entries.flatMap((e) =>
      e.project.milestones
        .filter((m) => m.status === "reviewed" && m.rating != null)
        .map((m) => m.rating as number),
    );
    const latest = entries
      .flatMap((e) =>
        e.project.milestones.filter(
          (m) => m.status === "reviewed" && m.rating != null && m.reviewedAt,
        ),
      )
      .sort((a, b) => (b.reviewedAt!.getTime() ?? 0) - (a.reviewedAt!.getTime() ?? 0))[0];
    const totalMilestones = entries.reduce((n, e) => n + e.project.milestones.length, 0);
    const reviewedCount = entries.reduce(
      (n, e) => n + e.project.milestones.filter((m) => m.status === "reviewed").length,
      0,
    );
    const worstHealth = entries.reduce<ClientHealth>(
      (worst, e) => (HEALTH_RANK[e.perf.health] < HEALTH_RANK[worst] ? e.perf.health : worst),
      "HAPPY",
    );
    return {
      id: key,
      client: entries[0].project.clientCompanyName,
      health: worstHealth,
      latestText: formatRating(latest?.rating ?? null),
      avgText: formatRating(average(ratings)),
      reviewedText: `${reviewedCount} / ${totalMilestones}`,
      projectCount: entries.length,
      needsAttention: entries.some(
        (e) =>
          e.perf.health === "AT_RISK" ||
          e.perf.health === "NEEDS_ATTENTION" ||
          e.perf.satisfactionDeclined,
      ),
      projects: entries.map(projectRow),
    };
  });

  const needingAttention = clientGroups.filter((g) => g.needsAttention).length;

  return (
    <div>
      <PageHeader
        title="Delivery register"
        description="Every client engagement, ruled and scored."
        action={<InkLink href="/projects/new" icon="add">New project</InkLink>}
      />

      {/* Summary — the headline figures */}
      <section>
        <SectionHeading>Summary</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <FigureBlock
            label="Ongoing projects"
            value={kpis.activeProjects}
            icon="folder_open"
            hint={`of ${projects.length} total`}
            href="/projects?status=ACTIVE"
          />
          <FigureBlock
            label="Completed projects"
            value={kpis.completedProjects}
            icon="verified"
            hint={`of ${projects.length} total`}
            href="/projects?status=COMPLETED"
          />
          <FigureBlock
            label="Ongoing milestones"
            value={kpis.activeMilestones}
            icon="flag"
            hint={`of ${allMilestones.length} total`}
            href="/milestones?status=draft"
          />
          <FigureBlock
            label="Milestones reviewed"
            value={kpis.milestonesReviewed}
            icon="check_circle"
            hint={`of ${allMilestones.length} total`}
            href="/milestones?status=reviewed"
          />
          <FigureBlock
            label="Awaiting client review"
            value={kpis.awaitingReview}
            icon="hourglass_top"
            tone={kpis.awaitingReview > 0 ? "warn" : undefined}
            hint={`of ${allMilestones.length} total`}
            href="/milestones?status=sent"
          />
          <FigureBlock
            label="Overdue milestones"
            value={overdueCount}
            icon="event_busy"
            tone={overdueCount > 0 ? "bad" : undefined}
            hint={`of ${allMilestones.length} total`}
            href="/milestones?status=overdue"
          />
          <FigureBlock
            label="Due soon"
            value={dueSoonCount}
            icon="schedule"
            tone={dueSoonCount > 0 ? "warn" : undefined}
            hint={`of ${allMilestones.length} total`}
            href="/milestones?flag=DUE_SOON"
          />
          <FigureBlock
            label="Avg. milestone rating"
            value={formatRating(kpis.averageMilestoneRating)}
            icon="star"
            hint={
              kpis.milestonesReviewed > 0
                ? `across ${kpis.milestonesReviewed} reviewed`
                : "none reviewed yet"
            }
            href="/milestones?status=reviewed"
          />
          <FigureBlock
            label="Client satisfaction rate"
            value={formatPercent(kpis.clientSatisfactionRate)}
            icon="thumb_up"
            hint={
              kpis.milestonesReviewed > 0
                ? `across ${kpis.milestonesReviewed} reviewed`
                : "none reviewed yet"
            }
            info={`Share of reviewed milestones the client rated ${SATISFIED_RATING_THRESHOLD.toFixed(1)} or higher out of 5.`}
          />
          <FigureBlock
            label="At-risk projects"
            value={kpis.atRiskProjects}
            icon="warning"
            tone={kpis.atRiskProjects > 0 ? "bad" : undefined}
            hint={`of ${projects.length} total`}
            href="/projects?health=AT_RISK"
          />
        </div>
      </section>

      {/* Attention — its own full-width row, tinted so the eye lands here first */}
      <section className="mt-10">
        <SectionHeading
          action={
            alerts.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--rag-warn-bg,rgba(127,95,1,0.12))] px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-rag-warn">
                {alerts.length} open
              </span>
            ) : null
          }
        >
          Attention
        </SectionHeading>
        {alerts.length === 0 ? (
          <p className="flex items-center gap-1.5 rounded-ledger border border-rule bg-panel px-3 py-2.5 text-sm text-ink-muted">
            <Icon name="check_circle" className="text-[15px] text-rag-good" fill />
            Nothing needs attention.
          </p>
        ) : (
          <DashboardAlerts alerts={alerts} />
        )}
      </section>

      {/* Rating trend — full-width row beneath */}
      <section className="mt-10">
        <SectionHeading>Rating trend</SectionHeading>
        <div className="rounded-ledger border border-rule bg-panel px-3 pb-2 pt-3">
          <TrendChart samples={ratingSamples} />
        </div>
      </section>

      {/* Breakdowns — Jira-style summary cards */}
      <section className="mt-10">
        <SectionHeading>Breakdowns</SectionHeading>
        <DashboardBreakdowns projects={projects} />
      </section>

      {/* Client ledger */}
      <section className="mt-10">
        <SectionHeading
          action={
            needingAttention > 0 ? (
              <span className="font-mono text-xs tabular-nums text-rag-warn">
                {needingAttention} need attention
              </span>
            ) : (
              <span className="font-mono text-xs tabular-nums text-ink-muted">
                {clientGroups.length} nominal
              </span>
            )
          }
        >
          Client ledger
        </SectionHeading>
        <DashboardLedger groups={clientGroups} />
      </section>
    </div>
  );
}

function FigureBlock({
  label,
  value,
  icon,
  hint,
  tone,
  href,
  info,
}: {
  label: string;
  value: string | number;
  icon: string;
  hint?: string;
  tone?: "warn" | "bad";
  href?: string;
  info?: string;
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
          {info ? (
            <span title={info} className="inline-flex text-ink-subtle">
              <Icon name="info" className="text-[13px]" />
            </span>
          ) : null}
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
