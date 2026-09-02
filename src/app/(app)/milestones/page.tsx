import { requireUser } from "@/lib/auth";
import { countMilestones, listMilestonesWithProject } from "@/lib/data";
import { EmptyState, PageHeader } from "@/components/ui";
import MilestonesTable from "@/components/MilestonesTable";

export default async function MilestonesPage() {
  await requireUser();

  const totalCount = await countMilestones();
  const milestones = await listMilestonesWithProject();

  if (totalCount === 0) {
    return (
      <div>
        <PageHeader title="Milestones" description="All milestones across every project." />
        <EmptyState
          icon="flag"
          title="No milestones yet"
          description="Open a project and add its first milestone to start tracking delivery."
          actionHref="/projects"
          actionLabel="Go to projects"
          actionIcon="arrow_forward"
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Milestones"
        description={`${totalCount} milestone${totalCount === 1 ? "" : "s"} across all projects`}
      />
      <MilestonesTable milestones={milestones} />
    </div>
  );
}
