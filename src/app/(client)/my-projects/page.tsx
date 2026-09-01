import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listProjectsForUser } from "@/lib/data";
import { clientRole } from "@/lib/permissions";
import { Badge, Card, EmptyState, ExecutionStatusBadge, PageHeader } from "@/components/ui";

export default async function MyProjectsPage() {
  const user = await requireUser("buyer");
  const projects = await listProjectsForUser(user.id);

  if (projects.length === 0) {
    return (
      <div>
        <PageHeader title="My Projects" description="Projects you have been invited to as a client." />
        <EmptyState
          title="No projects yet"
          description="When a vendor invites you to a project, it will appear here."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Projects" description={`${projects.length} project${projects.length === 1 ? "" : "s"}`} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Your role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Milestones reviewed</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {projects.map((p) => {
              const role = clientRole(user, p);
              const reviewed = p.milestones.filter((m) => m.status === "reviewed").length;
              return (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/my-projects/${p.id}`} className="font-medium text-blue-600 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={role === "primary" ? "blue" : "slate"}>{role ?? "—"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <ExecutionStatusBadge status={p.executionStatus} />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                    {reviewed} / {p.milestones.length}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {role === "primary" ? (
                      <Link
                        href={`/my-projects/${p.id}/people`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Manage people
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
