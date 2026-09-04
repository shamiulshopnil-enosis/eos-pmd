import { requireUser } from "@/lib/auth";
import {
  getMyProjectSides,
  listProjectsWithMilestones,
  listReviewProjects,
} from "@/lib/data";
import { getViewMode } from "@/lib/view-mode";
import { EmptyState, InkLink, PageHeader } from "@/components/ui";
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

  // The review-side view lives entirely behind the Client switch above — no
  // need to fetch it here just to say how many review projects exist.
  const allProjects = await listProjectsWithMilestones();
  // `allProjects` is already the full delivery list — no need for a separate
  // count round-trip to the API.
  const totalCount = allProjects.length;

  if (totalCount === 0 && !sides.review) {
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
          description="Switch to Client view above to see what you review."
          actionHref="/projects/new"
          actionLabel="Create project"
        />
      ) : (
        <ProjectsTable projects={allProjects} />
      )}
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
