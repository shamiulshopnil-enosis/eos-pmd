import { notFound } from "next/navigation";
import { getProject } from "@/lib/data";
import { approveProject, rejectProject } from "@/lib/actions";
import { formatDate } from "@/lib/format";
import { AdminStatusBadge, Card, PageHeader, ProjectTypeBadge } from "@/components/ui";

export default async function AdminProjectReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {project.name}
            <ProjectTypeBadge type={project.projectType} />
            <AdminStatusBadge status={project.adminStatus} />
          </span>
        }
        description="Review the project shell only. Milestones are not part of this approval."
        back={{ href: "/admin/projects", label: "Back to Approvals" }}
      />

      <Card className="p-6">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <Row label="Client company" value={project.clientCompanyName} />
          <Row label="Client contact" value={project.clientContactName} />
          <Row label="Client email" value={project.clientEmail} />
          <Row label="Services" value={project.services} />
          <Row label="Engagement model" value={project.engagementModel} />
          <Row label="Team size" value={project.teamSize?.toString() ?? null} />
          <Row label="Start date" value={formatDate(project.startDate)} />
          <Row label="Expected completion" value={formatDate(project.expectedCompletionDate)} />
        </dl>
        {project.description ? (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Description</div>
            <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{project.description}</p>
          </div>
        ) : null}

        <div className="mt-6 flex gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          <form action={approveProject.bind(null, project.id)}>
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Approve
            </button>
          </form>
          <form action={rejectProject.bind(null, project.id)}>
            <button
              type="submit"
              className="inline-flex items-center rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
            >
              Reject
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-700 dark:text-slate-200">{value || "—"}</dd>
    </div>
  );
}
