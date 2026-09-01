import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateRelease } from "@/lib/actions";
import { toDateInputValue } from "@/lib/format";
import { Field, SubmitButton, TextArea, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";

export default async function EditReleasePage({
  params,
}: {
  params: Promise<{ id: string; releaseId: string }>;
}) {
  const { id, releaseId } = await params;
  const release = await prisma.release.findUnique({ where: { id: releaseId } });
  if (!release || release.projectId !== id) notFound();

  const action = updateRelease.bind(null, id, releaseId);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Edit Release — ${release.name}`} back={{ href: `/projects/${id}/releases/${releaseId}`, label: "Back to Release" }} />

      <Card className="p-6">
        <form action={action} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Release Name" required>
              <TextInput name="name" required defaultValue={release.name} />
            </Field>
            <Field label="Release Number / Version">
              <TextInput name="versionLabel" defaultValue={release.versionLabel ?? ""} />
            </Field>
          </div>

          <Field label="Release Description">
            <TextArea name="description" rows={3} defaultValue={release.description ?? ""} />
          </Field>
          <Field label="Release Objectives">
            <TextArea name="objectives" rows={2} defaultValue={release.objectives ?? ""} />
          </Field>
          <Field label="Deliverables">
            <TextArea name="deliverables" rows={3} defaultValue={release.deliverables ?? ""} />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Release Start Date">
              <TextInput type="date" name="startDate" defaultValue={toDateInputValue(release.startDate)} />
            </Field>
            <Field label="Planned Delivery Date">
              <TextInput type="date" name="plannedDeliveryDate" defaultValue={toDateInputValue(release.plannedDeliveryDate)} />
            </Field>
            <Field label="Actual Delivery Date">
              <TextInput type="date" name="actualDeliveryDate" defaultValue={toDateInputValue(release.actualDeliveryDate)} />
            </Field>
          </div>

          <Field label="Release URL / Demo URL">
            <TextInput type="url" name="demoUrl" defaultValue={release.demoUrl ?? ""} />
          </Field>
          <Field label="Team Size">
            <TextInput type="number" min={1} name="teamSize" defaultValue={release.teamSize ?? ""} />
          </Field>

          <Field label="Client-facing Notes">
            <TextArea name="clientFacingNotes" rows={2} defaultValue={release.clientFacingNotes ?? ""} />
          </Field>
          <Field label="Internal Notes" hint="Private — never shown to the client.">
            <TextArea name="internalNotes" rows={2} defaultValue={release.internalNotes ?? ""} />
          </Field>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <SubmitButton>Save Changes</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
