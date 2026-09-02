import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectDetail } from "@/lib/data";
import {
  canAccessDelivery,
  canAccessReview,
  canManageProject,
  canManageReview,
  reviewRoleLabel,
} from "@/lib/permissions";
import { computeProjectPerformance, getMilestoneFlag, isMilestoneReviewed } from "@/lib/derived";
import { formatDate, formatDateTime, formatPercent, formatRating } from "@/lib/format";
import {
  PROJECT_STATUS_LABELS,
  CAPSTONE_TIER_LABELS,
  RATING_SELF_CORRECTION_HOURS,
} from "@/lib/constants";
import {
  confirmCompletion,
  editOwnMilestoneRating,
  requestCapstone,
  requestCompletion,
  setProjectStatus,
  submitForApproval,
  submitMilestoneRating,
} from "@/lib/actions";
import {
  AdminStatusBadge,
  Badge,
  EmptyState,
  ExecutionStatusBadge,
  FlagBadge,
  GhostButton,
  GhostLink,
  HealthBadge,
  InkButton,
  InkLink,
  MilestoneStatusBadge,
  PageHeader,
  ProjectStatusBadge,
  ProjectTypeBadge,
  SectionHeading,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { Select } from "@/components/form";
import MilestoneAttachments from "@/components/MilestoneAttachments";
import MilestoneReviewSummary from "@/components/MilestoneReviewSummary";
import MilestoneReviewForm from "@/components/MilestoneReviewForm";
import ActivityLogModal from "@/components/ActivityLogModal";
import ProjectMilestoneTable from "@/components/ProjectMilestoneTable";

const WINDOW_MS = RATING_SELF_CORRECTION_HOURS * 60 * 60 * 1000;
const withinCorrectionWindow = (at: Date | null) =>
  at != null && Date.now() - at.getTime() <= WINDOW_MS;

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const project = await getProjectDetail(id);
  if (!project) notFound();

  const del = canAccessDelivery(project);
  const delLead = canManageProject(project);
  const rev = canAccessReview(project);
  const revLead = canManageReview(project);
  if (!del && !rev && user.role !== "admin") notFound();

  const perf = computeProjectPerformance(project);
  const isWhole = project.projectType === "whole";

  return (
    <div>
      <PageHeader
        title={project.name}
        description={
          del
            ? `${project.clientCompanyName}${project.clientContactName ? ` · ${project.clientContactName}` : ""}`
            : `Your role: ${reviewRoleLabel(project)}`
        }
        back={{ href: "/projects", label: "All projects" }}
        action={
          <>
            <ActivityLogModal activities={project.activities} />
            {delLead || revLead ? (
              <GhostLink href={`/projects/${project.id}/team`} icon="group">
                People
              </GhostLink>
            ) : null}
            {delLead ? (
              <>
                <GhostLink href={`/projects/${project.id}/edit`} icon="edit">
                  Edit
                </GhostLink>
                {project.executionStatus === "ongoing" ? (
                  <form action={requestCompletion.bind(null, project.id)}>
                    <GhostButton type="submit" icon="flag_circle">
                      Request completion
                    </GhostButton>
                  </form>
                ) : project.executionStatus === "awaiting_completion" ? (
                  <StatusPill icon="hourglass_top" tone="warn">
                    Awaiting client confirmation
                  </StatusPill>
                ) : null}
                {project.executionStatus === "completed" && !project.capstone?.requested ? (
                  <form action={requestCapstone.bind(null, project.id)}>
                    <GhostButton type="submit" icon="workspace_premium">
                      Request capstone
                    </GhostButton>
                  </form>
                ) : project.capstone?.requested && !project.capstone.submitted ? (
                  <StatusPill icon="workspace_premium" tone="link">
                    Capstone requested
                  </StatusPill>
                ) : null}
              </>
            ) : null}
            {del && !isWhole ? (
              <GhostLink href={`/projects/${project.id}/milestones/new`} icon="add">
                Add milestone
              </GhostLink>
            ) : null}
            {delLead ? (
              project.visibility === "PUBLIC" ? (
                <InkLink href={`/projects/${project.id}/public-preview`} icon="public">
                  View public page
                </InkLink>
              ) : project.adminStatus === "published" ? (
                <InkLink href={`/projects/${project.id}/publish`} icon="publish">
                  Publish project
                </InkLink>
              ) : project.adminStatus === "pending_approval" ? (
                <StatusPill icon="hourglass_top" tone="warn">
                  Pending admin approval
                </StatusPill>
              ) : (
                <form action={submitForApproval.bind(null, project.id)}>
                  <InkButton type="submit" icon="send">
                    Submit for approval
                  </InkButton>
                </form>
              )
            ) : null}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <ProjectTypeBadge type={project.projectType} />
        <ProjectStatusBadge status={project.status} />
        <AdminStatusBadge status={project.adminStatus} />
        <ExecutionStatusBadge status={project.executionStatus} />
        <Badge tone={project.visibility === "PUBLIC" ? "blue" : "slate"}>
          {project.visibility === "PUBLIC" ? "Public" : "Private"}
        </Badge>
      </div>

      {/* --- Review-side banners --- */}
      {rev && project.executionStatus === "awaiting_completion" ? (
        <Banner icon="flag_circle" tone="warn" title="Completion requested">
          <p>
            The delivery team has marked this project as delivered. Confirming locks the final score
            at {formatRating(perf.avgRating)}
            {perf.avgRating == null ? " (unrated)" : ""}.
          </p>
          {revLead ? (
            <form action={confirmCompletion.bind(null, id)} className="mt-3">
              <InkButton type="submit" icon="check">
                Confirm completion
              </InkButton>
            </form>
          ) : (
            <p className="mt-2 text-xs opacity-80">Awaiting a client lead&apos;s confirmation.</p>
          )}
        </Banner>
      ) : null}

      {rev && project.capstone?.requested && !project.capstone.submitted ? (
        <Banner icon="workspace_premium" tone="link" title="Capstone endorsement requested">
          <p>The delivery team has asked for a short written endorsement of the whole engagement.</p>
          {revLead ? (
            <div className="mt-3">
              <InkLink href={`/projects/${id}/capstone`} icon="rate_review">
                Write the endorsement
              </InkLink>
            </div>
          ) : (
            <p className="mt-2 text-xs opacity-80">Awaiting a client lead&apos;s endorsement.</p>
          )}
        </Banner>
      ) : null}

      {/* --- Overview + performance --- */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <SectionHeading>Project overview</SectionHeading>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-sm sm:grid-cols-3">
            <Info label="Client" value={project.clientCompanyName} />
            {del ? <Info label="Client email" value={project.clientEmail} mono /> : null}
            <Info label="Services" value={project.services} />
            <Info label="Start date" value={formatDate(project.startDate)} mono />
            <Info label="Expected completion" value={formatDate(project.expectedCompletionDate)} mono />
            <Info label="Actual completion" value={formatDate(project.actualCompletionDate)} mono />
            {del ? <Info label="Team size" value={project.teamSize?.toString() ?? "—"} mono /> : null}
            {del ? <Info label="Engagement model" value={project.engagementModel} /> : null}
            {del ? <Info label="Internal reference" value={project.internalRef} mono /> : null}
          </dl>
          {project.description ? (
            <p className="prose-ledger mt-5 max-w-[68ch] whitespace-pre-line border-t border-rule pt-4 text-sm">
              {project.description}
            </p>
          ) : null}

          {delLead ? (
            <form
              action={setProjectStatus.bind(null, project.id)}
              className="mt-5 flex flex-wrap items-center gap-2 border-t border-rule pt-4"
            >
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-ink-muted">
                Project status
              </span>
              <div className="w-44">
                <Select name="status" defaultValue={project.status} options={Object.entries(PROJECT_STATUS_LABELS)} />
              </div>
              <GhostButton type="submit">Update</GhostButton>
            </form>
          ) : null}
        </div>

        <aside className="lg:border-l lg:border-rule lg:pl-6">
          <SectionHeading>Performance</SectionHeading>
          <dl className="space-y-2.5 text-sm">
            <SummaryRow label="Average rating" value={formatRating(perf.avgRating)} strong />
            <SummaryRow label="Milestones" value={perf.totalMilestones} />
            <SummaryRow label="Reviewed" value={perf.milestonesReviewed} />
            <SummaryRow label="In progress" value={perf.activeMilestones} />
            <SummaryRow label="Response rate" value={formatPercent(perf.responseRate)} />
            <SummaryRow label="Latest rating" value={formatRating(perf.latestRating)} />
            <div className="flex items-center justify-between gap-2 pt-1">
              <dt className="text-ink-muted">Client health</dt>
              <dd>
                <HealthBadge health={perf.health} />
              </dd>
            </div>
            {perf.satisfactionDeclined ? (
              <p className="mt-1 flex items-start gap-1.5 border-t border-rule pt-2 text-xs text-rag-warn">
                <Icon name="trending_down" className="mt-0.5 shrink-0 text-[14px]" />
                Rating is declining versus the previous milestone.
              </p>
            ) : null}
          </dl>
        </aside>
      </div>

      {/* --- Milestones --- */}
      <div className="mt-8">
        <SectionHeading>Milestones</SectionHeading>
        {project.milestones.length === 0 ? (
          <EmptyState
            icon="flag"
            title="No milestones yet"
            description={
              del
                ? "Add the first milestone to start tracking this project's delivery performance."
                : "Milestones will appear here once the delivery team adds them."
            }
            actionHref={del && !isWhole ? `/projects/${project.id}/milestones/new` : undefined}
            actionLabel={del && !isWhole ? "Add milestone" : undefined}
          />
        ) : del ? (
          <ProjectMilestoneTable projectId={project.id} milestones={project.milestones} />
        ) : (
          <div className="space-y-4">
            {project.milestones.map((m) => {
              const isReviewer = m.reviewedByUserId === user.id;
              const canEdit =
                isReviewer &&
                m.status === "reviewed" &&
                (withinCorrectionWindow(m.ratingSubmittedAt) || m.editRequestedByVendor);
              return (
                <div key={m.id} className="rounded-ledger border border-rule bg-panel p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2 font-medium text-ink">
                      {m.title}
                      <MilestoneStatusBadge status={m.status} />
                      <FlagBadge flag={getMilestoneFlag(m)} />
                    </span>
                    <span className="font-mono text-xs text-ink-muted">
                      {m.startDate ? `${formatDate(m.startDate)} – ` : ""}
                      Due {formatDate(m.dueDate)}
                    </span>
                  </div>

                  {m.description ? (
                    <div
                      className="prose-ledger mt-3 text-sm"
                      dangerouslySetInnerHTML={{ __html: m.description }}
                    />
                  ) : null}
                  {m.url ? (
                    <div className="mt-2 text-sm">
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-link underline underline-offset-2 hover:text-link-strong"
                      >
                        <Icon name="link" className="text-[14px]" />
                        {m.url}
                      </a>
                    </div>
                  ) : null}

                  {isMilestoneReviewed(m) && !canEdit ? (
                    <div className="mt-3 border-t border-rule pt-3">
                      <MilestoneReviewSummary milestone={m} />
                      {m.comment ? (
                        <p className="mt-2 text-sm italic text-ink-muted">&ldquo;{m.comment}&rdquo;</p>
                      ) : null}
                      <div className="mt-1 font-mono text-xs text-ink-muted">
                        Reviewed {formatDateTime(m.reviewedAt)}
                        {m.reviewedByName || m.reviewedByEmail
                          ? ` by ${m.reviewedByName ?? m.reviewedByEmail}`
                          : ""}
                      </div>
                    </div>
                  ) : null}

                  {m.status === "sent" ? (
                    <MilestoneReviewForm
                      action={submitMilestoneRating.bind(null, id, m.id)}
                      submitLabel="Submit review"
                      intro="Please rate this milestone on each of the following."
                    />
                  ) : null}

                  {canEdit ? (
                    <div className="mt-3 border-t border-rule pt-3">
                      {m.editRequestedByVendor ? (
                        <p className="mb-2 rounded-ledger border border-rag-warn/40 bg-band px-3 py-2 text-xs text-rag-warn">
                          The delivery team has asked you to revisit this rating. Changing it is your call.
                        </p>
                      ) : (
                        <p className="mb-2 text-xs text-ink-muted">
                          You can still change this rating for {RATING_SELF_CORRECTION_HOURS} hours after submitting.
                        </p>
                      )}
                      <MilestoneReviewForm
                        action={editOwnMilestoneRating.bind(null, id, m.id)}
                        submitLabel="Update review"
                        defaultReview={m.ratings}
                        defaultComment={m.comment ?? ""}
                      />
                    </div>
                  ) : null}

                  <div className="mt-3 border-t border-rule pt-3">
                    <div className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {project.capstone?.submitted ? (
        <div className="mt-8">
          <SectionHeading>Capstone endorsement</SectionHeading>
          <div className="rounded-ledger border border-rule bg-panel p-5">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge tone="purple">
                {CAPSTONE_TIER_LABELS[project.capstone.tier] ?? project.capstone.tier}
              </Badge>
              {project.capstone.anonymous ? <Badge tone="slate">Anonymous</Badge> : null}
            </div>
            {project.capstone.attributes.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {project.capstone.attributes.map((attr) => (
                  <Badge key={attr} tone="blue">
                    {attr}
                  </Badge>
                ))}
              </div>
            ) : null}
            {project.capstone.testimonial ? (
              <p className="text-sm italic text-ink-muted">&ldquo;{project.capstone.testimonial}&rdquo;</p>
            ) : null}
            <div className="mt-2 font-mono text-xs text-ink-muted">
              Submitted {formatDateTime(project.capstone.submittedAt)}
            </div>
          </div>
        </div>
      ) : null}
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
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-ink-muted">{label}</dt>
      <dd className={`text-ink ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string | number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`font-mono tabular-nums text-ink ${strong ? "text-base font-semibold" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function StatusPill({
  children,
  icon,
  tone,
}: {
  children: React.ReactNode;
  icon: string;
  tone: "warn" | "link";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-ledger border px-3 py-2 text-sm font-medium ${
        tone === "warn" ? "border-rag-warn/50 text-rag-warn" : "border-link/50 text-link"
      }`}
    >
      <Icon name={icon} className="text-[16px]" />
      {children}
    </span>
  );
}

function Banner({
  children,
  icon,
  tone,
  title,
}: {
  children: React.ReactNode;
  icon: string;
  tone: "warn" | "link";
  title: string;
}) {
  return (
    <div className="mb-6 rounded-ledger border border-rule bg-panel p-4 text-sm">
      <div
        className={`mb-1 flex items-center gap-1.5 font-semibold ${
          tone === "warn" ? "text-rag-warn" : "text-link"
        }`}
      >
        <Icon name={icon} className="text-[16px]" fill />
        {title}
      </div>
      <div className="text-ink-muted">{children}</div>
    </div>
  );
}
