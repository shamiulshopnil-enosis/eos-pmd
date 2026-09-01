import { EmptyState, PageHeader } from "@/components/ui";

export default function AdminHomePage() {
  return (
    <div>
      <PageHeader title="Admin" description="Platform oversight." />
      <EmptyState
        title="Nothing to review"
        description="The project approval queue and completion-timeout tools arrive in a later phase."
      />
    </div>
  );
}
