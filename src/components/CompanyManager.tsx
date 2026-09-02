"use client";

import { Button } from "primereact/button";
import {
  addCompanyMember,
  removeCompanyMember,
  renameCompany,
  updateCompanyMember,
} from "@/lib/actions";
import type { Company, CompanyMember } from "@/lib/types";
import { Badge, Card, SectionHeading } from "@/components/ui";
import { Field, Select, TextInput } from "@/components/form";

const ROLE_OPTIONS: [string, string][] = [
  ["member", "Member"],
  ["admin", "Admin"],
  ["owner", "Owner"],
];

/**
 * People management for one company — the company's directory of members.
 * Every control is a PrimeReact widget.
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
      <Card className="mb-6">
        <SectionHeading>Company</SectionHeading>
        <form action={renameCompany.bind(null, company.id)} className="flex flex-wrap items-end gap-3">
          <div className="w-72">
            <Field label="Name" required>
              <TextInput name="name" required defaultValue={company.name} />
            </Field>
          </div>
          <Button type="submit" outlined severity="secondary" label="Save" />
        </form>
      </Card>

      <Card>
        <SectionHeading>People</SectionHeading>
        {members.length === 0 ? (
          <p className="mb-4 text-sm text-ink-muted">No people yet. Add your first teammate below.</p>
        ) : (
          <ul className="mb-4 divide-y divide-rule text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span className="text-ink">
                  {m.name ? `${m.name} · ` : ""}
                  {m.email}
                  <span className="ml-2 inline-flex gap-1">
                    <Badge tone={m.role === "owner" ? "blue" : m.role === "admin" ? "purple" : "slate"}>{m.role}</Badge>
                    <Badge tone={m.invitePending ? "amber" : "green"}>
                      {m.invitePending ? "Not signed in" : "Active"}
                    </Badge>
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  <form action={updateCompanyMember.bind(null, company.id, m.id)} className="flex items-center gap-2">
                    <div className="w-32">
                      <Select name="role" defaultValue={m.role} options={ROLE_OPTIONS} />
                    </div>
                    <Button type="submit" text size="small" label="Save" />
                  </form>
                  <form action={removeCompanyMember.bind(null, company.id, m.id)}>
                    <Button type="submit" text severity="danger" size="small" label="Remove" />
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addCompanyMember.bind(null, company.id)}
          className="flex flex-wrap items-end gap-3 border-t border-rule pt-4"
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
              <Select name="role" defaultValue="member" options={ROLE_OPTIONS} />
            </Field>
          </div>
          <Button type="submit" label="Add person" />
        </form>
        <p className="mt-3 text-xs text-ink-muted">
          A person becomes active the first time they sign in with this email. Assign people to individual projects
          from each project&apos;s People page.
        </p>
      </Card>
    </>
  );
}
