import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject } from "@/lib/data";
import { isVendorTeamMember } from "@/lib/permissions";
import { createMilestone } from "@/lib/actions";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";
import { RichTextField } from "@/components/RichTextField";

export default async function NewMilestonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("vendor");
  const project = await getProject(id);
  if (!project || !isVendorTeamMember(user, project)) notFound();
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
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</span>
            <RichTextField name="description" placeholder="Features and deliverables in this milestone…" />
            <span className="mt-1 block text-xs text-slate-400">Supports bold and bulleted lists.</span>
          </div>

          <Field label="Target Date">
            <TextInput type="date" name="targetDate" />
          </Field>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <SubmitButton>Add Milestone</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
