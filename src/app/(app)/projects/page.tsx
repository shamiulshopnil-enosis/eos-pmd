import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  getMyProjectSides,
  listProjectsWithMilestones,
  listReviewProjects,
} from "@/lib/data";
import { getViewMode } from "@/lib/view-mode";
import { reviewRoleLabel } from "@/lib/permissions";
import { EmptyState, InkLink, PageHeader, SectionHeading } from "@/components/ui";
import { ExecutionStatusBadge } from "@/components/ui";
import ProjectsTable from "@/components/ProjectsTable";

// The table reads its filters from the URL via useSearchParams and always reflects live data.
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requireUser();

  const sides = await getMyProjectSides().catch(() => ({ delivery: false, review: false }));
  const viewMode = await getViewMode(sides);

  if (viewMode === "client") {
    const reviewProjects = await listReviewProjects();
    return (
      <div>
        <PageHeader
          title="Projects"
          description={`${reviewProjects.length} project${
            reviewProjects.length === 1 ? "" : "s"
          } you review`}
        />
        {reviewProjects.length === 0 ? (
          <EmptyState
            icon="folder_open"
            title="No projects to review"
            description="When a delivery team adds you to a project, it will appear here."
          />
        ) : (
          <ProjectsTable projects={reviewProjects} />
        )}
      </div>
    );
  }

  const [allProjects, reviewProjects] = await Promise.all([
    listProjectsWithMilestones(),
    listReviewProjects(),
  ]);
  // `allProjects` is already the full delivery list — no need for a separate
  // count round-trip to the API.
  const totalCount = allProjects.length;

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
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5 hover:bg-band sm:grid-cols-[minmax(0,1fr)_7rem_auto]"
                  >
                    <Link
                      href={`/projects/${p.id}`}
                      className="block min-w-0 truncate font-medium text-ink hover:text-link hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="hidden text-xs capitalize text-ink-muted sm:block">{role}</span>
                    <span className="flex shrink-0 items-center gap-3 justify-self-end">
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
