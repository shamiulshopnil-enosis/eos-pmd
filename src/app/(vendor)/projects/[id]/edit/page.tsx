import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateProject } from "@/lib/actions";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import { toDateInputValue } from "@/lib/format";
import { Field, Select, SubmitButton, TextArea, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  const action = updateProject.bind(null, project.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Edit Project — ${project.name}`} back={{ href: `/projects/${project.id}`, label: "Back to Project" }} />

      <Card className="p-6">
        <form action={action} className="space-y-5">
          <Field label="Project Name" required>
            <TextInput name="name" required defaultValue={project.name} />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Client Company Name" required>
              <TextInput name="clientCompanyName" required defaultValue={project.clientCompanyName} />
            </Field>
            <Field label="Client Contact Name">
              <TextInput name="clientContactName" defaultValue={project.clientContactName ?? ""} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Client Email" required>
              <TextInput type="email" name="clientEmail" required defaultValue={project.clientEmail} />
            </Field>
            <Field label="Project Services">
              <TextInput name="services" defaultValue={project.services ?? ""} />
            </Field>
          </div>

          <Field label="Project Description / Scope">
            <TextArea name="description" rows={4} defaultValue={project.description ?? ""} />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Start Date">
              <TextInput type="date" name="startDate" defaultValue={toDateInputValue(project.startDate)} />
            </Field>
            <Field label="Expected Completion Date">
              <TextInput type="date" name="expectedCompletionDate" defaultValue={toDateInputValue(project.expectedCompletionDate)} />
            </Field>
            <Field label="Actual Completion Date">
              <TextInput type="date" name="actualCompletionDate" defaultValue={toDateInputValue(project.actualCompletionDate)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Team Size">
              <TextInput type="number" min={1} name="teamSize" defaultValue={project.teamSize ?? ""} />
            </Field>
            <Field label="Engagement Model">
              <TextInput name="engagementModel" defaultValue={project.engagementModel ?? ""} />
            </Field>
            <Field label="Project Status">
              <Select name="status" defaultValue={project.status}>
                {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Internal Project Reference / ID">
              <TextInput name="internalRef" defaultValue={project.internalRef ?? ""} />
            </Field>
            <Field label="Project URL">
              <TextInput type="url" name="projectUrl" defaultValue={project.projectUrl ?? ""} />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <SubmitButton>Save Changes</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
