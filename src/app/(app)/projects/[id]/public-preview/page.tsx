import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectWithMilestones } from "@/lib/data";
import { canAccessDelivery, canManageProject } from "@/lib/permissions";
import { computeProjectPerformance, isMilestoneReviewed } from "@/lib/derived";
import { meetsPublicThreshold } from "@/lib/scoring";
import { minReviewThreshold } from "@/lib/constants";
import { unpublishProject } from "@/lib/actions";
import { formatDate, formatPercent, formatRating } from "@/lib/format";
import { Badge, Card, GhostButton, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { SetBreadcrumb } from "@/components/Breadcrumbs";

export default async function PublicPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const project = await getProjectWithMilestones(id);
  if (!project || !canAccessDelivery(project)) notFound();

  const perf = computeProjectPerformance(project);
  const reviewedCount = project.milestones.filter(isMilestoneReviewed).length;
  const totalMilestones = project.milestones.length;
  const threshold = minReviewThreshold(totalMilestones);
  const thresholdMet = meetsPublicThreshold(project);
  const showPerformance = project.publicPerformanceConsent && thresholdMet;

  return (
    <div className="mx-auto max-w-3xl">
      <SetBreadcrumb entries={{ [`/projects/${project.id}`]: project.name }} />
      <PageHeader
        title="Public project preview"
        description="How the converted project would appear on the EOS public project page."
        back={{ href: `/projects/${project.id}`, label: project.name }}
        action={
          canManageProject(project) ? (
            <form action={unpublishProject.bind(null, project.id)}>
              <GhostButton type="submit" icon="lock">
                Revert to private
              </GhostButton>
            </form>
          ) : null
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-rule-strong p-6">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Badge tone="blue">Published</Badge>
            {project.status === "COMPLETED" ? <Badge tone="green">Completed</Badge> : null}
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{project.name}</h2>
          <p className="mt-1 text-sm text-ink-muted">{project.services}</p>

          {project.publicImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.publicImageUrl}
              alt={project.name}
              className="mt-4 max-h-64 w-full rounded-ledger border border-rule object-cover"
            />
          ) : null}

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3.5 text-sm sm:grid-cols-4">
            <Info
              label="Duration"
              value={
                project.startDate
                  ? `${formatDate(project.startDate)} → ${formatDate(
                      project.actualCompletionDate ?? project.expectedCompletionDate,
                    )}`
                  : "—"
              }
            />
            <Info label="Budget" value={project.publicBudget} />
            <Info label="Team size" value={project.teamSize?.toString()} mono />
            <Info label="Engagement model" value={project.engagementModel} />
          </dl>
        </div>

        <div className="space-y-6 p-6">
          <Section title="Client" body={project.clientCompanyName} />
          {project.publicSummary ? <Section title="Project summary" body={project.publicSummary} /> : null}
          {project.publicKeyChallenges ? <Section title="Key challenges" body={project.publicKeyChallenges} /> : null}
          {project.publicSolution ? <Section title="Project solution" body={project.publicSolution} /> : null}
          {project.publicOutcome ? <Section title="Project outcome" body={project.publicOutcome} /> : null}
          {project.publicTechStack ? <Section title="Tech stack" body={project.publicTechStack} /> : null}
          {project.publicPlatforms ? <Section title="Platforms" body={project.publicPlatforms} /> : null}

          {showPerformance ? (
            <div className="rounded-ledger border border-rule bg-band p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-rag-good">
                <Icon name="verified" className="text-[15px]" fill />
                Verified delivery performance
              </div>
              <p className="font-mono text-sm text-ink">
                {reviewedCount} milestone{reviewedCount === 1 ? "" : "s"} reviewed
                <span className="text-ink-muted"> · </span>
                avg {formatRating(perf.avgRating)}/5
                <span className="text-ink-muted"> · </span>
                {formatPercent(perf.responseRate)} response rate
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Aggregate only. Individual milestone ratings and comments stay private.
              </p>
            </div>
          ) : project.publicPerformanceConsent ? (
            <div className="rounded-ledger border border-rule bg-band p-4">
              <div className="mb-1 text-xs font-semibold text-ink-muted">
                Delivery in progress
              </div>
              <p className="text-sm text-ink-muted">
                {reviewedCount} of {totalMilestones} milestones reviewed. The performance summary becomes
                public once {threshold} {threshold === 1 ? "is" : "are"} reviewed. You can still record
                consent now.
              </p>
            </div>
          ) : null}

          {project.capstone?.submitted ? (
            <div className="rounded-ledger border border-rule bg-band p-4">
              <div className="mb-2 text-xs font-semibold text-ink-muted">
                Client endorsement
              </div>
              {project.capstone.attributes.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {project.capstone.attributes.map((attr) => (
                    <Badge key={attr} tone="blue">
                      {attr}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {project.capstone.testimonial ? (
                <p className="text-sm italic text-ink">&ldquo;{project.capstone.testimonial}&rdquo;</p>
              ) : null}
              <p className="mt-1.5 text-xs text-ink-muted">
                {project.capstone.anonymous ? "Anonymous client" : project.clientCompanyName}
              </p>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="mb-0.5 text-xs font-medium text-ink-muted">{label}</dt>
      <dd className={`text-ink ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="mb-1 font-display text-xs font-bold uppercase tracking-[0.09em] text-ink">
        {title}
      </h3>
      <p className="max-w-[68ch] whitespace-pre-line text-sm text-ink-muted">{body}</p>
    </div>
  );
}
