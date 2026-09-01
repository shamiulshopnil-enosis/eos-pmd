import { notFound } from "next/navigation";
import { getProject } from "@/lib/data";
import { createRelease } from "@/lib/actions";
import { Field, SubmitButton, TextArea, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";

export default async function NewReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const action = createRelease.bind(null, project.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New Release"
        description={`Under project — ${project.name}`}
        back={{ href: `/projects/${project.id}`, label: "Back to Project" }}
      />

      <Card className="p-6">
        <form action={action} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Release Name" required hint="e.g. Release 3 — Payment Gateway Integration">
              <TextInput name="name" required placeholder="Release 1 — Product Catalog" />
            </Field>
            <Field label="Release Number / Version">
              <TextInput name="versionLabel" placeholder="e.g. v1.2.0" />
            </Field>
          </div>

          <Field label="Release Description">
            <TextArea name="description" rows={3} />
          </Field>

          <Field label="Release Objectives">
            <TextArea name="objectives" rows={2} />
          </Field>

          <Field label="Deliverables">
            <TextArea name="deliverables" rows={3} placeholder="One per line" />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Release Start Date">
              <TextInput type="date" name="startDate" />
            </Field>
            <Field label="Planned Delivery Date">
              <TextInput type="date" name="plannedDeliveryDate" />
            </Field>
            <Field label="Team Size">
              <TextInput type="number" min={1} name="teamSize" />
            </Field>
          </div>

          <Field label="Release URL / Demo URL">
            <TextInput type="url" name="demoUrl" placeholder="https://…" />
          </Field>

          <Field label="Client-facing Notes" hint="Visible if this release's info is ever shared with the client.">
            <TextArea name="clientFacingNotes" rows={2} />
          </Field>

          <Field label="Internal Notes" hint="Private — never shown to the client (PRD §7, §24).">
            <TextArea name="internalNotes" rows={2} />
          </Field>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <SubmitButton>Add Release</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
