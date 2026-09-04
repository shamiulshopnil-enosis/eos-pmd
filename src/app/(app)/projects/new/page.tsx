import { addCompanyPerson, createProject } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { getMyCompany, listCompanyMembers, searchCompanies } from "@/lib/data";
import { Field, FormActions, SubmitButton, TextArea, TextInput } from "@/components/form";
import { ActionForm } from "@/components/ActionForm";
import { Card, PageHeader } from "@/components/ui";
import CompanyPicker from "@/components/CompanyPicker";
import NewProjectStaffing from "@/components/NewProjectStaffing";

export default async function NewProjectPage() {
  const user = await requireUser();
  const company = await getMyCompany();
  const [companies, members] = await Promise.all([
    searchCompanies(),
    listCompanyMembers(company.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New private project"
        description="Private by default. Nothing here is visible outside your company until you choose to publish it."
        back={{ href: "/projects", label: "All projects" }}
      />

      <Card className="p-6">
        <ActionForm action={createProject} error="Couldn't create the project. Check the required fields." className="space-y-6">
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
            <Field label="Project URL" hint="Optional: live link, repo, or case study.">
              <TextInput type="url" name="projectUrl" placeholder="https://…" />
            </Field>
          </div>

          <NewProjectStaffing
            directory={members}
            addPerson={addCompanyPerson.bind(null, company.id)}
            currentUser={{ email: user.email, name: user.name }}
          />

          <FormActions>
            <SubmitButton>Create project</SubmitButton>
          </FormActions>
        </ActionForm>
      </Card>
    </div>
  );
}
