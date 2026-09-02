import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMilestone, getProject } from "@/lib/data";
import { canAccessDelivery } from "@/lib/permissions";
import { updateMilestone } from "@/lib/actions";
import { toDateInputValue } from "@/lib/format";
import { Field, SubmitButton, TextInput } from "@/components/form";
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
      <PageHeader title={`Edit Milestone — ${milestone.title}`} back={{ href: backHref, label: "Back to Milestone" }} />

      <Card className="p-6">
        <ActionForm action={action} className="space-y-5">
          <Field label="Milestone Title" required>
            <TextInput name="title" required defaultValue={milestone.title} />
          </Field>

          <div>
            <span className="mb-1 block text-sm font-medium text-ink">Description</span>
            <RichTextField name="description" defaultValue={milestone.description} placeholder="Features and deliverables in this milestone…" />
            <span className="mt-1 block text-xs text-ink-muted">Supports bold and bulleted lists.</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Start Date">
              <TextInput type="date" name="startDate" defaultValue={toDateInputValue(milestone.startDate)} />
            </Field>
            <Field label="Due Date">
              <TextInput type="date" name="dueDate" defaultValue={toDateInputValue(milestone.dueDate)} />
            </Field>
            <Field label="URL" hint="Optional — repo, demo, or spec link.">
              <TextInput type="url" name="url" defaultValue={milestone.url ?? ""} placeholder="https://…" />
            </Field>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-ink">Assign to</legend>
            <AssigneeCheckboxes
              people={project.vendorTeam}
              defaultSelectedEmails={milestone.assignees.map((a) => a.email)}
            />
          </fieldset>

          <div className="flex items-center justify-end gap-3 border-t border-rule pt-5">
            <SubmitButton>Save Changes</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
