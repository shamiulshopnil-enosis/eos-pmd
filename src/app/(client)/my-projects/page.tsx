import { EmptyState, PageHeader } from "@/components/ui";

export default function MyProjectsPage() {
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
