import Link from "next/link";
import { createProject } from "@/lib/actions";
import { getMyCompany, listCompanyMembers, searchCompanies } from "@/lib/data";
import { Field, FormActions, RadioCards, SubmitButton, TextArea, TextInput } from "@/components/form";
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
        title="New private project"
        description="Private by default — nothing here is visible outside your company until you choose to publish it."
        back={{ href: "/projects", label: "All projects" }}
      />

      <Card className="p-6">
        <form action={createProject} className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-ink-muted">
              Project type
            </legend>
            <RadioCards
              name="projectType"
              defaultValue="milestone"
              options={[
                {
                  value: "milestone",
                  label: "Milestone project",
                  description:
                    "Broken into milestones. The client rates each milestone as it completes; the project score is the average of those ratings.",
                },
                {
                  value: "whole",
                  label: "Whole project",
                  description:
                    "One client review after the whole project is delivered. How projects work today.",
                },
              ]}
            />
          </fieldset>

          <Field label="Project name" required>
            <TextInput name="name" required placeholder="e.g. E-commerce Platform Development" />
          </Field>

          <Field label="Client company" required hint="Search the directory, or add a new company.">
            <CompanyPicker companies={companies} />
          </Field>

          <Field label="Project services" hint="Comma-separated, e.g. Mobile Development, QA">
            <TextInput name="services" placeholder="Mobile Application Development" />
          </Field>

          <Field label="Project description / scope">
            <TextArea name="description" rows={4} placeholder="What is this engagement about?" />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Start date">
              <TextInput type="date" name="startDate" />
            </Field>
            <Field label="Expected completion date">
              <TextInput type="date" name="expectedCompletionDate" />
            </Field>
            <Field label="Team size">
              <TextInput type="number" min={1} name="teamSize" placeholder="e.g. 4" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Engagement model">
              <TextInput name="engagementModel" placeholder="e.g. Offshore, Dedicated Team" />
            </Field>
            <Field label="Internal project reference / ID">
              <TextInput name="internalRef" placeholder="e.g. WAV-2026-014" />
            </Field>
          </div>

          <Field label="Project URL" hint="Optional — live link, repo, or case study.">
            <TextInput type="url" name="projectUrl" placeholder="https://…" />
          </Field>

          <fieldset className="space-y-3 border-t border-rule pt-5">
            <legend className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-ink-muted">
              Assign people
            </legend>
            <p className="text-xs text-ink-muted">
              You are added as the project owner automatically. Search your company&apos;s{" "}
              <Link href="/team" className="text-link hover:text-link-strong">
                people directory
              </Link>{" "}
              and add whoever works on this project — only they (plus your company&apos;s owners and
              admins) will see it. You can change this later on the project&apos;s People page.
            </p>
            <PeoplePicker members={members} name="memberIds" />
          </fieldset>

          <ProjectMilestonesField />

          <FormActions>
            <SubmitButton>Create project</SubmitButton>
          </FormActions>
        </form>
      </Card>
    </div>
  );
}
