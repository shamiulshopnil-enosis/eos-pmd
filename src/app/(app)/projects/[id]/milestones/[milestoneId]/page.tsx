import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectWithMilestones } from "@/lib/data";
import { canAccessDelivery, canManageProject } from "@/lib/permissions";
import { getMilestoneDisplayStatus, getMilestoneFlag } from "@/lib/derived";
import { deleteMilestone, reopenMilestone, requestRatingReconsideration, sendMilestoneForReview } from "@/lib/actions";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  Card,
  FlagBadge,
  GhostButton,
  GhostLink,
  InfoField,
  InkButton,
  MilestoneStatusBadge,
  PageHeader,
  SectionHeading,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import MilestoneAttachments from "@/components/MilestoneAttachments";
import MilestoneReviewCard from "@/components/MilestoneReviewCard";
import { SetBreadcrumb } from "@/components/Breadcrumbs";

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

  return (
    <div>
      <SetBreadcrumb
        entries={{
          [`/projects/${id}`]: project.name,
          [`/projects/${id}/milestones/${milestoneId}`]: milestone.title,
        }}
      />
      <PageHeader
        title={milestone.title}
        description={`Project: ${project.name}`}
        back={{ href: `/projects/${id}`, label: project.name }}
        action={
          <>
            {milestone.status === "sent" || milestone.status === "reviewed" ? null : (
              <GhostLink href={`/projects/${id}/milestones/${milestoneId}/edit`} icon="edit">
                Edit milestone
              </GhostLink>
            )}
            {milestone.status !== "sent" ? (
              <ConfirmDeleteButton
                label="Delete milestone"
                action={deleteMilestone.bind(null, id, milestoneId)}
                confirmTitle="Delete this milestone?"
                confirmBody={`"${milestone.title}" and its attachments and review history will be permanently removed. This can't be undone.`}
                confirmLabel="Delete milestone"
              />
            ) : null}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <MilestoneStatusBadge status={getMilestoneDisplayStatus(milestone)} />
        <FlagBadge flag={flag} />
      </div>

      <div className="space-y-4">
        <Card>
          <SectionHeading>Milestone details</SectionHeading>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
            <InfoField icon="calendar" tone="green" label="Start date" value={formatDate(milestone.startDate)} mono />
            <InfoField icon="calendar" tone="orange" label="Due date" value={formatDate(milestone.dueDate)} mono />
            <InfoField icon="clock" tone="slate" label="Created" value={formatDate(milestone.createdAt)} mono />
            <InfoField
              icon="users"
              tone="purple"
              label="Assigned to"
              value={
                milestone.assignees.length === 0
                  ? "—"
                  : milestone.assignees.map((a) => a.name ?? a.email).join(", ")
              }
            />
          </div>

          {milestone.url ? (
            <div className="mt-5 text-sm">
              <a
                href={milestone.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-link underline underline-offset-2 hover:text-link-strong"
              >
                <Icon name="link" className="text-[14px]" />
                {milestone.url}
              </a>
            </div>
          ) : null}

          <div className="mt-5 border-t border-rule pt-4">
            <div className="mb-2 text-xs font-medium text-ink-muted">Description</div>
            {milestone.description ? (
              <div
                className="prose-ledger max-w-[68ch] text-sm"
                dangerouslySetInnerHTML={{ __html: milestone.description }}
              />
            ) : (
              <p className="text-sm text-ink-muted">No description.</p>
            )}
          </div>

          <div className="mt-6 border-t border-rule pt-5">
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

        <Card>
          {milestone.status !== "reviewed" ? <SectionHeading>Client review</SectionHeading> : null}

          {milestone.status === "draft" ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-muted">Send this milestone to the client for their review.</p>
              {siblingSent ? (
                <p className="rounded-ledger border border-rule bg-band px-3 py-2 text-xs text-rag-warn">
                  &ldquo;{siblingSent.title}&rdquo; is already with the client. Only one milestone can be under
                  review at a time.
                </p>
              ) : null}
              <ActionForm
                action={sendMilestoneForReview.bind(null, id, milestoneId)}
                success="Milestone sent to the client for review."
              >
                <InkButton type="submit" icon="send" disabled={!!siblingSent}>
                  Send for client review
                </InkButton>
              </ActionForm>
            </div>
          ) : milestone.status === "sent" ? (
            <div className="space-y-3 text-sm">
              <p className="text-ink-muted">
                With the client since {formatDateTime(milestone.sentAt)}. Locked from edits until reviewed.
              </p>
              <ActionForm
                action={reopenMilestone.bind(null, id, milestoneId)}
                success="Milestone recalled from review."
              >
                <GhostButton type="submit" icon="undo">
                  Recall from review
                </GhostButton>
              </ActionForm>
            </div>
          ) : milestone.status === "rejected" ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium text-rag-bad">
                Rejected by {milestone.rejectedByName ?? milestone.rejectedByEmail ?? "the client"}
                {milestone.rejectedAt ? ` on ${formatDateTime(milestone.rejectedAt)}` : ""}.
              </p>
              {milestone.rejectionReason ? (
                <blockquote className="rounded-ledger border border-rule bg-band p-3 italic text-ink-muted">
                  &ldquo;{milestone.rejectionReason}&rdquo;
                </blockquote>
              ) : null}
              <p className="text-ink-muted">
                Use <span className="font-medium">Edit milestone</span> above to revise it, then send it back.
              </p>
              {siblingSent ? (
                <p className="rounded-ledger border border-rule bg-band px-3 py-2 text-xs text-rag-warn">
                  &ldquo;{siblingSent.title}&rdquo; is with the client right now. Only one milestone can be under
                  review at a time.
                </p>
              ) : null}
              <ActionForm
                action={sendMilestoneForReview.bind(null, id, milestoneId)}
                success="Milestone sent to the client for review."
              >
                <InkButton type="submit" icon="send" disabled={!!siblingSent}>
                  Send for review again
                </InkButton>
              </ActionForm>
            </div>
          ) : (
            <div className="space-y-3">
              <MilestoneReviewCard milestone={milestone} />
              {milestone.comment ? (
                <blockquote className="rounded-ledger border border-rule bg-band p-3 text-sm italic text-ink-muted">
                  &ldquo;{milestone.comment}&rdquo;
                </blockquote>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="calendar" className="text-[13px]" />
                  Reviewed {formatDateTime(milestone.reviewedAt)}
                </span>
                {milestone.reviewedByName || milestone.reviewedByEmail ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="user" className="text-[13px]" />
                    by {milestone.reviewedByName ?? milestone.reviewedByEmail}
                  </span>
                ) : null}
              </div>
              {milestone.editRequestedByVendor ? (
                <p className="rounded-ledger border border-rule bg-band px-3 py-2 text-xs text-rag-warn">
                  Reconsideration requested. Waiting on the client. They may or may not change it.
                </p>
              ) : (
                <ActionForm
                  action={requestRatingReconsideration.bind(null, id, milestoneId)}
                  success="Asked the client to reconsider their rating."
                >
                  <GhostButton
                    type="submit"
                    icon="rate_review"
                    className="!rounded-full !border-transparent !bg-[var(--link-subtle-bg)] !text-link hover:!bg-[var(--link-subtle-bg)]"
                  >
                    Ask client to reconsider
                  </GhostButton>
                </ActionForm>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
