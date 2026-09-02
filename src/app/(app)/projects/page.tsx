import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { countProjects, listProjectsWithMilestones, listReviewProjects } from "@/lib/data";
import { reviewRoleLabel } from "@/lib/permissions";
import { EmptyState, InkLink, PageHeader, SectionHeading } from "@/components/ui";
import { ExecutionStatusBadge } from "@/components/ui";
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
          icon="folder_open"
          title="No projects yet"
          description="Create your first project, break it into milestones, collect client reviews, and track performance over time."
          actionHref="/projects/new"
          actionLabel="Create project"
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
          icon="folder_open"
          title="You're not delivering any projects"
          description="Create one, or check the projects you review below."
          actionHref="/projects/new"
          actionLabel="Create project"
        />
      ) : (
        <ProjectsTable projects={allProjects} />
      )}

      {reviewProjects.length > 0 ? (
        <section className="mt-10">
          <SectionHeading>Projects you review</SectionHeading>
          <div className="rounded-ledger border border-rule bg-panel">
            <ul className="divide-y divide-rule">
              {reviewProjects.map((p) => {
                const reviewed = p.milestones.filter((m) => m.status === "reviewed").length;
                const role = reviewRoleLabel(p);
                return (
                  <li
                    key={p.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2.5 hover:bg-band sm:grid-cols-[1fr_7rem_auto]"
                  >
                    <Link href={`/projects/${p.id}`} className="truncate font-medium text-ink hover:text-link hover:underline">
                      {p.name}
                    </Link>
                    <span className="hidden text-xs capitalize text-ink-muted sm:block">{role}</span>
                    <span className="flex items-center gap-3 justify-self-end">
                      <ExecutionStatusBadge status={p.executionStatus} />
                      <span className="font-mono text-xs tabular-nums text-ink-muted">
                        {reviewed} / {p.milestones.length}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function NewProjectButton() {
  return (
    <InkLink href="/projects/new" icon="add">
      Create project
    </InkLink>
  );
}
