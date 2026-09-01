import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject, listPendingInvitations } from "@/lib/data";
import { isVendorOwner } from "@/lib/permissions";
import {
  inviteClientContact,
  inviteVendorTeamMember,
  reassignPrimaryContact,
  removeClientContact,
  removeVendorTeamMember,
} from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, PageHeader, SectionHeading } from "@/components/ui";
import { Field, Select, TextInput } from "@/components/form";

export default async function ProjectTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("vendor");
  const project = await getProject(id);
  if (!project || !isVendorOwner(user, project)) notFound();

  const pending = await listPendingInvitations(id);
  const inviteLink = (invId: string) => `/invite/${invId}`;

  const contacts = [...project.clientContacts].sort((a, b) =>
    a.role === b.role ? 0 : a.role === "primary" ? -1 : 1,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Team — ${project.name}`}
        description="Vendor teammates and client contacts for this project. Inviting someone does not need admin approval."
        back={{ href: `/projects/${id}`, label: "Back to Project" }}
      />

      <Card className="mb-6 p-5">
        <SectionHeading>Vendor Team</SectionHeading>
        <ul className="mb-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {project.vendorTeam.map((m) => (
            <li key={m.email} className="flex items-center justify-between py-2">
              <span className="text-slate-700 dark:text-slate-200">
                {m.name ? `${m.name} · ` : ""}
                {m.email}
                <span className="ml-2">
                  <Badge tone={m.role === "owner" ? "blue" : "slate"}>{m.role}</Badge>
                  {m.invitePending ? (
                    <span className="ml-1">
                      <Badge tone="amber">Invite pending</Badge>
                    </span>
                  ) : null}
                </span>
              </span>
              {m.email !== user.email ? (
                <form action={removeVendorTeamMember.bind(null, id)}>
                  <input type="hidden" name="email" value={m.email} />
                  <button type="submit" className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400">
                    Remove
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>

        <form action={inviteVendorTeamMember.bind(null, id)} className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <Field label="Invite teammate by email">
              <TextInput type="email" name="email" required placeholder="teammate@company.com" />
            </Field>
          </div>
          <div className="w-36">
            <Field label="Role">
              <Select name="role" defaultValue="member">
                <option value="member">Member</option>
                <option value="owner">Owner</option>
              </Select>
            </Field>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Send invite
          </button>
        </form>
      </Card>

      <Card className="mb-6 p-5">
        <SectionHeading>Client Contacts</SectionHeading>
        {contacts.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400">No client contacts yet.</p>
        ) : (
          <ul className="mb-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {contacts.map((c) => (
              <li key={c.email} className="flex items-center justify-between py-2">
                <span className="text-slate-700 dark:text-slate-200">
                  {c.name ? `${c.name} · ` : ""}
                  {c.email}
                  {c.designation ? <span className="text-slate-400"> — {c.designation}</span> : null}
                  <span className="ml-2">
                    <Badge tone={c.role === "primary" ? "blue" : "slate"}>{c.role}</Badge>
                    {c.invitePending ? (
                      <span className="ml-1">
                        <Badge tone="amber">Invite pending</Badge>
                      </span>
                    ) : null}
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  {c.role === "collaborator" && !c.invitePending ? (
                    <form action={reassignPrimaryContact.bind(null, id)}>
                      <input type="hidden" name="email" value={c.email} />
                      <button type="submit" className="text-xs font-medium text-blue-600 hover:underline">
                        Make primary
                      </button>
                    </form>
                  ) : null}
                  {c.role !== "primary" || c.invitePending ? (
                    <form action={removeClientContact.bind(null, id)}>
                      <input type="hidden" name="email" value={c.email} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                      >
                        Remove
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <form action={inviteClientContact.bind(null, id)} className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <Field label="Invite / reassign primary contact">
              <TextInput type="email" name="email" required placeholder="client@company.com" />
            </Field>
          </div>
          <div className="w-44">
            <Field label="Designation">
              <TextInput name="designation" placeholder="e.g. Product Owner" />
            </Field>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Send invite
          </button>
        </form>
      </Card>

      {pending.length > 0 ? (
        <Card className="p-5">
          <SectionHeading>Pending invitation links</SectionHeading>
          <p className="mb-3 text-xs text-slate-400">
            No email is sent in this prototype. Share the link with the invitee.
          </p>
          <ul className="space-y-2 text-sm">
            {pending.map((inv) => (
              <li key={inv.id} className="rounded-lg border border-dashed border-slate-300 p-2 dark:border-slate-700">
                <div className="text-slate-600 dark:text-slate-300">
                  {inv.email} — {inv.kind === "vendor_team" ? "vendor" : "client"} ({inv.proposedRole})
                </div>
                <div className="mt-0.5 flex items-center justify-between text-xs">
                  <span className="break-all font-mono text-blue-600">{inviteLink(inv.id)}</span>
                  <span className="text-slate-400">{formatDateTime(inv.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
