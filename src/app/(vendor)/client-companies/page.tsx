import { requireUser } from "@/lib/auth";
import { listClientCompanies } from "@/lib/data";
import { createClientCompany, deleteClientCompany, updateClientCompany } from "@/lib/actions";
import { Card, EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import { Field, TextInput } from "@/components/form";

export default async function ClientCompaniesPage() {
  await requireUser("vendor");
  const companies = await listClientCompanies();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Client Companies"
        description="A shared directory of client companies and their primary contact. When you create a project you search this list; the contact you store here is invited as the project's primary client contact."
      />

      <Card className="mb-6 p-5">
        <SectionHeading>Add a company</SectionHeading>
        <form action={createClientCompany} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company name" required>
            <TextInput name="name" required placeholder="e.g. Big Step Solutions" />
          </Field>
          <Field label="Contact person name">
            <TextInput name="contactName" placeholder="e.g. Dana Reid" />
          </Field>
          <Field label="Contact email" required>
            <TextInput type="email" name="contactEmail" required placeholder="dana@bigstep.com" />
          </Field>
          <Field label="Designation">
            <TextInput name="designation" placeholder="e.g. Product Owner" />
          </Field>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add company
            </button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <SectionHeading>Directory ({companies.length})</SectionHeading>
        {companies.length === 0 ? (
          <EmptyState
            title="No client companies yet"
            description="Add one above, or add a new company inline while creating a project."
          />
        ) : (
          <ul className="space-y-4">
            {companies.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <form
                  action={updateClientCompany.bind(null, c.id)}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  <Field label="Company name" required>
                    <TextInput name="name" required defaultValue={c.name} />
                  </Field>
                  <Field label="Contact person name">
                    <TextInput name="contactName" defaultValue={c.contactName ?? ""} />
                  </Field>
                  <Field label="Contact email" required>
                    <TextInput type="email" name="contactEmail" required defaultValue={c.contactEmail} />
                  </Field>
                  <Field label="Designation">
                    <TextInput name="designation" defaultValue={c.designation} />
                  </Field>
                  <div className="flex items-center gap-4 sm:col-span-2">
                    <button type="submit" className="text-xs font-medium text-blue-600 hover:underline">
                      Save changes
                    </button>
                  </div>
                </form>
                <form action={deleteClientCompany.bind(null, c.id)} className="mt-2">
                  <button
                    type="submit"
                    className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
