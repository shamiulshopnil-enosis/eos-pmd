import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectDetail } from "@/lib/data";
import { clientRole, isClientContact } from "@/lib/permissions";
import { computeProjectPerformance, getMilestoneFlag, isMilestoneReviewed } from "@/lib/derived";
import { editOwnMilestoneRating, submitMilestoneRating } from "@/lib/actions";
import { formatDate, formatDateTime, formatRating } from "@/lib/format";
import { ACTIVITY_LABELS, MILESTONE_RATING_LABEL, RATING_SELF_CORRECTION_HOURS } from "@/lib/constants";
import {
  Card,
  ExecutionStatusBadge,
  FlagBadge,
  HealthBadge,
  MilestoneStatusBadge,
  PageHeader,
  ProjectTypeBadge,
  SectionHeading,
  StarRating,
} from "@/components/ui";
import { Field, SubmitButton, TextArea } from "@/components/form";
import { RatingInput } from "@/components/RatingInput";

const WINDOW_MS = RATING_SELF_CORRECTION_HOURS * 60 * 60 * 1000;

function withinCorrectionWindow(ratingSubmittedAt: Date | null): boolean {
  if (!ratingSubmittedAt) return false;
  return Date.now() - ratingSubmittedAt.getTime() <= WINDOW_MS;
}

export default async function ClientPmdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("buyer");

  const project = await getProjectDetail(id);
  if (!project || !isClientContact(user, project)) notFound();

  const role = clientRole(user, project);
  const isPrimary = role === "primary";
  const perf = computeProjectPerformance(project);

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {project.name}
            <ProjectTypeBadge type={project.projectType} />
            <ExecutionStatusBadge status={project.executionStatus} />
          </span>
        }
        description={`Your role: ${role ?? "—"}`}
        back={{ href: "/my-projects", label: "Back to My Projects" }}
        action={
          isPrimary ? (
            <Link
              href={`/my-projects/${id}/people`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Manage People
            </Link>
          ) : null
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Average Rating</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{formatRating(perf.avgRating)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Milestones Reviewed</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {perf.milestonesReviewed} / {perf.totalMilestones}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Client Satisfaction</div>
          <div className="mt-1">
            <HealthBadge health={perf.health} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Latest Rating</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{formatRating(perf.latestRating)}</div>
        </Card>
      </div>

      <SectionHeading>Milestones</SectionHeading>
      <div className="space-y-3">
        {project.milestones.map((m) => {
          const withinWindow = withinCorrectionWindow(m.ratingSubmittedAt);
          const canEdit = isPrimary && m.status === "reviewed" && (withinWindow || m.editRequestedByVendor);

          return (
            <Card key={m.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                  {m.title}
                  <MilestoneStatusBadge status={m.status} />
                  <FlagBadge flag={getMilestoneFlag(m)} />
                </span>
                <span className="text-xs text-slate-400">Target {formatDate(m.targetDate)}</span>
              </div>

              {m.description ? (
                <div
                  className="mt-3 text-sm text-slate-600 dark:text-slate-300 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: m.description }}
                />
              ) : null}

              {isMilestoneReviewed(m) && !canEdit ? (
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{MILESTONE_RATING_LABEL}</span>
                    <StarRating value={m.rating} />
                  </div>
                  {m.comment ? (
                    <p className="mt-2 text-sm italic text-slate-600 dark:text-slate-300">&ldquo;{m.comment}&rdquo;</p>
                  ) : null}
                  <div className="mt-1 text-xs text-slate-400">Reviewed {formatDateTime(m.reviewedAt)}</div>
                </div>
              ) : null}

              {isPrimary && m.status === "sent" ? (
                <RatingForm
                  action={submitMilestoneRating.bind(null, id, m.id)}
                  submitLabel="Submit rating"
                  intro={`Rate this milestone on ${MILESTONE_RATING_LABEL}.`}
                />
              ) : null}

              {canEdit ? (
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {m.editRequestedByVendor ? (
                    <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      The vendor has asked you to revisit this rating. Changing it is entirely your call.
                    </p>
                  ) : (
                    <p className="mb-2 text-xs text-slate-400">
                      You can still change this rating for the next {RATING_SELF_CORRECTION_HOURS} hours after
                      submitting.
                    </p>
                  )}
                  <RatingForm
                    action={editOwnMilestoneRating.bind(null, id, m.id)}
                    submitLabel="Update rating"
                    defaultRating={m.rating ?? undefined}
                    defaultComment={m.comment ?? ""}
                  />
                </div>
              ) : null}

              {!isPrimary && m.status === "sent" ? (
                <p className="mt-3 text-sm text-slate-400">Awaiting the primary contact&apos;s rating.</p>
              ) : null}
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <SectionHeading>Activity</SectionHeading>
        <Card className="p-4">
          {project.activities.length === 0 ? (
            <p className="text-sm text-slate-400">No activity yet.</p>
          ) : (
            <ol className="space-y-3">
              {project.activities.map((a) => (
                <li key={a.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {ACTIVITY_LABELS[a.type] ?? a.type}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(a.createdAt)}</span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {a.message}
                    {a.milestone ? <span className="text-slate-400"> · {a.milestone.title}</span> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

function RatingForm({
  action,
  submitLabel,
  intro,
  defaultRating,
  defaultComment = "",
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  intro?: string;
  defaultRating?: number;
  defaultComment?: string;
}) {
  return (
    <form action={action} className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      {intro ? <p className="text-sm text-slate-500 dark:text-slate-400">{intro}</p> : null}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{MILESTONE_RATING_LABEL}</span>
        <RatingInput name="rating" required defaultValue={defaultRating} />
      </div>
      <Field label="Comment" hint="Optional">
        <TextArea name="comment" rows={2} defaultValue={defaultComment} placeholder="How did this milestone go?" />
      </Field>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
