import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listProjectsWithMilestones } from "@/lib/data";
import {
  computeAlerts,
  computeDashboardKpis,
  computeProjectPerformance,
  computeRatingTrend,
} from "@/lib/derived";
import { formatDate, formatPercent, formatRating } from "@/lib/format";
import { Badge, Card, EmptyState, HealthBadge, PageHeader, ProjectStatusBadge, SectionHeading, StatCard } from "@/components/ui";
import { TrendChart } from "@/components/TrendChart";

// Live metrics — always render against the current database, never a build snapshot.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser("vendor");
  const projects = await listProjectsWithMilestones({ vendorUserId: user.id });

  if (projects.length === 0) {
    return (
      <div>
        <PageHeader title="Performance Monitoring Dashboard" />
        <EmptyState
          title="Start monitoring client delivery performance"
          description="Create your first client project, break it into milestones, collect client reviews, and track performance over time."
          actionHref="/projects/new"
          actionLabel="Create Project"
        />
      </div>
    );
  }

  const kpis = computeDashboardKpis(projects, null);
  const alerts = computeAlerts(projects);
  const trend = computeRatingTrend(projects);

  const table = projects
    .map((p) => ({ project: p, perf: computeProjectPerformance(p) }))
    .sort((a, b) => {
      const lastA = a.project.milestones.reduce(
        (acc, m) => Math.max(acc, m.updatedAt.getTime()),
        a.project.updatedAt.getTime(),
      );
      const lastB = b.project.milestones.reduce(
        (acc, m) => Math.max(acc, m.updatedAt.getTime()),
        b.project.updatedAt.getTime(),
      );
      return lastB - lastA;
    });

  return (
    <div>
      <PageHeader
        title="Performance Monitoring Dashboard"
        description="Delivery performance and client satisfaction across all private projects."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard label="Active Projects" value={kpis.activeProjects} />
        <StatCard label="Active Milestones" value={kpis.activeMilestones} />
        <StatCard label="Milestones Reviewed" value={kpis.milestonesReviewed} />
        <StatCard
          label="Awaiting Review"
          value={kpis.awaitingReview}
          tone={kpis.awaitingReview > 0 ? "amber" : "slate"}
        />
        <StatCard label="Avg. Milestone Rating" value={formatRating(kpis.averageMilestoneRating)} />
        <StatCard label="Client Satisfaction Rate" value={formatPercent(kpis.clientSatisfactionRate)} />
        <StatCard
          label="At-Risk Projects"
          value={kpis.atRiskProjects}
          tone={kpis.atRiskProjects > 0 ? "red" : "slate"}
        />
      </div>

      {alerts.length > 0 ? (
        <div className="mt-6">
          <SectionHeading>Attention Required</SectionHeading>
          <div className="space-y-2">
            {alerts.map((a) => (
              <Link
                key={a.id}
                href={a.href}
                className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                  a.severity === "critical"
                    ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
                    : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                }`}
              >
                <span className="font-medium">{a.message}</span>
                <span aria-hidden>→</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionHeading>Average Milestone Rating — Last 6 Months</SectionHeading>
          <TrendChart points={trend} />
        </Card>

        <Card className="p-4">
          <SectionHeading>Client Health</SectionHeading>
          <ul className="space-y-2">
            {table.map(({ project, perf }) => (
              <li key={project.id} className="flex items-center justify-between text-sm">
                <Link href={`/projects/${project.id}`} className="truncate text-slate-700 hover:underline dark:text-slate-200">
                  {project.clientCompanyName}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">{formatRating(perf.latestRating)}</span>
                  <HealthBadge health={perf.health} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <SectionHeading>Project Performance</SectionHeading>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Active Milestones</th>
                <th className="px-4 py-3 font-medium text-right">Total Milestones</th>
                <th className="px-4 py-3 font-medium text-right">Avg. Rating</th>
                <th className="px-4 py-3 font-medium text-right">Latest Rating</th>
                <th className="px-4 py-3 font-medium">Client Health</th>
                <th className="px-4 py-3 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {table.map(({ project, perf }) => (
                <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${project.id}`} className="font-medium text-blue-600 hover:underline">
                      {project.name}
                    </Link>
                    {project.visibility === "PUBLIC" ? (
                      <span className="ml-2">
                        <Badge tone="blue">Public</Badge>
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{project.clientCompanyName}</td>
                  <td className="px-4 py-3">
                    <ProjectStatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3 text-right">{perf.activeMilestones}</td>
                  <td className="px-4 py-3 text-right">{perf.totalMilestones}</td>
                  <td className="px-4 py-3 text-right">{formatRating(perf.avgRating)}</td>
                  <td className="px-4 py-3 text-right">{formatRating(perf.latestRating)}</td>
                  <td className="px-4 py-3">
                    <HealthBadge health={perf.health} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(project.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
