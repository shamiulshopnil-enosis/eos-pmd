import { listProjectsAwaitingCompletionTimeout, listProjectsForAdmin } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { COMPLETION_TIMEOUT_DAYS } from "@/lib/constants";
import { EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import {
  AdminProjectsTable,
  AdminTimeoutTable,
  type AdminProjectRow,
  type TimeoutRow,
} from "@/components/AdminProjectsTable";

const NEEDS_REVIEW = new Set(["pending_approval", "edited"]);

export default async function AdminProjectsPage() {
  const projects = await listProjectsForAdmin();
  const pending = projects.filter((p) => NEEDS_REVIEW.has(p.adminStatus));
  const decided = projects.filter((p) => !NEEDS_REVIEW.has(p.adminStatus));
  const timedOut = await listProjectsAwaitingCompletionTimeout(COMPLETION_TIMEOUT_DAYS);

  const toRow = (p: (typeof projects)[number]): AdminProjectRow => ({
    id: p.id,
    name: p.name,
    clientCompanyName: p.clientCompanyName,
    adminStatus: p.adminStatus,
    updatedAt: formatDateTime(p.updatedAt),
  });

  const timeoutRows: TimeoutRow[] = timedOut.map((p) => ({
    id: p.id,
    name: p.name,
    clientCompanyName: p.clientCompanyName,
    completionRequestedAt: formatDateTime(p.completionRequestedAt),
  }));

  return (
    <div>
      <PageHeader title="Project Approvals" description="Approve or reject the project shell. Milestones are never reviewed here." />

      <SectionHeading>Awaiting review ({pending.length})</SectionHeading>
      {pending.length === 0 ? (
        <EmptyState title="Nothing awaiting review" description="Submitted and re-edited projects show up here." />
      ) : (
        <AdminProjectsTable rows={pending.map(toRow)} />
      )}

      <div className="mt-8">
        <SectionHeading>Completion timeout ({timedOut.length})</SectionHeading>
        <p className="mb-3 text-xs text-ink-muted">
          Projects where the client has not confirmed completion within {COMPLETION_TIMEOUT_DAYS} days of the vendor&apos;s
          request. Force-complete uses whatever milestone ratings exist.
        </p>
        {timedOut.length === 0 ? (
          <p className="text-sm text-ink-muted">None past the {COMPLETION_TIMEOUT_DAYS}-day window.</p>
        ) : (
          <AdminTimeoutTable rows={timeoutRows} />
        )}
      </div>

      <div className="mt-8">
        <SectionHeading>All projects</SectionHeading>
        {decided.length === 0 ? (
          <p className="text-sm text-ink-muted">No other projects.</p>
        ) : (
          <AdminProjectsTable rows={decided.map(toRow)} />
        )}
      </div>
    </div>
  );
}
