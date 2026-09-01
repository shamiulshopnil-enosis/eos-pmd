import Link from "next/link";
import { listProjectsAwaitingCompletionTimeout, listProjectsForAdmin } from "@/lib/data";
import { forceCompleteProject } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import { COMPLETION_TIMEOUT_DAYS } from "@/lib/constants";
import { AdminStatusBadge, Card, EmptyState, PageHeader, ProjectTypeBadge, SectionHeading } from "@/components/ui";

const NEEDS_REVIEW = new Set(["pending_approval", "edited"]);

export default async function AdminProjectsPage() {
  const projects = await listProjectsForAdmin();
  const pending = projects.filter((p) => NEEDS_REVIEW.has(p.adminStatus));
  const decided = projects.filter((p) => !NEEDS_REVIEW.has(p.adminStatus));
  const timedOut = await listProjectsAwaitingCompletionTimeout(COMPLETION_TIMEOUT_DAYS);

  return (
    <div>
      <PageHeader title="Project Approvals" description="Approve or reject the project shell. Milestones are never reviewed here." />

      <SectionHeading>Awaiting review ({pending.length})</SectionHeading>
      {pending.length === 0 ? (
        <EmptyState title="Nothing awaiting review" description="Submitted and re-edited projects show up here." />
      ) : (
        <ProjectTable rows={pending} />
      )}

      <div className="mt-8">
        <SectionHeading>
          Completion timeout ({timedOut.length})
        </SectionHeading>
        <p className="mb-3 text-xs text-slate-400">
          Projects where the client has not confirmed completion within {COMPLETION_TIMEOUT_DAYS} days of the vendor&apos;s
          request (spec §6.8). Force-complete uses whatever milestone ratings exist.
        </p>
        {timedOut.length === 0 ? (
          <p className="text-sm text-slate-400">None past the {COMPLETION_TIMEOUT_DAYS}-day window.</p>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Requested</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {timedOut.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/projects/${p.id}`} className="font-medium text-blue-600 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.clientCompanyName}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {formatDateTime(p.completionRequestedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={forceCompleteProject.bind(null, p.id)}>
                        <button
                          type="submit"
                          className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700"
                        >
                          Force-complete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <div className="mt-8">
        <SectionHeading>All projects</SectionHeading>
        {decided.length === 0 ? (
          <p className="text-sm text-slate-400">No other projects.</p>
        ) : (
          <ProjectTable rows={decided} />
        )}
      </div>
    </div>
  );
}

function ProjectTable({
  rows,
}: {
  rows: Awaited<ReturnType<typeof listProjectsForAdmin>>;
}) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Project</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Approval</th>
            <th className="px-4 py-3 font-medium">Last updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3">
                <Link href={`/admin/projects/${p.id}`} className="font-medium text-blue-600 hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.clientCompanyName}</td>
              <td className="px-4 py-3">
                <ProjectTypeBadge type={p.projectType} />
              </td>
              <td className="px-4 py-3">
                <AdminStatusBadge status={p.adminStatus} />
              </td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDateTime(p.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
