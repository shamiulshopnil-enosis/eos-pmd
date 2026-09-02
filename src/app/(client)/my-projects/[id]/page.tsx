import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectDetail } from "@/lib/data";
import { clientRole, isClientContact } from "@/lib/permissions";
import { computeProjectPerformance, getMilestoneFlag, isMilestoneReviewed } from "@/lib/derived";
import { confirmCompletion, editOwnMilestoneRating, submitMilestoneRating } from "@/lib/actions";
import { formatDate, formatDateTime, formatRating } from "@/lib/format";
import {
  ACTIVITY_LABELS,
  CAPSTONE_TIER_LABELS,
  MILESTONE_REVIEW_DIMENSIONS,
  RATING_SELF_CORRECTION_HOURS,
} from "@/lib/constants";
import type { MilestoneReview } from "@/lib/types";
import {
  Badge,
  Card,
  ExecutionStatusBadge,
  FlagBadge,
  HealthBadge,
  MilestoneStatusBadge,
  PageHeader,
  ProjectTypeBadge,
  SectionHeading,
} from "@/components/ui";
import { Field, SubmitButton, TextArea } from "@/components/form";
import MilestoneAttachments from "@/components/MilestoneAttachments";
import MilestoneReviewSummary from "@/components/MilestoneReviewSummary";

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

      {project.executionStatus === "awaiting_completion" ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">Completion requested</div>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            The vendor has marked this project as delivered. Confirming locks the project&apos;s final score at{" "}
            {formatRating(perf.avgRating)}
            {perf.avgRating == null ? " (unrated)" : ""}.
          </p>
          {isPrimary ? (
            <form action={confirmCompletion.bind(null, id)} className="mt-3">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Confirm completion
              </button>
            </form>
          ) : (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Awaiting the primary contact&apos;s confirmation.
            </p>
          )}
        </div>
      ) : null}

      {project.capstone?.requested && !project.capstone.submitted ? (
        <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950">
          <div className="text-sm font-semibold text-violet-800 dark:text-violet-200">
            Capstone endorsement requested
          </div>
          <p className="mt-1 text-sm text-violet-700 dark:text-violet-300">
            The vendor has asked for a short written endorsement of the whole engagement.
          </p>
          {isPrimary ? (
            <Link
              href={`/my-projects/${id}/capstone`}
              className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Write the endorsement
            </Link>
          ) : (
            <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
              Awaiting the primary contact&apos;s endorsement.
            </p>
          )}
        </div>
      ) : null}

      {project.capstone?.submitted ? (
        <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-violet-800 dark:text-violet-200">Capstone endorsement</span>
            <Badge tone="purple">{CAPSTONE_TIER_LABELS[project.capstone.tier] ?? project.capstone.tier}</Badge>
            {project.capstone.anonymous ? <Badge tone="slate">Anonymous</Badge> : null}
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
            <p className="text-sm italic text-violet-700 dark:text-violet-300">
              &ldquo;{project.capstone.testimonial}&rdquo;
            </p>
          ) : null}
        </div>
      ) : null}

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
          const isReviewer = m.reviewedByUserId === user.id;
          const canEdit =
            isReviewer && m.status === "reviewed" && (withinWindow || m.editRequestedByVendor);

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

              {m.url ? (
                <div className="mt-2 text-sm">
                  <a href={m.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {m.url}
                  </a>
                </div>
              ) : null}

              {isMilestoneReviewed(m) && !canEdit ? (
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <MilestoneReviewSummary milestone={m} />
                  {m.comment ? (
                    <p className="mt-2 text-sm italic text-slate-600 dark:text-slate-300">&ldquo;{m.comment}&rdquo;</p>
                  ) : null}
                  <div className="mt-1 text-xs text-slate-400">
                    Reviewed {formatDateTime(m.reviewedAt)}
                    {m.reviewedByName || m.reviewedByEmail
                      ? ` by ${m.reviewedByName ?? m.reviewedByEmail}`
                      : ""}
                  </div>
                </div>
              ) : null}

              {m.status === "sent" ? (
                <RatingForm
                  action={submitMilestoneRating.bind(null, id, m.id)}
                  submitLabel="Submit review"
                  intro="Please rate this milestone on each of the following."
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
                    submitLabel="Update review"
                    defaultReview={m.ratings}
                    defaultComment={m.comment ?? ""}
                  />
                </div>
              ) : null}

              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Attachments
                </div>
                <MilestoneAttachments
                  projectId={id}
                  milestone={m}
                  currentUserId={user.id}
                  isVendorOwner={false}
                  canUpload={project.executionStatus !== "completed"}
                />
              </div>
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
  defaultReview,
  defaultComment = "",
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  intro?: string;
  defaultReview?: MilestoneReview | null;
  defaultComment?: string;
}) {
  return (
    <form action={action} className="mt-3 space-y-5 border-t border-slate-100 pt-3 dark:border-slate-800">
      {intro ? <p className="text-sm text-slate-500 dark:text-slate-400">{intro}</p> : null}
      {MILESTONE_REVIEW_DIMENSIONS.map((dim, i) => {
        const current = defaultReview ? defaultReview[dim.key] : null;
        return (
          <fieldset key={dim.key} className="space-y-1.5">
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {i + 1}. {dim.question} <span className="text-rose-500">*</span>
            </legend>
            <div className="space-y-1">
              {dim.options.map((opt, idx) => {
                const value = 5 - idx;
                return (
                  <label key={opt} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="radio"
                      name={dim.key}
                      value={value}
                      required
                      defaultChecked={current === value}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <Field label="Additional feedback" hint="Optional — one comment for the whole review">
        <TextArea name="comment" rows={3} defaultValue={defaultComment} placeholder="Anything else about this milestone?" />
      </Field>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
