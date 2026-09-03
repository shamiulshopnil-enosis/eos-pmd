"use client";

import { Button } from "primereact/button";
import { addCompanyMember, removeCompanyMember, updateCompanyMember } from "@/lib/actions";
import type { Company, CompanyMember } from "@/lib/types";
import { Badge, Card, SectionHeading } from "@/components/ui";
import { Field, Select, TextInput } from "@/components/form";
import { ActionForm } from "@/components/ActionForm";

const ROLE_OPTIONS: [string, string][] = [
  ["member", "Member"],
  ["admin", "Admin"],
  ["owner", "Owner"],
];

/**
 * People management for one company — the company's directory of members.
 * Every control is a PrimeReact widget; each mutation shows a flag.
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
      <Card>
        <SectionHeading>People</SectionHeading>
        {members.length === 0 ? (
          <p className="mb-4 text-sm text-ink-muted">No people yet. Add your first teammate below.</p>
        ) : (
          <ul className="mb-4 divide-y divide-rule text-sm">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="text-ink">
                  {m.name ? `${m.name} · ` : ""}
                  {m.email}
                  <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                    <Badge tone={m.role === "owner" ? "blue" : m.role === "admin" ? "purple" : "slate"}>{m.role}</Badge>
                    <Badge tone={m.invitePending ? "amber" : "green"}>
                      {m.invitePending ? "Not signed in" : "Active"}
                    </Badge>
                  </span>
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <ActionForm
                    action={updateCompanyMember.bind(null, company.id, m.id)}
                    success="Role updated."
                    className="flex items-center gap-2"
                  >
                    <div className="w-32">
                      <Select name="role" defaultValue={m.role} options={ROLE_OPTIONS} />
                    </div>
                    <Button type="submit" text size="small" label="Save" />
                  </ActionForm>
                  <ActionForm
                    action={removeCompanyMember.bind(null, company.id, m.id)}
                    success="Person removed."
                  >
                    <Button type="submit" text severity="danger" size="small" label="Remove" />
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}

        <ActionForm
          action={addCompanyMember.bind(null, company.id)}
          success="Person added to the directory."
          className="flex flex-wrap items-end gap-3 border-t border-rule pt-4"
        >
          <Field label="Name" width="sm">
            <TextInput name="name" placeholder="e.g. Sam Carter" />
          </Field>
          <Field label="Email" required width="md">
            <TextInput type="email" name="email" required placeholder="sam@company.com" />
          </Field>
          <Field label="Role" width="xs">
            <Select name="role" defaultValue="member" options={ROLE_OPTIONS} />
          </Field>
          <Button type="submit" label="Add person" />
        </ActionForm>
        <p className="mt-3 text-xs text-ink-muted">
          A person becomes active the first time they sign in with this email. Assign people to individual projects
          from each project&apos;s People page.
        </p>
      </Card>
    </>
  );
}
