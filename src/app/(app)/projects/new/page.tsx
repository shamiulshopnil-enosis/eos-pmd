import Link from "next/link";
import { addCompanyPerson, createProject } from "@/lib/actions";
import { getMyCompany, listCompanyMembers, searchCompanies } from "@/lib/data";
import { Field, FormActions, SubmitButton, TextArea, TextInput } from "@/components/form";
import { ActionForm } from "@/components/ActionForm";
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
        <ActionForm action={createProject} error="Couldn't create the project — check the required fields." className="space-y-6">
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
            <legend className="text-xs font-semibold text-ink">
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
            <PeoplePicker
              directory={members}
              name="memberIds"
              emit="id"
              placeholder="Search your company by name or email…"
              addPerson={addCompanyPerson.bind(null, company.id)}
              addContextLabel="your company"
              emptyHint="No one added yet — you'll be the project owner regardless."
            />
          </fieldset>

          <ProjectMilestonesField
            people={members.map((m) => ({ id: m.id, email: m.email, name: m.name }))}
          />

          <FormActions>
            <SubmitButton>Create project</SubmitButton>
          </FormActions>
        </ActionForm>
      </Card>
    </div>
  );
}
