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
import {
  computeProjectPerformance,
  getMilestoneDisplayStatus,
  getMilestoneFlag,
  isMilestoneReviewed,
} from "@/lib/derived";
import { formatDate, formatDateTime, formatPercent, formatRating } from "@/lib/format";
import { CAPSTONE_TIER_LABELS, RATING_SELF_CORRECTION_HOURS } from "@/lib/constants";
import {
  confirmCompletion,
  deleteProject,
  requestCapstone,
  requestCompletion,
  submitForApproval,
} from "@/lib/actions";
import {
  AdminStatusBadge,
  Badge,
  Card,
  EmptyState,
  ExecutionStatusBadge,
  FlagBadge,
  GhostButton,
  GhostLink,
  HealthBadge,
  InfoField,
  InkButton,
  InkLink,
  MilestoneStatusBadge,
  PageHeader,
  SectionHeading,
  StatRow,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { ActionForm } from "@/components/ActionForm";
import { SetBreadcrumb } from "@/components/Breadcrumbs";
import {
  ProjectActionsMenu,
  type ApprovalState,
  type MenuActionItem,
} from "@/components/ProjectActionsMenu";
import { ProjectPeopleField } from "@/components/ProjectPeopleField";
import MilestoneAttachments from "@/components/MilestoneAttachments";
import MilestoneReviewSummary from "@/components/MilestoneReviewSummary";
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

  // People management (delivery team) — the "+" popover on the People cell.
  const myCompany = await getMyCompany().catch(() => null);
  const canManagePeople =
    delLead && !!myCompany && myCompany.id === project.deliveringCompanyId;
  const companyMembers = canManagePeople && myCompany ? await listCompanyMembers(myCompany.id) : [];

  const canRequestCompletion = delLead && project.executionStatus === "ongoing";

  // Everything that isn't Edit / Add milestone / Request completion lives under
  // the "⋯" menu.
  const menuExtras: MenuActionItem[] = [];
  if (delLead && project.executionStatus === "completed" && !project.capstone?.requested) {
    menuExtras.push({
      label: "Request capstone endorsement",
      icon: "pi pi-verified",
      action: requestCapstone.bind(null, project.id),
      success: "Capstone endorsement requested.",
    });
  }
  if (delLead) {
    menuExtras.push({
      label: "Delete project",
      icon: "pi pi-trash",
      danger: true,
      action: deleteProject.bind(null, project.id),
      confirm: {
        title: "Delete this project?",
        body: `"${project.name}" and everything under it (its milestones, uploaded files, activity log and pending invites) will be permanently removed. This can't be undone.`,
        confirmLabel: "Delete project",
      },
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
      <SetBreadcrumb entries={{ [`/projects/${project.id}`]: project.name }} />
      <PageHeader
        title={project.name}
        description={
          del
            ? `${project.clientCompanyName}${project.clientContactName ? ` · ${project.clientContactName}` : ""}`
            : `Delivered by ${project.deliveringCompanyName ?? "the delivery team"} · Your role: ${reviewRoleLabel(project)}`
        }
        back={{ href: "/projects", label: "All projects" }}
        action={
          <>
            {delLead ? (
              <GhostLink href={`/projects/${project.id}/edit`} icon="edit">
                Edit
              </GhostLink>
            ) : null}
            {del ? (
              <GhostLink href={`/projects/${project.id}/milestones/new`} icon="add">
                Add milestone
              </GhostLink>
            ) : null}
            {canRequestCompletion ? (
              <ActionForm
                action={requestCompletion.bind(null, project.id)}
                success="Completion requested. The client has been notified."
              >
                <GhostButton type="submit" icon="flag">
                  Request completion
                </GhostButton>
              </ActionForm>
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Card>
          <SectionHeading>Project overview</SectionHeading>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
            {del ? (
              <InfoField icon="building" tone="blue" label="Client" value={project.clientCompanyName} />
            ) : (
              <InfoField
                icon="building"
                tone="blue"
                label="Delivered by"
                value={project.deliveringCompanyName ?? "—"}
              />
            )}
            {del ? (
              <InfoField icon="envelope" tone="blue" label="Client email" value={project.clientEmail} mono />
            ) : null}
            <InfoField icon="th-large" tone="indigo" label="Services" value={project.services} />
            <InfoField icon="calendar" tone="green" label="Start date" value={formatDate(project.startDate)} mono />
            <InfoField
              icon="calendar"
              tone="orange"
              label="Expected completion"
              value={formatDate(project.expectedCompletionDate)}
              mono
            />
            {del ? (
              <InfoField
                icon="users"
                tone="purple"
                label="Team size"
                value={project.teamSize?.toString() ?? "—"}
                mono
              />
            ) : null}
            {del ? (
              <InfoField icon="tag" tone="rose" label="Engagement model" value={project.engagementModel} />
            ) : null}
            {del ? (
              <InfoField
                icon="user"
                tone="purple"
                label="Client contacts"
                value={project.clientContacts.map((c) => c.name ?? c.email).join(", ") || "—"}
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
          </div>
          {project.description ? (
            <div className="mt-5 border-t border-rule pt-4">
              <div className="mb-2 text-xs font-medium text-ink-muted">Description</div>
              <div className="flex items-start gap-3 rounded-[8px] bg-band p-4">
                <Icon name="file" className="mt-0.5 shrink-0 text-[15px] text-ink-muted" />
                <p className="prose-ledger whitespace-pre-line text-sm text-ink">{project.description}</p>
              </div>
            </div>
          ) : null}
        </Card>

        <Card>
          <SectionHeading>Performance</SectionHeading>
          <div className="space-y-3">
            <StatRow icon="star" tone="amber" label="Average rating" value={formatRating(perf.avgRating)} strong />
            <StatRow icon="flag" tone="green" label="Milestones" value={perf.totalMilestones} />
            <StatRow icon="comment" tone="blue" label="Reviewed" value={perf.milestonesReviewed} />
            <StatRow icon="clock" tone="purple" label="In progress" value={perf.activeMilestones} />
            <StatRow icon="send" tone="teal" label="Response rate" value={formatPercent(perf.responseRate)} />
            <StatRow icon="star" tone="slate" label="Latest rating" value={formatRating(perf.latestRating)} />
            <StatRow icon="heart" tone="rose" label="Client health" value={<HealthBadge health={perf.health} />} />
          </div>
          {perf.satisfactionDeclined ? (
            <p className="mt-3 flex items-start gap-1.5 border-t border-rule pt-3 text-xs text-rag-warn">
              <Icon name="trending_down" className="mt-0.5 shrink-0 text-[14px]" />
              Rating is declining versus the previous milestone.
            </p>
          ) : null}
        </Card>
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
            actionHref={del ? `/projects/${project.id}/milestones/new` : undefined}
            actionLabel={del ? "Add milestone" : undefined}
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
                      <MilestoneStatusBadge status={getMilestoneDisplayStatus(m)} />
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
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
                      <InkLink href={`/projects/${id}/milestones/${m.id}/review`} icon="rate_review">
                        {m.reviewDraft ? "Continue your review" : "Review this milestone"}
                      </InkLink>
                      {m.reviewDraft ? (
                        <span className="text-xs text-ink-muted">You have a saved draft.</span>
                      ) : null}
                    </div>
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
                      <InkLink href={`/projects/${id}/milestones/${m.id}/review`} icon="rate_review">
                        Update your review
                      </InkLink>
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
