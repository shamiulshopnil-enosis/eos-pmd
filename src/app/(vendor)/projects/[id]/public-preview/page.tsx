import { notFound } from "next/navigation";
import { getProjectWithReleases } from "@/lib/data";
import { computeProjectPerformance, isEvaluationComplete } from "@/lib/derived";
import { unpublishProject } from "@/lib/actions";
import { formatDate, formatPercent, formatRating } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/ui";

export default async function PublicPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectWithReleases(id);
  if (!project) notFound();

  const perf = computeProjectPerformance(project);
  const reviewedCount = project.releases.filter((r) => isEvaluationComplete(r.feedbackRequest)).length;
  const showPerformance = project.publicPerformanceConsent && reviewedCount > 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Public Project Preview"
        description="This is how the converted project would appear on the existing EOS public project page (PRD Appendix A.2)."
        back={{ href: `/projects/${project.id}`, label: "Back to Project" }}
        action={
          <form action={unpublishProject.bind(null, project.id)}>
            <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Revert to Private
            </button>
          </form>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-6 dark:border-slate-800">
          <div className="mb-2 flex gap-2">
            <Badge tone="blue">Published</Badge>
            {project.status === "COMPLETED" ? <Badge tone="green">Completed</Badge> : null}
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{project.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{project.services}</p>

          {project.publicImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.publicImageUrl} alt={project.name} className="mt-4 max-h-64 w-full rounded-lg object-cover" />
          ) : null}

          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Info label="Duration" value={project.startDate ? `${formatDate(project.startDate)} → ${formatDate(project.actualCompletionDate ?? project.expectedCompletionDate)}` : "—"} />
            <Info label="Budget" value={project.publicBudget} />
            <Info label="Team Size" value={project.teamSize?.toString()} />
            <Info label="Engagement Model" value={project.engagementModel} />
          </dl>
        </div>

        <div className="space-y-5 p-6">
          <Section title="Client" body={project.clientCompanyName} />
          {project.publicSummary ? <Section title="Project Summary" body={project.publicSummary} /> : null}
          {project.publicKeyChallenges ? <Section title="Key Challenges" body={project.publicKeyChallenges} /> : null}
          {project.publicSolution ? <Section title="Project Solution" body={project.publicSolution} /> : null}
          {project.publicOutcome ? <Section title="Project Outcome" body={project.publicOutcome} /> : null}
          {project.publicTechStack ? <Section title="Tech Stack" body={project.publicTechStack} /> : null}
          {project.publicPlatforms ? <Section title="Platforms" body={project.publicPlatforms} /> : null}

          {showPerformance ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
              <div className="mb-1 text-sm font-semibold text-blue-800 dark:text-blue-200">Verified Delivery Performance</div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {reviewedCount} Release{reviewedCount === 1 ? "" : "s"} Reviewed · Average Client Rating {formatRating(perf.avgRating)}/5 · {formatPercent(perf.responseRate)} Client Response Rate
              </p>
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                Aggregate only — individual release ratings and comments stay private (PRD §21).
              </p>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-700 dark:text-slate-200">{value || "—"}</dd>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{body}</p>
    </div>
  );
}
