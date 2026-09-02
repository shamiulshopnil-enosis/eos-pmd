import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectWithMilestones } from "@/lib/data";
import { canAccessDelivery, canManageProject } from "@/lib/permissions";
import { getMilestoneFlag } from "@/lib/derived";
import { deleteMilestone, reopenMilestone, requestRatingReconsideration, sendMilestoneForReview } from "@/lib/actions";
import { formatDate, formatDateTime } from "@/lib/format";
import { Card, FlagBadge, MilestoneStatusBadge, PageHeader, SectionHeading } from "@/components/ui";
import MilestoneAttachments from "@/components/MilestoneAttachments";
import MilestoneReviewSummary from "@/components/MilestoneReviewSummary";

export default async function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ id: string; milestoneId: string }>;
}) {
  const { id, milestoneId } = await params;
  const user = await requireUser();

  const project = await getProjectWithMilestones(id);
  if (!project || !canAccessDelivery(project)) notFound();

  const milestone = project.milestones.find((m) => m.id === milestoneId);
  if (!milestone) notFound();

  const flag = getMilestoneFlag(milestone);
  const siblingSent = project.milestones.find((m) => m.id !== milestoneId && m.status === "sent");
  const isWhole = project.projectType === "whole";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {milestone.title}
            <MilestoneStatusBadge status={milestone.status} />
            <FlagBadge flag={flag} />
          </span>
        }
        description={`Project — ${project.name}`}
        back={{ href: `/projects/${id}`, label: "Back to Project" }}
        action={
          milestone.status === "sent" ? null : (
            <Link
              href={`/projects/${id}/milestones/${milestoneId}/edit`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Edit Milestone
            </Link>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionHeading>Milestone Details</SectionHeading>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Target Date</dt>
              <dd className="text-slate-700 dark:text-slate-200">{formatDate(milestone.targetDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Created</dt>
              <dd className="text-slate-700 dark:text-slate-200">{formatDate(milestone.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Assigned to</dt>
              <dd className="text-slate-700 dark:text-slate-200">
                {milestone.assignees.length === 0
                  ? "—"
                  : milestone.assignees.map((a) => a.name ?? a.email).join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">URL</dt>
              <dd className="truncate text-slate-700 dark:text-slate-200">
                {milestone.url ? (
                  <a href={milestone.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {milestone.url}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>

          {milestone.description ? (
            <div
              className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: milestone.description }}
            />
          ) : (
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-400 dark:border-slate-800">
              No description.
            </p>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <SectionHeading>Attachments</SectionHeading>
            <MilestoneAttachments
              projectId={id}
              milestone={milestone}
              currentUserId={user.id}
              isVendorOwner={canManageProject(project)}
              canUpload={project.executionStatus !== "completed"}
            />
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeading>Client Review</SectionHeading>

            {milestone.status === "draft" ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Send this milestone to the client for their review.
                </p>
                {siblingSent ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    &ldquo;{siblingSent.title}&rdquo; is already with the client. Only one milestone can be under review at a
                    time.
                  </p>
                ) : null}
                <form action={sendMilestoneForReview.bind(null, id, milestoneId)}>
                  <button
                    type="submit"
                    disabled={!!siblingSent}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Send for client review
                  </button>
                </form>
              </div>
            ) : milestone.status === "sent" ? (
              <div className="space-y-3 text-sm">
                <p className="text-slate-600 dark:text-slate-300">
                  With the client since {formatDateTime(milestone.sentAt)}. Locked from edits until reviewed.
                </p>
                <form action={reopenMilestone.bind(null, id, milestoneId)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Recall from review
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                <MilestoneReviewSummary milestone={milestone} />
                {milestone.comment ? (
                  <blockquote className="rounded-lg bg-slate-50 p-3 text-sm italic text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    &ldquo;{milestone.comment}&rdquo;
                  </blockquote>
                ) : null}
                <div className="text-xs text-slate-400">
                  Reviewed {formatDateTime(milestone.reviewedAt)}
                  {milestone.reviewedByName || milestone.reviewedByEmail
                    ? ` by ${milestone.reviewedByName ?? milestone.reviewedByEmail}`
                    : ""}
                </div>
                {milestone.editRequestedByVendor ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    Reconsideration requested — waiting on the client. They may or may not change it.
                  </p>
                ) : (
                  <form action={requestRatingReconsideration.bind(null, id, milestoneId)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Ask client to reconsider
                    </button>
                  </form>
                )}
              </div>
            )}
          </Card>

          {milestone.status !== "sent" && !isWhole ? (
            <form action={deleteMilestone.bind(null, id, milestoneId)}>
              <button
                type="submit"
                className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
              >
                Delete milestone
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
