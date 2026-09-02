import { requireUser } from "@/lib/auth";
import { listTeams, listVendorMembers } from "@/lib/data";
import {
  createTeam,
  createVendorMember,
  deleteTeam,
  removeVendorMember,
  updateTeam,
  updateVendorMember,
} from "@/lib/actions";
import { Badge, Card, EmptyState, PageHeader, SectionHeading } from "@/components/ui";
import { Field, Select, TextInput } from "@/components/form";

export default async function TeamManagementPage() {
  await requireUser("vendor");
  const [members, teams] = await Promise.all([listVendorMembers(), listTeams()]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Team Management"
        description="Keep a directory of your people, then group them into teams you can assign to projects. A member becomes active the first time they sign in with their email."
      />

      <Card className="mb-6 p-5">
        <SectionHeading>People Directory</SectionHeading>
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
                    <Badge tone={m.role === "owner" ? "blue" : "slate"}>{m.role}</Badge>
                    <Badge tone={m.invitePending ? "amber" : "green"}>
                      {m.invitePending ? "Not signed in" : "Active"}
                    </Badge>
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  <form action={updateVendorMember.bind(null, m.id)} className="flex items-center gap-2">
                    <Select name="role" defaultValue={m.role} className="!py-1 text-xs">
                      <option value="member">Member</option>
                      <option value="owner">Owner</option>
                    </Select>
                    <button type="submit" className="text-xs font-medium text-blue-600 hover:underline">
                      Save
                    </button>
                  </form>
                  <form action={removeVendorMember.bind(null, m.id)}>
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

        <form action={createVendorMember} className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="w-48">
            <Field label="Name">
              <TextInput name="name" placeholder="e.g. Sam Carter" />
            </Field>
          </div>
          <div className="w-64">
            <Field label="Email" required>
              <TextInput type="email" name="email" required placeholder="sam@vendor.com" />
            </Field>
          </div>
          <div className="w-36">
            <Field label="Default role">
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
            Add person
          </button>
        </form>
      </Card>

      <Card className="p-5">
        <SectionHeading>Teams</SectionHeading>
        {teams.length === 0 ? (
          <EmptyState
            title="No teams yet"
            description="Create a team below and pick its members from your directory. You can assign whole teams to a project."
          />
        ) : (
          <ul className="mb-6 space-y-4">
            {teams.map((team) => (
              <li key={team.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <form action={updateTeam.bind(null, team.id)} className="space-y-3">
                  <input type="hidden" name="memberIds" value="" />
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="w-64">
                      <Field label="Team name" required>
                        <TextInput name="name" required defaultValue={team.name} />
                      </Field>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="submit" className="text-xs font-medium text-blue-600 hover:underline">
                        Save changes
                      </button>
                    </div>
                  </div>
                  {members.length === 0 ? (
                    <p className="text-xs text-slate-400">Add people to your directory to staff this team.</p>
                  ) : (
                    <fieldset className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {members.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            name="memberIds"
                            value={m.id}
                            defaultChecked={team.memberIds.includes(m.id)}
                          />
                          {m.name ? `${m.name} · ` : ""}
                          {m.email}
                        </label>
                      ))}
                    </fieldset>
                  )}
                </form>
                <form action={deleteTeam.bind(null, team.id)} className="mt-2">
                  <button
                    type="submit"
                    className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Delete team
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={createTeam} className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="w-64">
            <Field label="New team name" required>
              <TextInput name="name" required placeholder="e.g. Platform Squad" />
            </Field>
          </div>
          {members.length > 0 ? (
            <fieldset className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" name="memberIds" value={m.id} />
                  {m.name ? `${m.name} · ` : ""}
                  {m.email}
                </label>
              ))}
            </fieldset>
          ) : null}
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create team
          </button>
        </form>
      </Card>
    </div>
  );
}
