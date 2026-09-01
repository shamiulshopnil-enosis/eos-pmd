import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getReleaseFlag, isEvaluationComplete } from "@/lib/derived";
import { formatDate } from "@/lib/format";
import { RELEASE_STATUS_LABELS } from "@/lib/constants";
import { requestFeedback, resendFeedback } from "@/lib/actions";
import { Card, EmptyState, FlagBadge, PageHeader, ReleaseStatusBadge, StarRating } from "@/components/ui";
import { Select } from "@/components/form";

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; feedback?: string; flag?: string }>;
}) {
  const { status = "", feedback = "", flag = "" } = await searchParams;

  const totalCount = await prisma.release.count();

  const releases = await prisma.release.findMany({
    where: status ? { status: status as never } : {},
    include: { feedbackRequest: true, project: { select: { id: true, name: true, clientCompanyName: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const filtered = releases.filter((r) => {
    if (feedback && r.feedbackRequest?.status !== feedback) return false;
    if (flag && getReleaseFlag(r) !== flag) return false;
    return true;
  });

  if (totalCount === 0) {
    return (
      <div>
        <PageHeader title="Releases" description="All releases across every project." />
        <EmptyState title="No releases added yet" description="Create a project, then add releases to start tracking delivery performance." actionHref="/projects" actionLabel="Go to Projects" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Releases" description={`${totalCount} release${totalCount === 1 ? "" : "s"} across all projects`} />

      <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
        <div className="w-48">
          <Select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {Object.entries(RELEASE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select name="feedback" defaultValue={feedback}>
            <option value="">Any feedback status</option>
            <option value="PENDING">Awaiting Feedback</option>
            <option value="COMPLETED">Feedback Received</option>
          </Select>
        </div>
        <div className="w-40">
          <Select name="flag" defaultValue={flag}>
            <option value="">Any flag</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DUE_SOON">Due Soon</option>
          </Select>
        </div>
        <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          Apply
        </button>
        {(status || feedback || flag) && (
          <Link href="/releases" className="text-sm text-slate-500 hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      {filtered.length === 0 ? (
        <EmptyState title="No releases match your filters" description="Try adjusting or clearing the filters above." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Release</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Delivery Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Feedback</th>
                <th className="px-4 py-3 font-medium text-right">Rating</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((release) => (
                <tr key={release.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${release.project.id}/releases/${release.id}`} className="font-medium text-blue-600 hover:underline">
                      {release.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <Link href={`/projects/${release.project.id}`} className="hover:underline">
                      {release.project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{release.project.clientCompanyName}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {formatDate(release.actualDeliveryDate ?? release.plannedDeliveryDate)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ReleaseStatusBadge status={release.status} />
                      <FlagBadge flag={getReleaseFlag(release)} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {release.feedbackRequest?.status === "COMPLETED"
                      ? "Completed"
                      : release.feedbackRequest?.status === "PENDING"
                        ? "Pending"
                        : "Not requested"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEvaluationComplete(release.feedbackRequest) ? (
                      <StarRating value={release.feedbackRequest.overallSatisfaction} />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/projects/${release.project.id}/releases/${release.id}`} className="text-xs font-medium text-blue-600 hover:underline">
                        View
                      </Link>
                      {!release.feedbackRequest ? (
                        <form action={requestFeedback.bind(null, release.project.id, release.id)}>
                          <input type="hidden" name="clientEmail" value="" />
                          <button type="submit" className="text-xs font-medium text-blue-600 hover:underline">
                            Request Feedback
                          </button>
                        </form>
                      ) : release.feedbackRequest.status === "PENDING" ? (
                        <form action={resendFeedback.bind(null, release.project.id, release.id)}>
                          <button type="submit" className="text-xs font-medium text-blue-600 hover:underline">
                            Resend
                          </button>
                        </form>
                      ) : null}
                    </div>
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
