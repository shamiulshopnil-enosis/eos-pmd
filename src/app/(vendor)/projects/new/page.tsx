import { createProject } from "@/lib/actions";
import { Field, SubmitButton, TextArea, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New Private Project"
        description="Private by default — nothing here is visible outside your company until you choose to publish it (PRD §18)."
        back={{ href: "/projects", label: "Back to Projects" }}
      />

      <Card className="p-6">
        <form action={createProject} className="space-y-5">
          <Field label="Project Name" required>
            <TextInput name="name" required placeholder="e.g. E-commerce Platform Development" />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Client Company Name" required>
              <TextInput name="clientCompanyName" required placeholder="e.g. Gravity77 Pty Ltd" />
            </Field>
            <Field label="Client Contact Name">
              <TextInput name="clientContactName" placeholder="e.g. Saz Virk" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Client Email" required hint="Used to send release feedback requests.">
              <TextInput type="email" name="clientEmail" required placeholder="client@company.com" />
            </Field>
            <Field label="Project Services" hint="Comma-separated, e.g. Mobile Development, QA">
              <TextInput name="services" placeholder="Mobile Application Development" />
            </Field>
          </div>

          <Field label="Project Description / Scope">
            <TextArea name="description" rows={4} placeholder="What is this engagement about?" />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Start Date">
              <TextInput type="date" name="startDate" />
            </Field>
            <Field label="Expected Completion Date">
              <TextInput type="date" name="expectedCompletionDate" />
            </Field>
            <Field label="Team Size">
              <TextInput type="number" min={1} name="teamSize" placeholder="e.g. 4" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Engagement Model">
              <TextInput name="engagementModel" placeholder="e.g. Offshore, Dedicated Team" />
            </Field>
            <Field label="Internal Project Reference / ID">
              <TextInput name="internalRef" placeholder="e.g. WAV-2026-014" />
            </Field>
          </div>

          <Field label="Project URL" hint="Optional — live link, repo, or case study.">
            <TextInput type="url" name="projectUrl" placeholder="https://…" />
          </Field>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <SubmitButton>Create Project</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
