import {
  addCompanyMember,
  removeCompanyMember,
  renameCompany,
  updateCompanyMember,
} from "@/lib/actions";
import type { Company, CompanyMember } from "@/lib/types";
import { Badge, Card, SectionHeading } from "@/components/ui";
import { Field, Select, TextInput } from "@/components/form";

/**
 * People management for one company — the company's directory of members.
 * Rendered on the "My Company" workspace. Individual people are assigned to
 * projects from the project's own People page.
 */
export default function CompanyManager({
  company,
  members,
}: {
  company: Company;
  members: CompanyMember[];
}) {
  return (
    <>
      <Card className="mb-6 p-5">
        <SectionHeading>Company</SectionHeading>
        <form action={renameCompany.bind(null, company.id)} className="flex flex-wrap items-end gap-3">
          <div className="w-72">
            <Field label="Name" required>
              <TextInput name="name" required defaultValue={company.name} />
            </Field>
          </div>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Save
          </button>
        </form>
      </Card>

      <Card className="p-5">
        <SectionHeading>People</SectionHeading>
        {members.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400">No people yet. Add your first teammate below.</p>
        ) : (
          <ul className="mb-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span className="text-slate-700 dark:text-slate-200">
                  {m.name ? `${m.name} · ` : ""}
                  {m.email}
                  <span className="ml-2 inline-flex gap-1">
                    <Badge tone={m.role === "owner" ? "blue" : m.role === "admin" ? "purple" : "slate"}>
                      {m.role}
                    </Badge>
                    <Badge tone={m.invitePending ? "amber" : "green"}>
                      {m.invitePending ? "Not signed in" : "Active"}
                    </Badge>
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  <form action={updateCompanyMember.bind(null, company.id, m.id)} className="flex items-center gap-2">
                    <Select name="role" defaultValue={m.role} className="!py-1 text-xs">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </Select>
                    <button type="submit" className="text-xs font-medium text-blue-600 hover:underline">
                      Save
                    </button>
                  </form>
                  <form action={removeCompanyMember.bind(null, company.id, m.id)}>
                    <button
                      type="submit"
                      className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addCompanyMember.bind(null, company.id)}
          className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"
        >
          <div className="w-48">
            <Field label="Name">
              <TextInput name="name" placeholder="e.g. Sam Carter" />
            </Field>
          </div>
          <div className="w-64">
            <Field label="Email" required>
              <TextInput type="email" name="email" required placeholder="sam@company.com" />
            </Field>
          </div>
          <div className="w-36">
            <Field label="Role">
              <Select name="role" defaultValue="member">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </Select>
            </Field>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add person
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-400">
          A person becomes active the first time they sign in with this email. Assign people to
          individual projects from each project&apos;s People page.
        </p>
      </Card>
    </>
  );
}
