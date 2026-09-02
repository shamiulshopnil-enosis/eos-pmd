import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject, listPendingInvitations, listTeams, listVendorMembers } from "@/lib/data";
import { isVendorOwner } from "@/lib/permissions";
import {
  inviteClientContact,
  inviteVendorTeamMember,
  reassignPrimaryContact,
  removeClientContact,
  removeVendorTeamMember,
  setProjectStaffing,
} from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, PageHeader, SectionHeading } from "@/components/ui";
import { Field, Select, TextInput } from "@/components/form";

export default async function ProjectTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("vendor");
  const project = await getProject(id);
  if (!project || !isVendorOwner(user, project)) notFound();

  const [pending, teams, directory] = await Promise.all([
    listPendingInvitations(id),
    listTeams(),
    listVendorMembers(),
  ]);
  const inviteLink = (invId: string) => `/invite/${invId}`;

  const contacts = [...project.clientContacts].sort((a, b) =>
    a.role === b.role ? 0 : a.role === "primary" ? -1 : 1,
  );

  // Emails on the vendor team that come from live team/individual assignment —
  // those rows are managed above, not removable one-by-one here.
  const liveEmails = new Set<string>([
    ...teams
      .filter((t) => project.assignedTeamIds.includes(t.id))
      .flatMap((t) => t.members.map((m) => m.email.toLowerCase())),
    ...directory
      .filter((m) => project.assignedMemberIds.includes(m.id))
      .map((m) => m.email.toLowerCase()),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Team — ${project.name}`}
        description="Vendor teammates and client contacts for this project. Inviting someone does not need admin approval."
        back={{ href: `/projects/${id}`, label: "Back to Project" }}
      />

      <Card className="mb-6 p-5">
        <SectionHeading>Assigned Teams &amp; People</SectionHeading>
        <p className="mb-3 text-xs text-slate-400">
          Staffing pulled live from your directory. Changes to a team in{" "}
          <a href="/team" className="text-blue-600 hover:underline">
            Team Management
          </a>{" "}
          flow straight through to this project.
        </p>
        {teams.length === 0 && directory.length === 0 ? (
          <p className="text-sm text-slate-400">
            Your team directory is empty.{" "}
            <a href="/team" className="text-blue-600 hover:underline">
              Set up teams and people
            </a>
            .
          </p>
        ) : (
          <form action={setProjectStaffing.bind(null, id)} className="space-y-3">
            <input type="hidden" name="teamIds" value="" />
            <input type="hidden" name="memberIds" value="" />
            {teams.length > 0 ? (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Teams</div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {teams.map((t) => (
                    <label key={t.id} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        name="teamIds"
                        value={t.id}
                        defaultChecked={project.assignedTeamIds.includes(t.id)}
                        className="mt-0.5"
                      />
                      <span>
                        {t.name}
                        <span className="block text-xs text-slate-400">
                          {t.members.length} member{t.members.length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            {directory.length > 0 ? (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Individuals</div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {directory.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        name="memberIds"
                        value={m.id}
                        defaultChecked={project.assignedMemberIds.includes(m.id)}
                      />
                      {m.name ? `${m.name} · ` : ""}
                      {m.email}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save staffing
            </button>
          </form>
        )}
      </Card>

      <Card className="mb-6 p-5">
        <SectionHeading>Vendor Team</SectionHeading>
        <ul className="mb-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {project.vendorTeam.map((m) => {
            const fromAssignment = liveEmails.has(m.email.toLowerCase());
            return (
              <li key={m.email} className="flex items-center justify-between py-2">
                <span className="text-slate-700 dark:text-slate-200">
                  {m.name ? `${m.name} · ` : ""}
                  {m.email}
                  <span className="ml-2 inline-flex gap-1">
                    <Badge tone={m.role === "owner" ? "blue" : "slate"}>{m.role}</Badge>
                    {m.invitePending ? <Badge tone="amber">Not signed in</Badge> : null}
                    {fromAssignment ? <Badge tone="purple">via assignment</Badge> : null}
                  </span>
                </span>
                {m.email !== user.email && !fromAssignment ? (
                  <form action={removeVendorTeamMember.bind(null, id)}>
                    <input type="hidden" name="email" value={m.email} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                    >
                      Remove
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
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
