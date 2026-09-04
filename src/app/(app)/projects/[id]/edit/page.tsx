import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject } from "@/lib/data";
import { canManageProject } from "@/lib/permissions";
import { updateProject } from "@/lib/actions";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import { toDateInputValue } from "@/lib/format";
import { Field, FormActions, Select, SubmitButton, TextArea, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { SetBreadcrumb } from "@/components/Breadcrumbs";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const project = await getProject(id);
  if (!project || !canManageProject(project)) notFound();

  const action = updateProject.bind(null, project.id);

  return (
    <div className="mx-auto max-w-3xl">
      <SetBreadcrumb entries={{ [`/projects/${project.id}`]: project.name }} />
      <PageHeader
        title={`Edit project — ${project.name}`}
        back={{ href: `/projects/${project.id}`, label: "Back to project" }}
      />

      <Card className="p-6">
        <ActionForm action={action} success="Project updated." className="space-y-6">
          <Field label="Project name" required>
            <TextInput name="name" required defaultValue={project.name} placeholder="e.g. E-commerce Platform Development" />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Client company name" required>
              <TextInput name="clientCompanyName" required defaultValue={project.clientCompanyName} placeholder="e.g. Big Step Solutions" />
            </Field>
            <Field label="Client contact name" optional>
              <TextInput name="clientContactName" defaultValue={project.clientContactName ?? ""} placeholder="e.g. Dana Reid" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Client email" required>
              <TextInput type="email" name="clientEmail" required defaultValue={project.clientEmail} placeholder="dana@bigstep.com" />
            </Field>
            <Field label="Project services" optional hint="Comma-separated">
              <TextInput name="services" defaultValue={project.services ?? ""} placeholder="Mobile Development, QA" />
            </Field>
          </div>

          <Field label="Project description / scope" optional>
            <TextArea name="description" rows={4} defaultValue={project.description ?? ""} placeholder="What is this engagement about? Goals, scope, anything the team should know." />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Start date" optional width="sm">
              <TextInput type="date" name="startDate" defaultValue={toDateInputValue(project.startDate)} />
            </Field>
            <Field label="Expected completion" optional width="sm">
              <TextInput type="date" name="expectedCompletionDate" defaultValue={toDateInputValue(project.expectedCompletionDate)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Team size" optional width="xs">
              <TextInput type="number" min={1} name="teamSize" defaultValue={project.teamSize ?? ""} placeholder="e.g. 4" />
            </Field>
            <Field label="Engagement model" optional>
              <TextInput name="engagementModel" defaultValue={project.engagementModel ?? ""} placeholder="e.g. Offshore, Dedicated Team" />
            </Field>
            <Field label="Project status">
              <Select name="status" defaultValue={project.status} options={Object.entries(PROJECT_STATUS_LABELS)} placeholder="Select a status…" />
            </Field>
          </div>

          <Field label="Project URL" optional hint="Live link, repo, or case study.">
            <TextInput type="url" name="projectUrl" defaultValue={project.projectUrl ?? ""} placeholder="https://…" />
          </Field>

          <FormActions>
            <SubmitButton>Save changes</SubmitButton>
          </FormActions>
        </ActionForm>
      </Card>
    </div>
  );
}
