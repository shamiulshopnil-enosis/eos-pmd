import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMilestone, getProject } from "@/lib/data";
import { canAccessDelivery } from "@/lib/permissions";
import { updateMilestone } from "@/lib/actions";
import { toDateInputValue } from "@/lib/format";
import { Field, FormActions, SubmitButton, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { RichTextField } from "@/components/RichTextField";
import AssigneeCheckboxes from "@/components/AssigneeCheckboxes";

export default async function EditMilestonePage({
  params,
}: {
  params: Promise<{ id: string; milestoneId: string }>;
}) {
  const { id, milestoneId } = await params;
  await requireUser();
  const [milestone, project] = await Promise.all([getMilestone(milestoneId), getProject(id)]);
  if (!milestone || milestone.projectId !== id || !project || !canAccessDelivery(project)) notFound();

  const backHref = `/projects/${id}/milestones/${milestoneId}`;

  if (milestone.status === "sent") {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={`Edit Milestone — ${milestone.title}`} back={{ href: backHref, label: "Back to Milestone" }} />
        <Card className="p-6 text-sm text-ink-muted">
          This milestone is locked for editing while it is with the client for review.{" "}
          <Link href={backHref} className="text-link hover:underline">
            Back to the milestone
          </Link>{" "}
          to recall it first.
        </Card>
      </div>
    );
  }

  const action = updateMilestone.bind(null, id, milestoneId);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Edit milestone — ${milestone.title}`} back={{ href: backHref, label: "Back to milestone" }} />

      <Card className="p-6">
        <ActionForm action={action} success="Milestone updated." className="space-y-6">
          <Field label="Milestone title" required>
            <TextInput name="title" required defaultValue={milestone.title} placeholder="e.g. Milestone 1 — Product Catalog" />
          </Field>

          <div>
            <span className="mb-1 block text-xs font-semibold text-ink">
              Description <span className="font-normal text-ink-muted">(optional)</span>
            </span>
            <RichTextField name="description" defaultValue={milestone.description} placeholder="What's delivered in this milestone? Features, deliverables, acceptance criteria…" />
            <span className="mt-1.5 block text-xs text-ink-muted">Supports bold and bulleted lists.</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Start date" optional width="sm">
              <TextInput type="date" name="startDate" defaultValue={toDateInputValue(milestone.startDate)} />
            </Field>
            <Field label="Due date" optional width="sm">
              <TextInput type="date" name="dueDate" defaultValue={toDateInputValue(milestone.dueDate)} />
            </Field>
            <Field label="URL" optional hint="Repo, demo, or spec link.">
              <TextInput type="url" name="url" defaultValue={milestone.url ?? ""} placeholder="https://…" />
            </Field>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-xs font-semibold text-ink">
              Assign to <span className="font-normal text-ink-muted">(optional)</span>
            </legend>
            <AssigneeCheckboxes
              people={project.vendorTeam}
              defaultSelectedEmails={milestone.assignees.map((a) => a.email)}
            />
          </fieldset>

          <FormActions>
            <SubmitButton>Save changes</SubmitButton>
          </FormActions>
        </ActionForm>
      </Card>
    </div>
  );
}
