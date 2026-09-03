import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMyCompany, getProjectDetail, listCompanyMembers } from "@/lib/data";
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
  rejectMilestone,
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
import { ActionForm } from "@/components/ActionForm";
import {
  ProjectActionsMenu,
  type ApprovalState,
  type MenuActionItem,
} from "@/components/ProjectActionsMenu";
import { ProjectPeopleField } from "@/components/ProjectPeopleField";
import MilestoneAttachments from "@/components/MilestoneAttachments";
import MilestoneReviewSummary from "@/components/MilestoneReviewSummary";
import MilestoneReviewForm from "@/components/MilestoneReviewForm";
import MilestoneRejectForm from "@/components/MilestoneRejectForm";
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

  // People management (delivery team) — the "+" popover on the People cell.
  const myCompany = await getMyCompany().catch(() => null);
  const canManagePeople =
    delLead && !!myCompany && myCompany.id === project.deliveringCompanyId;
  const companyMembers = canManagePeople && myCompany ? await listCompanyMembers(myCompany.id) : [];

  // Everything that isn't Edit / Add milestone lives under the "⋯" menu.
  const menuExtras: MenuActionItem[] = [];
  if (delLead && project.executionStatus === "ongoing") {
    menuExtras.push({
      label: "Request completion",
      icon: "pi pi-flag",
      action: requestCompletion.bind(null, project.id),
      success: "Completion requested — the client has been notified.",
    });
  }
  if (delLead && project.executionStatus === "completed" && !project.capstone?.requested) {
    menuExtras.push({
      label: "Request capstone endorsement",
      icon: "pi pi-verified",
      action: requestCapstone.bind(null, project.id),
      success: "Capstone endorsement requested.",
    });
  }

  let approval: ApprovalState = null;
  if (delLead) {
    if (project.visibility === "PUBLIC") {
      approval = { kind: "publicPage", href: `/projects/${project.id}/public-preview` };
    } else if (project.adminStatus === "published") {
      approval = { kind: "publish", href: `/projects/${project.id}/publish` };
    } else if (project.adminStatus === "pending_approval") {
      approval = { kind: "pending" };
    } else {
      approval = { kind: "submit", action: submitForApproval.bind(null, project.id) };
    }
  }

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
            {delLead ? (
              <GhostLink href={`/projects/${project.id}/edit`} icon="edit">
                Edit
              </GhostLink>
            ) : null}
            {del && !isWhole ? (
              <GhostLink href={`/projects/${project.id}/milestones/new`} icon="add">
                Add milestone
              </GhostLink>
            ) : null}
            <ProjectActionsMenu
              activities={project.activities}
              approval={approval}
              extras={menuExtras}
            />
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
            <ActionForm action={confirmCompletion.bind(null, id)} success="Completion confirmed." className="mt-3">
              <InkButton type="submit" icon="check">
                Confirm completion
              </InkButton>
            </ActionForm>
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
            {del ? (
              <Info
                label="Client contacts"
                value={
                  project.clientContacts.map((c) => c.name ?? c.email).join(", ") || "—"
                }
              />
            ) : null}
            {del ? (
              <ProjectPeopleField
                projectId={project.id}
                team={project.vendorTeam.map((m) => ({
                  email: m.email,
                  name: m.name,
                  invitePending: m.invitePending,
                }))}
                canManage={canManagePeople}
                directory={companyMembers}
                selectedMemberIds={project.assignedMemberIds}
                companyId={project.deliveringCompanyId ?? ""}
              />
            ) : null}
          </dl>
          {project.description ? (
            <p className="prose-ledger mt-5 max-w-[68ch] whitespace-pre-line border-t border-rule pt-4 text-sm">
              {project.description}
            </p>
          ) : null}

          {delLead ? (
            <ActionForm
              action={setProjectStatus.bind(null, project.id)}
              success="Project status updated."
              className="mt-5 flex flex-wrap items-end gap-3 border-t border-rule pt-4"
            >
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink">Project status</span>
                <div className="w-48">
                  <Select name="status" defaultValue={project.status} options={Object.entries(PROJECT_STATUS_LABELS)} />
                </div>
              </label>
              <GhostButton type="submit">Update</GhostButton>
            </ActionForm>
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
                    <>
                      <MilestoneReviewForm
                        action={submitMilestoneRating.bind(null, id, m.id)}
                        submitLabel="Submit review"
                        intro="Please rate this milestone on each of the following."
                      />
                      <MilestoneRejectForm
                        action={rejectMilestone.bind(null, id, m.id)}
                        assignees={m.assignees}
                      />
                    </>
                  ) : null}

                  {m.status === "rejected" ? (
                    <div className="mt-3 border-t border-rule pt-3">
                      <p className="text-sm font-medium text-rag-bad">
                        You rejected this milestone
                        {m.rejectedAt ? ` on ${formatDateTime(m.rejectedAt)}` : ""}.
                      </p>
                      {m.rejectionReason ? (
                        <blockquote className="mt-2 rounded-ledger border border-rule bg-band p-3 text-sm italic text-ink-muted">
                          &ldquo;{m.rejectionReason}&rdquo;
                        </blockquote>
                      ) : null}
                      <p className="mt-2 text-xs text-ink-muted">
                        The delivery team can revise it and send it back for review.
                      </p>
                    </div>
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
                    <div className="mb-1.5 text-xs font-semibold text-ink-muted">
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
      <dt className="mb-0.5 text-xs font-medium text-ink-muted">{label}</dt>
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
