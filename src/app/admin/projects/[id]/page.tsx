import { notFound } from "next/navigation";
import { getProject } from "@/lib/data";
import { approveProject, rejectProject } from "@/lib/actions";
import { formatDate } from "@/lib/format";
import { AdminStatusBadge, Card, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { ActionForm } from "@/components/ActionForm";
import { SetBreadcrumb } from "@/components/Breadcrumbs";

export default async function AdminProjectReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <SetBreadcrumb entries={{ [`/admin/projects/${id}`]: project.name }} />
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {project.name}
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
          <div className="mt-4 border-t border-rule pt-4">
            <div className="mb-1 text-xs font-medium text-ink-muted">Description</div>
            <p className="whitespace-pre-line text-sm text-ink-muted">{project.description}</p>
          </div>
        ) : null}

        <div className="mt-6 flex gap-3 border-t border-rule pt-5">
          <ActionForm action={approveProject.bind(null, project.id)} success="Project approved.">
            <SubmitButton icon="pi pi-check">Approve</SubmitButton>
          </ActionForm>
          <ActionForm action={rejectProject.bind(null, project.id)} success="Project rejected.">
            <SubmitButton variant="outlined" icon="pi pi-times">Reject</SubmitButton>
          </ActionForm>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className="text-ink">{value || "—"}</dd>
    </div>
  );
}
