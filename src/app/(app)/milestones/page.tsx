import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { countMilestones, listMilestonesWithProject } from "@/lib/data";
import { getMilestoneFlag, isMilestoneReviewed } from "@/lib/derived";
import { formatDate } from "@/lib/format";
import { MILESTONE_STATUS_LABELS } from "@/lib/constants";
import { Card, EmptyState, FlagBadge, MilestoneStatusBadge, PageHeader, StarRating } from "@/components/ui";
import { Select } from "@/components/form";

export default async function MilestonesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; flag?: string }>;
}) {
  const { status = "", flag = "" } = await searchParams;
  await requireUser();

  const totalCount = await countMilestones();
  const milestones = await listMilestonesWithProject({ status });

  const filtered = milestones.filter((m) => !flag || getMilestoneFlag(m) === flag);

  if (totalCount === 0) {
    return (
      <div>
        <PageHeader title="Milestones" description="All milestones across every project." />
        <EmptyState
          title="No milestones yet"
          description="Open a project and add its first milestone to start tracking delivery."
          actionHref="/projects"
          actionLabel="Go to Projects"
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Milestones" description={`${totalCount} milestone${totalCount === 1 ? "" : "s"} across all projects`} />

      <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
        <div className="w-48">
          <Select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {Object.entries(MILESTONE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select name="flag" defaultValue={flag}>
            <option value="">Any flag</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DUE_SOON">Due Soon</option>
            <option value="AWAITING_REVIEW">Awaiting Review</option>
          </Select>
        </div>
        <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          Apply
        </button>
        {(status || flag) && (
          <Link href="/milestones" className="text-sm text-slate-500 hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      {filtered.length === 0 ? (
        <EmptyState title="No milestones match your filters" description="Try adjusting or clearing the filters above." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Milestone</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Target Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${m.project.id}/milestones/${m.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {m.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <Link href={`/projects/${m.project.id}`} className="hover:underline">
                      {m.project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{m.project.clientCompanyName}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(m.targetDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <MilestoneStatusBadge status={m.status} />
                      <FlagBadge flag={getMilestoneFlag(m)} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isMilestoneReviewed(m) ? (
                      <StarRating value={m.rating} />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
