import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectWithMilestones } from "@/lib/data";
import { canRateMilestone } from "@/lib/permissions";
import {
  editOwnMilestoneRating,
  rejectMilestone,
  saveMilestoneReviewDraft,
  submitMilestoneRating,
} from "@/lib/actions";
import { RATING_SELF_CORRECTION_HOURS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { FlagBadge, MilestoneStatusBadge, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { SetBreadcrumb } from "@/components/Breadcrumbs";
import MilestoneReviewForm from "@/components/MilestoneReviewForm";
import MilestoneRejectForm from "@/components/MilestoneRejectForm";

const CORRECTION_MS = RATING_SELF_CORRECTION_HOURS * 60 * 60 * 1000;
const withinCorrectionWindow = (at: Date | null) =>
  at != null && Date.now() - new Date(at).getTime() <= CORRECTION_MS;

export default async function MilestoneReviewPage({
  params,
}: {
  params: Promise<{ id: string; milestoneId: string }>;
}) {
  const { id, milestoneId } = await params;
  await requireUser();

  const project = await getProjectWithMilestones(id);
  if (!project) notFound();
  const milestone = project.milestones.find((m) => m.id === milestoneId);
  if (!milestone || !canRateMilestone(project)) notFound();

  const withinWindow = withinCorrectionWindow(milestone.ratingSubmittedAt);
  const isSubmit = milestone.status === "sent";
  const canEdit =
    milestone.status === "reviewed" && (withinWindow || milestone.editRequestedByVendor);

  // Nothing to do here once it's reviewed and locked.
  if (!isSubmit && !canEdit) redirect(`/projects/${id}`);

  const draft = milestone.reviewDraft;
  const defaultReview = isSubmit ? draft?.ratings ?? null : milestone.ratings;
  const defaultNotes = isSubmit ? draft?.ratingNotes ?? null : milestone.ratingNotes;
  const defaultComment = (isSubmit ? draft?.comment : milestone.comment) ?? "";

  return (
    <div className="mx-auto max-w-5xl">
      <SetBreadcrumb
        entries={{
          [`/projects/${id}`]: project.name,
          [`/projects/${id}/milestones/${milestoneId}`]: milestone.title,
        }}
      />
      <PageHeader
        title={isSubmit ? "Review milestone" : "Update your review"}
        back={{ href: `/projects/${id}`, label: project.name }}
      />

      {/* Milestone context */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4 rounded-[10px] border border-rule bg-panel p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--link-subtle-bg)] text-link">
            <Icon name="clipboard" className="text-[18px]" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-ink">{milestone.title}</h1>
              <MilestoneStatusBadge status={milestone.status} />
              {isSubmit ? <FlagBadge flag="AWAITING_REVIEW" /> : null}
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {isSubmit
                ? "Please share your feedback on this milestone."
                : "You can still change this review for a short window after submitting."}
            </p>
          </div>
        </div>
        {milestone.startDate || milestone.dueDate ? (
          <span className="flex items-center gap-1.5 font-mono text-xs text-ink-muted">
            <Icon name="calendar" className="text-[14px]" />
            {formatDate(milestone.startDate)} – {formatDate(milestone.dueDate)}
          </span>
        ) : null}
      </div>

      <MilestoneReviewForm
        mode={isSubmit ? "submit" : "edit"}
        submitAction={(isSubmit ? submitMilestoneRating : editOwnMilestoneRating).bind(
          null,
          id,
          milestoneId,
        )}
        draftAction={
          isSubmit ? saveMilestoneReviewDraft.bind(null, id, milestoneId) : undefined
        }
        defaultReview={defaultReview}
        defaultNotes={defaultNotes}
        defaultComment={defaultComment}
        draftLoaded={isSubmit && draft != null}
      />

      {isSubmit ? (
        <div className="mt-4 rounded-[10px] border border-rule bg-panel p-5">
          <MilestoneRejectForm
            action={rejectMilestone.bind(null, id, milestoneId)}
            assignees={milestone.assignees}
          />
        </div>
      ) : null}
    </div>
  );
}
