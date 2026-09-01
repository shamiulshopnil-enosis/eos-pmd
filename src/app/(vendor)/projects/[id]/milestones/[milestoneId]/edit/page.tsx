import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMilestone, getProject } from "@/lib/data";
import { isVendorTeamMember } from "@/lib/permissions";
import { updateMilestone } from "@/lib/actions";
import { toDateInputValue } from "@/lib/format";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";
import { RichTextField } from "@/components/RichTextField";

export default async function EditMilestonePage({
  params,
}: {
  params: Promise<{ id: string; milestoneId: string }>;
}) {
  const { id, milestoneId } = await params;
  const user = await requireUser("vendor");
  const [milestone, project] = await Promise.all([getMilestone(milestoneId), getProject(id)]);
  if (!milestone || milestone.projectId !== id || !project || !isVendorTeamMember(user, project)) notFound();

  const backHref = `/projects/${id}/milestones/${milestoneId}`;

  if (milestone.status === "sent") {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={`Edit Milestone — ${milestone.title}`} back={{ href: backHref, label: "Back to Milestone" }} />
        <Card className="p-6 text-sm text-slate-600 dark:text-slate-300">
          This milestone is locked for editing while it is with the client for review.{" "}
          <Link href={backHref} className="text-blue-600 hover:underline">
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
        <form action={action} className="space-y-5">
          <Field label="Milestone Title" required>
            <TextInput name="title" required defaultValue={milestone.title} />
          </Field>

          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</span>
            <RichTextField name="description" defaultValue={milestone.description} placeholder="Features and deliverables in this milestone…" />
            <span className="mt-1 block text-xs text-slate-400">Supports bold and bulleted lists.</span>
          </div>

          <Field label="Target Date">
            <TextInput type="date" name="targetDate" defaultValue={toDateInputValue(milestone.targetDate)} />
          </Field>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <SubmitButton>Save Changes</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
