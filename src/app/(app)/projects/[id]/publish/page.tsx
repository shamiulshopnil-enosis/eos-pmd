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
import { Field, SubmitButton, TextArea, TextInput } from "@/components/form";

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
      <PageHeader
        title="Publish Project"
        description="PRD §19-20 — private project fields are carried over automatically; complete anything the public project page still needs."
        back={{ href: `/projects/${project.id}`, label: "Back to Project" }}
      />

      <Card className="mb-6 p-4 text-sm text-slate-600 dark:text-slate-300">
        <div className="mb-1 font-medium text-slate-800 dark:text-slate-100">Carried over automatically</div>
        <p>
          Project Name, Client, Services, Duration, Team Size, Description, Dates and Engagement Model already exist
          on this private project and will populate the public page without re-entry.
        </p>
      </Card>

      <Card className="p-6">
        <form action={action} className="space-y-5">
          <Field label="Project Image URL" hint="Recommended 1920×1080 (16:9), matching the existing public project form.">
            <TextInput type="url" name="publicImageUrl" placeholder="https://…" />
          </Field>

          <Field label="Project Summary">
            <TextArea name="publicSummary" rows={3} defaultValue={project.description ?? ""} />
          </Field>
          <Field label="Key Challenges">
            <TextArea name="publicKeyChallenges" rows={2} placeholder="What were the main challenges?" />
          </Field>
          <Field label="Project Solution">
            <TextArea name="publicSolution" rows={3} placeholder="How did you solve them?" />
          </Field>
          <Field label="Project Outcome">
            <TextArea name="publicOutcome" rows={2} placeholder="What was the final outcome?" />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Tech Stack" hint="Comma-separated">
              <TextInput name="publicTechStack" placeholder="React Native, Node.js" />
            </Field>
            <Field label="Platforms" hint="Comma-separated">
              <TextInput name="publicPlatforms" placeholder="iOS, Android" />
            </Field>
          </div>

          <Field label="Budget Range">
            <TextInput name="publicBudget" placeholder="e.g. 10K – 49K" />
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-100">Verified Delivery Performance (PRD §21)</div>
            {reviewedCount === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No reviewed milestones yet — this section won&apos;t appear on the public page until at least one milestone has a client rating.
              </p>
            ) : (
              <>
                {thresholdMet ? (
                  <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
                    {reviewedCount} Milestone{reviewedCount === 1 ? "" : "s"} Reviewed · Average Client Rating {formatRating(perf.avgRating)}/5 · {formatPercent(perf.responseRate)} Response Rate
                  </p>
                ) : (
                  <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
                    {reviewedCount} of {totalMilestones} milestones reviewed — below the {threshold}-milestone threshold, so
                    the summary stays hidden on the public page until then (spec §6.7). You can still record consent now.
                  </p>
                )}
                <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" name="publicPerformanceConsent" className="mt-0.5" defaultChecked={project.publicPerformanceConsent} />
                  <span>
                    I have client consent to display this aggregate performance summary publicly. Individual milestone
                    ratings and comments will remain private (PRD §21) regardless of this choice.
                  </span>
                </label>
              </>
            )}
          </div>

          {project.capstone?.submitted ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950">
              <div className="mb-1 text-sm font-medium text-violet-800 dark:text-violet-200">Client Endorsement</div>
              <p className="text-sm text-violet-700 dark:text-violet-300">
                The capstone endorsement the client submitted ({project.capstone.attributes.length} attribute
                {project.capstone.attributes.length === 1 ? "" : "s"} + testimonial) will appear on the public page
                {project.capstone.anonymous ? " without the client's name" : ""}.
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <SubmitButton>Publish Project</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
