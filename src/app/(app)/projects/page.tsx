import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { countProjects, listProjectsWithMilestones, listReviewProjects } from "@/lib/data";
import { computeProjectPerformance } from "@/lib/derived";
import { PROJECT_STATUS_LABELS, CLIENT_HEALTH_LABELS } from "@/lib/constants";
import { reviewRoleLabel } from "@/lib/permissions";
import { formatRating } from "@/lib/format";
import {
  AdminStatusBadge,
  Badge,
  Card,
  EmptyState,
  ExecutionStatusBadge,
  HealthBadge,
  PageHeader,
  ProjectStatusBadge,
  ProjectTypeBadge,
  SectionHeading,
} from "@/components/ui";
import { Select, TextInput } from "@/components/form";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; health?: string }>;
}) {
  const { q = "", status = "", health = "" } = await searchParams;
  await requireUser();

  const [totalCount, allProjects, reviewProjects] = await Promise.all([
    countProjects(),
    listProjectsWithMilestones({ status, q }),
    listReviewProjects(),
  ]);

  const filtered = allProjects
    .map((project) => ({ project, perf: computeProjectPerformance(project) }))
    .filter(({ perf }) => !health || perf.health === health);

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
        <>
      <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
        <div className="w-56">
          <TextInput name="q" placeholder="Search project or client…" defaultValue={q} />
        </div>
        <div className="w-44">
          <Select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select name="health" defaultValue={health}>
            <option value="">All client health</option>
            {Object.entries(CLIENT_HEALTH_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          Apply
        </button>
        {(q || status || health) && (
          <Link href="/projects" className="text-sm text-slate-500 hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      {filtered.length === 0 ? (
        <EmptyState title="No projects match your filters" description="Try adjusting or clearing the filters above." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Approval</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
                <th className="px-4 py-3 font-medium text-right">Milestones</th>
                <th className="px-4 py-3 font-medium text-right">Avg. Rating</th>
                <th className="px-4 py-3 font-medium">Client Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(({ project, perf }) => (
                <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${project.id}`} className="font-medium text-blue-600 hover:underline">
                      {project.name}
                    </Link>
                    <span className="ml-2 align-middle">
                      <ProjectTypeBadge type={project.projectType} />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{project.clientCompanyName}</td>
                  <td className="px-4 py-3">
                    <ProjectStatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3">
                    <AdminStatusBadge status={project.adminStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={project.visibility === "PUBLIC" ? "blue" : "slate"}>
                      {project.visibility === "PUBLIC" ? "Public" : "Private"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{perf.totalMilestones}</td>
                  <td className="px-4 py-3 text-right">{formatRating(perf.avgRating)}</td>
                  <td className="px-4 py-3">
                    <HealthBadge health={perf.health} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
        </>
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
