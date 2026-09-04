import { requireUser } from "@/lib/auth";
import { getMyProjectSides, listMilestonesWithProject } from "@/lib/data";
import { getViewMode } from "@/lib/view-mode";
import { EmptyState, PageHeader } from "@/components/ui";
import MilestonesTable from "@/components/MilestonesTable";

// The list reads ?status=…/?flag=… via useSearchParams and always reflects live data.
export const dynamic = "force-dynamic";

export default async function MilestonesPage() {
  await requireUser();

  const sides = await getMyProjectSides().catch(() => ({ delivery: false, review: false }));
  const viewMode = await getViewMode(sides);
  const side = viewMode === "client" ? "review" : "delivery";

  // The list is the full set for this side — derive the count from it rather
  // than paying for a separate count round-trip to the API.
  const milestones = await listMilestonesWithProject({ side });
  const totalCount = milestones.length;

  const description =
    viewMode === "client"
      ? `${totalCount} milestone${totalCount === 1 ? "" : "s"} across projects you review`
      : `${totalCount} milestone${totalCount === 1 ? "" : "s"} across all projects`;

  if (totalCount === 0) {
    return (
      <div>
        <PageHeader
          title="Milestones"
          description={
            viewMode === "client"
              ? "Milestones across every project you review."
              : "All milestones across every project."
          }
        />
        <EmptyState
          icon="flag"
          title="No milestones yet"
          description={
            viewMode === "client"
              ? "When a delivery team sends a milestone for review, it will show up here."
              : "Open a project and add its first milestone to start tracking delivery."
          }
          actionHref="/projects"
          actionLabel="Go to projects"
          actionIcon="arrow_forward"
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Milestones" description={description} />
      <MilestonesTable milestones={milestones} />
    </div>
  );
}
