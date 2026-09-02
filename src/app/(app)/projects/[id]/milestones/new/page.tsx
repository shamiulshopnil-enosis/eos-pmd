import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject } from "@/lib/data";
import { canAccessDelivery } from "@/lib/permissions";
import { createMilestone } from "@/lib/actions";
import { Field, FileInput, SubmitButton, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";
import { RichTextField } from "@/components/RichTextField";
import AssigneeCheckboxes from "@/components/AssigneeCheckboxes";

export default async function NewMilestonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const project = await getProject(id);
  if (!project || !canAccessDelivery(project)) notFound();
  // Whole Projects always have exactly one milestone, created with the project.
  if (project.projectType === "whole") notFound();

  const action = createMilestone.bind(null, project.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New Milestone"
        description={`Under project — ${project.name}`}
        back={{ href: `/projects/${project.id}`, label: "Back to Project" }}
      />

      <Card className="p-6">
        <form action={action} className="space-y-5">
          <Field label="Milestone Title" required hint="Plain text, e.g. Milestone 3 — Payment Gateway Integration">
            <TextInput name="title" required placeholder="Milestone 1 — Product Catalog" />
          </Field>

          <div>
            <span className="mb-1 block text-sm font-medium text-ink">Description</span>
            <RichTextField name="description" placeholder="Features and deliverables in this milestone…" />
            <span className="mt-1 block text-xs text-ink-muted">Supports bold and bulleted lists.</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Start Date">
              <TextInput type="date" name="startDate" />
            </Field>
            <Field label="Due Date">
              <TextInput type="date" name="dueDate" />
            </Field>
            <Field label="URL" hint="Optional — repo, demo, or spec link.">
              <TextInput type="url" name="url" placeholder="https://…" />
            </Field>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-ink">Assign to</legend>
            <AssigneeCheckboxes people={project.vendorTeam} />
          </fieldset>

          <Field label="Files" hint="Optional — up to 10 files, 15 MB each.">
            <FileInput name="files" multiple />
          </Field>

          <div className="flex items-center justify-end gap-3 border-t border-rule pt-5">
            <SubmitButton>Add Milestone</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
