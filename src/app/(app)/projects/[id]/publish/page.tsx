import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectWithMilestones } from "@/lib/data";
import { canManageProject } from "@/lib/permissions";
import { computeProjectPerformance, isMilestoneReviewed } from "@/lib/derived";
import { meetsPublicThreshold } from "@/lib/scoring";
import { minReviewThreshold } from "@/lib/constants";
import { publishProject } from "@/lib/actions";
import { formatPercent, formatRating } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { Field, SubmitButton, TextArea, TextInput } from "@/components/form";
import { SingleCheckbox } from "@/components/CheckboxField";
import { SetBreadcrumb } from "@/components/Breadcrumbs";

export default async function PublishProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const project = await getProjectWithMilestones(id);
  if (!project || !canManageProject(project)) notFound();

  const perf = computeProjectPerformance(project);
  const reviewedCount = project.milestones.filter(isMilestoneReviewed).length;
  const totalMilestones = project.milestones.length;
  const threshold = minReviewThreshold(totalMilestones);
  const thresholdMet = meetsPublicThreshold(project);
  const action = publishProject.bind(null, project.id);

  return (
    <div className="mx-auto max-w-3xl">
      <SetBreadcrumb entries={{ [`/projects/${project.id}`]: project.name }} />
      <PageHeader
        title="Publish Project"
        description="Private project fields are carried over automatically; complete anything the public project page still needs."
        back={{ href: `/projects/${project.id}`, label: "Back to Project" }}
      />

      <Card className="mb-6 p-4 text-sm text-ink-muted">
        <div className="mb-1 font-medium text-ink">Carried over automatically</div>
        <p>
          Project Name, Client, Services, Duration, Team Size, Description, Dates and Engagement Model already exist
          on this private project and will populate the public page without re-entry.
        </p>
      </Card>

      <Card className="p-6">
        <ActionForm action={action} className="space-y-5">
          <Field label="Project image URL" optional hint="Recommended 1920×1080 (16:9), matching the existing public project form.">
            <TextInput type="url" name="publicImageUrl" placeholder="https://…" />
          </Field>

          <Field label="Project summary" optional>
            <TextArea name="publicSummary" rows={3} defaultValue={project.description ?? ""} />
          </Field>
          <Field label="Key challenges" optional>
            <TextArea name="publicKeyChallenges" rows={2} placeholder="What were the main challenges?" />
          </Field>
          <Field label="Project solution" optional>
            <TextArea name="publicSolution" rows={3} placeholder="How did you solve them?" />
          </Field>
          <Field label="Project outcome" optional>
            <TextArea name="publicOutcome" rows={2} placeholder="What was the final outcome?" />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Tech stack" optional hint="Comma-separated">
              <TextInput name="publicTechStack" placeholder="React Native, Node.js" />
            </Field>
            <Field label="Platforms" optional hint="Comma-separated">
              <TextInput name="publicPlatforms" placeholder="iOS, Android" />
            </Field>
          </div>

          <Field label="Budget range" optional>
            <TextInput name="publicBudget" placeholder="e.g. 10K – 49K" />
          </Field>

          <div className="rounded-ledger border border-rule bg-band p-4">
            <div className="mb-2 text-sm font-medium text-ink">Verified delivery performance</div>
            {reviewedCount === 0 ? (
              <p className="text-sm text-ink-muted">
                No reviewed milestones yet. This section won&apos;t appear on the public page until at least one milestone has a client rating.
              </p>
            ) : (
              <>
                {thresholdMet ? (
                  <p className="mb-3 text-sm text-ink-muted">
                    {reviewedCount} Milestone{reviewedCount === 1 ? "" : "s"} Reviewed · Average Client Rating {formatRating(perf.avgRating)}/5 · {formatPercent(perf.responseRate)} Response Rate
                  </p>
                ) : (
                  <p className="mb-3 text-sm text-rag-warn">
                    {reviewedCount} of {totalMilestones} milestones reviewed, below the {threshold}-milestone threshold, so
                    the summary stays hidden on the public page until then. You can still record consent now.
                  </p>
                )}
                <SingleCheckbox name="publicPerformanceConsent" defaultChecked={project.publicPerformanceConsent}>
                  I have client consent to display this aggregate performance summary publicly. Individual milestone
                  ratings and comments will remain private regardless of this choice.
                </SingleCheckbox>
              </>
            )}
          </div>

          {project.capstone?.submitted ? (
            <div className="rounded-ledger border border-rule bg-band p-4">
              <div className="mb-1 text-sm font-medium text-link">Client Endorsement</div>
              <p className="text-sm text-link">
                The capstone endorsement the client submitted ({project.capstone.attributes.length} attribute
                {project.capstone.attributes.length === 1 ? "" : "s"} + testimonial) will appear on the public page
                {project.capstone.anonymous ? " without the client's name" : ""}.
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-rule pt-5">
            <SubmitButton>Publish Project</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
