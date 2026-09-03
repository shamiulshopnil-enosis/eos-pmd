import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectWithMilestones } from "@/lib/data";
import { canAccessDelivery, canManageProject } from "@/lib/permissions";
import { getMilestoneFlag } from "@/lib/derived";
import { deleteMilestone, reopenMilestone, requestRatingReconsideration, sendMilestoneForReview } from "@/lib/actions";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  FlagBadge,
  GhostButton,
  GhostLink,
  InkButton,
  MilestoneStatusBadge,
  PageHeader,
  SectionHeading,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/form";
import { ActionForm } from "@/components/ActionForm";
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
  const canDeleteMilestone = project.milestones.length > 1;

  return (
    <div>
      <PageHeader
        title={milestone.title}
        description={`Project — ${project.name}`}
        back={{ href: `/projects/${id}`, label: project.name }}
        action={
          milestone.status === "sent" ? null : (
            <GhostLink href={`/projects/${id}/milestones/${milestoneId}/edit`} icon="edit">
              Edit milestone
            </GhostLink>
          )
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <MilestoneStatusBadge status={milestone.status} />
        <FlagBadge flag={flag} />
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div>
          <SectionHeading>Milestone details</SectionHeading>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-sm sm:grid-cols-3">
            <Info label="Start date" value={formatDate(milestone.startDate)} mono />
            <Info label="Due date" value={formatDate(milestone.dueDate)} mono />
            <Info label="Created" value={formatDate(milestone.createdAt)} mono />
            <Info
              label="Assigned to"
              value={
                milestone.assignees.length === 0
                  ? "—"
                  : milestone.assignees.map((a) => a.name ?? a.email).join(", ")
              }
            />
          </dl>

          {milestone.url ? (
            <div className="mt-4 text-sm">
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

          {milestone.description ? (
            <div
              className="prose-ledger mt-4 max-w-[68ch] border-t border-rule pt-4 text-sm"
              dangerouslySetInnerHTML={{ __html: milestone.description }}
            />
          ) : (
            <p className="mt-4 border-t border-rule pt-4 text-sm text-ink-muted">No description.</p>
          )}

          <div className="mt-6">
            <SectionHeading>Attachments</SectionHeading>
            <MilestoneAttachments
              projectId={id}
              milestone={milestone}
              currentUserId={user.id}
              isVendorOwner={canManageProject(project)}
              canUpload={project.executionStatus !== "completed"}
            />
          </div>
        </div>

        <aside className="lg:border-l lg:border-rule lg:pl-6">
          <SectionHeading>Client review</SectionHeading>

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
                  &ldquo;{siblingSent.title}&rdquo; is with the client right now — only one milestone can be under
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
              <MilestoneReviewSummary milestone={milestone} />
              {milestone.comment ? (
                <blockquote className="rounded-ledger border border-rule bg-band p-3 text-sm italic text-ink-muted">
                  &ldquo;{milestone.comment}&rdquo;
                </blockquote>
              ) : null}
              <div className="font-mono text-xs text-ink-muted">
                Reviewed {formatDateTime(milestone.reviewedAt)}
                {milestone.reviewedByName || milestone.reviewedByEmail
                  ? ` by ${milestone.reviewedByName ?? milestone.reviewedByEmail}`
                  : ""}
              </div>
              {milestone.editRequestedByVendor ? (
                <p className="rounded-ledger border border-rule bg-band px-3 py-2 text-xs text-rag-warn">
                  Reconsideration requested — waiting on the client. They may or may not change it.
                </p>
              ) : (
                <ActionForm
                  action={requestRatingReconsideration.bind(null, id, milestoneId)}
                  success="Asked the client to reconsider their rating."
                >
                  <GhostButton type="submit" icon="rate_review">
                    Ask client to reconsider
                  </GhostButton>
                </ActionForm>
              )}
            </div>
          )}

          {milestone.status !== "sent" && canDeleteMilestone ? (
            <form
              action={deleteMilestone.bind(null, id, milestoneId)}
              className="mt-5 border-t border-rule pt-4"
            >
              <SubmitButton variant="text" icon="pi pi-trash">Delete milestone</SubmitButton>
            </form>
          ) : null}
        </aside>
      </div>
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
