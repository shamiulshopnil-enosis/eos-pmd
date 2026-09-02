import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { countProjects, listProjectsWithMilestones, listReviewProjects } from "@/lib/data";
import { reviewRoleLabel } from "@/lib/permissions";
import {
  Badge,
  Card,
  EmptyState,
  ExecutionStatusBadge,
  PageHeader,
  SectionHeading,
} from "@/components/ui";
import ProjectsTable from "@/components/ProjectsTable";

export default async function ProjectsPage() {
  await requireUser();

  const [totalCount, allProjects, reviewProjects] = await Promise.all([
    countProjects(),
    listProjectsWithMilestones(),
    listReviewProjects(),
  ]);

  if (totalCount === 0 && reviewProjects.length === 0) {
    return (
      <div>
        <PageHeader title="Projects" action={<NewProjectButton />} />
        <EmptyState
          title="No projects yet"
          description="Create your first project, break it into milestones, collect client reviews, and track performance over time."
          actionHref="/projects/new"
          actionLabel="Create Project"
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description={`${totalCount} project${totalCount === 1 ? "" : "s"} you deliver`}
        action={<NewProjectButton />}
      />

      {totalCount === 0 ? (
        <EmptyState
          title="You're not delivering any projects"
          description="Create one, or check the projects you review below."
          actionHref="/projects/new"
          actionLabel="Create Project"
        />
      ) : (
        <ProjectsTable projects={allProjects} />
      )}

      {reviewProjects.length > 0 ? (
        <div className="mt-10">
          <SectionHeading>Projects you review</SectionHeading>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Your role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Milestones reviewed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reviewProjects.map((p) => {
                  const reviewed = p.milestones.filter((m) => m.status === "reviewed").length;
                  const role = reviewRoleLabel(p);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <Link href={`/projects/${p.id}`} className="font-medium text-blue-600 hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={role === "owner" ? "blue" : "slate"}>{role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <ExecutionStatusBadge status={p.executionStatus} />
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {reviewed} / {p.milestones.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function NewProjectButton() {
  return (
    <Link href="/projects/new" className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
      + Create Project
    </Link>
  );
}
