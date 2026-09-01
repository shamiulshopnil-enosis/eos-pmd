import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject, listPendingInvitations } from "@/lib/data";
import { isPrimaryContact } from "@/lib/permissions";
import { inviteCollaborator, removeClientContact } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, PageHeader, SectionHeading } from "@/components/ui";
import { Field, TextInput } from "@/components/form";

export default async function ClientPeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("buyer");
  const project = await getProject(id);
  if (!project || !isPrimaryContact(user, project)) notFound();

  const pending = (await listPendingInvitations(id)).filter((inv) => inv.kind === "client_contact");

  return (
    <div>
      <PageHeader
        title={`People — ${project.name}`}
        description="Invite colleagues who should be able to see this project. Collaborators can view but not rate milestones."
        back={{ href: `/my-projects/${id}`, label: "Back to Project" }}
      />

      <Card className="mb-6 p-5">
        <SectionHeading>Client Contacts</SectionHeading>
        <ul className="mb-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {project.clientContacts.map((c) => (
            <li key={c.email} className="flex items-center justify-between py-2">
              <span className="text-slate-700 dark:text-slate-200">
                {c.name ? `${c.name} · ` : ""}
                {c.email}
                <span className="ml-2">
                  <Badge tone={c.role === "primary" ? "blue" : "slate"}>{c.role}</Badge>
                  {c.invitePending ? (
                    <span className="ml-1">
                      <Badge tone="amber">Invite pending</Badge>
                    </span>
                  ) : null}
                </span>
              </span>
              {c.role === "collaborator" ? (
                <form action={removeClientContact.bind(null, id)}>
                  <input type="hidden" name="email" value={c.email} />
                  <button type="submit" className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400">
                    Remove
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>

        <form action={inviteCollaborator.bind(null, id)} className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <Field label="Invite a collaborator by email">
              <TextInput type="email" name="email" required placeholder="colleague@company.com" />
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
          <p className="mb-3 text-xs text-slate-400">No email is sent in this prototype. Share the link with the invitee.</p>
          <ul className="space-y-2 text-sm">
            {pending.map((inv) => (
              <li key={inv.id} className="rounded-lg border border-dashed border-slate-300 p-2 dark:border-slate-700">
                <div className="text-slate-600 dark:text-slate-300">
                  {inv.email} — {inv.proposedRole}
                </div>
                <div className="mt-0.5 flex items-center justify-between text-xs">
                  <span className="break-all font-mono text-blue-600">/invite/{inv.id}</span>
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
