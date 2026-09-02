import Link from "next/link";
import { createProject } from "@/lib/actions";
import { getMyCompany, listCompanyMembers, searchCompanies } from "@/lib/data";
import { Field, SubmitButton, TextArea, TextInput } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";
import CompanyPicker from "@/components/CompanyPicker";
import PeoplePicker from "@/components/PeoplePicker";
import ProjectMilestonesField from "@/components/ProjectMilestonesField";

export default async function NewProjectPage() {
  const company = await getMyCompany();
  const [companies, members] = await Promise.all([
    searchCompanies(),
    listCompanyMembers(company.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New Private Project"
        description="Private by default — nothing here is visible outside your company until you choose to publish it (PRD §18)."
        back={{ href: "/projects", label: "Back to Projects" }}
      />

      <Card className="p-6">
        <form action={createProject} className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Project Type</legend>
            <label className="flex gap-3 rounded-lg border border-slate-300 p-3 dark:border-slate-700">
              <input type="radio" name="projectType" value="milestone" defaultChecked className="mt-0.5" />
              <span className="text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-100">Milestone Project</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Broken into milestones. The client rates each milestone as it completes; the project score is the
                  average of those ratings.
                </span>
              </span>
            </label>
            <label className="flex gap-3 rounded-lg border border-slate-300 p-3 dark:border-slate-700">
              <input type="radio" name="projectType" value="whole" className="mt-0.5" />
              <span className="text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-100">Whole Project</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  One client review after the whole project is delivered. How projects work today.
                </span>
              </span>
            </label>
          </fieldset>

          <Field label="Project Name" required>
            <TextInput name="name" required placeholder="e.g. E-commerce Platform Development" />
          </Field>

          <Field
            label="Client Company"
            required
            hint="Search the directory, or add a new company."
          >
            <CompanyPicker companies={companies} />
          </Field>

          <Field label="Project Services" hint="Comma-separated, e.g. Mobile Development, QA">
            <TextInput name="services" placeholder="Mobile Application Development" />
          </Field>

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

          <fieldset className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">Assign people</legend>
            <p className="text-xs text-slate-400">
              You are added as the project owner automatically. Search your company&apos;s{" "}
              <Link href="/team" className="text-blue-600 hover:underline">
                people directory
              </Link>{" "}
              and add whoever works on this project — only they (plus your company&apos;s owners and
              admins) will see it. You can change this later on the project&apos;s People page.
            </p>
            <PeoplePicker members={members} name="memberIds" />
          </fieldset>

          <ProjectMilestonesField />

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <SubmitButton>Create Project</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
