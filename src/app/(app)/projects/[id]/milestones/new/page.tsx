import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject } from "@/lib/data";
import { canAccessDelivery } from "@/lib/permissions";
import { addProjectDeliveryPerson, createMilestone } from "@/lib/actions";
import { Field, FileInput, FormActions, SubmitButton, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { RichTextField } from "@/components/RichTextField";
import PeoplePicker from "@/components/PeoplePicker";

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
        title="New milestone"
        description={`Under project — ${project.name}`}
        back={{ href: `/projects/${project.id}`, label: "Back to project" }}
      />

      <Card className="p-6">
        <ActionForm action={action} success="Milestone added." className="space-y-6">
          <Field label="Milestone title" required hint="Plain text, e.g. Milestone 3 — Payment Gateway Integration">
            <TextInput name="title" required placeholder="e.g. Milestone 1 — Product Catalog" />
          </Field>

          <div>
            <span className="mb-1 block text-xs font-semibold text-ink">
              Description <span className="font-normal text-ink-muted">(optional)</span>
            </span>
            <RichTextField name="description" placeholder="What's delivered in this milestone? Features, deliverables, acceptance criteria…" />
            <span className="mt-1.5 block text-xs text-ink-muted">Supports bold and bulleted lists.</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Start date" optional width="sm">
              <TextInput type="date" name="startDate" />
            </Field>
            <Field label="Due date" optional width="sm">
              <TextInput type="date" name="dueDate" />
            </Field>
            <Field label="URL" optional hint="Repo, demo, or spec link.">
              <TextInput type="url" name="url" placeholder="https://…" />
            </Field>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-xs font-semibold text-ink">
              Assign to <span className="font-normal text-ink-muted">(optional)</span>
            </legend>
            <PeoplePicker
              directory={project.vendorTeam.map((m) => ({
                email: m.email,
                name: m.name,
                invitePending: m.invitePending,
              }))}
              name="assigneeEmails"
              emit="email"
              placeholder="Search people on this project…"
              addPerson={addProjectDeliveryPerson.bind(null, project.id)}
              addContextLabel="this project"
              emptyHint="No one assigned — search above to add people from this project."
            />
          </fieldset>

          <Field label="Files" optional hint="Up to 10 files, 15 MB each.">
            <FileInput name="files" multiple />
          </Field>

          <FormActions>
            <SubmitButton>Add milestone</SubmitButton>
          </FormActions>
        </ActionForm>
      </Card>
    </div>
  );
}
