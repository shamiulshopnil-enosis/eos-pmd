import Link from "next/link";
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
  Card,
  EmptyState,
  ExecutionStatusBadge,
  FlagBadge,
  HealthBadge,
  MilestoneStatusBadge,
  PageHeader,
  ProjectStatusBadge,
  ProjectTypeBadge,
  SectionHeading,
} from "@/components/ui";
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
        title={
          <span className="flex flex-wrap items-center gap-2">
            {project.name}
            <ProjectTypeBadge type={project.projectType} />
            <ProjectStatusBadge status={project.status} />
            <AdminStatusBadge status={project.adminStatus} />
            <ExecutionStatusBadge status={project.executionStatus} />
            <Badge tone={project.visibility === "PUBLIC" ? "blue" : "slate"}>
              {project.visibility === "PUBLIC" ? "Public" : "Private"}
            </Badge>
          </span>
        }
        description={
          del
            ? `${project.clientCompanyName}${project.clientContactName ? ` · ${project.clientContactName}` : ""}`
            : `Your role: ${reviewRoleLabel(project)}`
        }
        back={{ href: "/projects", label: "Back to Projects" }}
        action={
          <div className="flex flex-wrap gap-2">
            <ActivityLogModal activities={project.activities} />
            {delLead || revLead ? (
              <Link
                href={`/projects/${project.id}/team`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Manage People
              </Link>
            ) : null}
            {delLead ? (
              <>
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Edit Project
                </Link>
                {project.executionStatus === "ongoing" ? (
                  <form action={requestCompletion.bind(null, project.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Request Completion
                    </button>
                  </form>
                ) : project.executionStatus === "awaiting_completion" ? (
                  <span className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Awaiting client confirmation
                  </span>
                ) : null}
                {project.executionStatus === "completed" && !project.capstone?.requested ? (
                  <form action={requestCapstone.bind(null, project.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Request Capstone Endorsement
                    </button>
                  </form>
                ) : project.capstone?.requested && !project.capstone.submitted ? (
                  <span className="inline-flex items-center rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
                    Capstone endorsement requested
                  </span>
                ) : null}
              </>
            ) : null}
            {del && !isWhole ? (
              <Link
                href={`/projects/${project.id}/milestones/new`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                + Add Milestone
              </Link>
            ) : null}
            {delLead ? (
              project.visibility === "PUBLIC" ? (
                <Link
                  href={`/projects/${project.id}/public-preview`}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  View Public Page
                </Link>
              ) : project.adminStatus === "published" ? (
                <Link
                  href={`/projects/${project.id}/publish`}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Publish Project
                </Link>
              ) : project.adminStatus === "pending_approval" ? (
                <span className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Pending admin approval
                </span>
              ) : (
                <form action={submitForApproval.bind(null, project.id)}>
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Submit for approval
                  </button>
                </form>
              )
            ) : null}
          </div>
        }
      />

      {/* --- Review-side banners --- */}
      {rev && project.executionStatus === "awaiting_completion" ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">Completion requested</div>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            The delivery team has marked this project as delivered. Confirming locks the final score at{" "}
            {formatRating(perf.avgRating)}
            {perf.avgRating == null ? " (unrated)" : ""}.
          </p>
          {revLead ? (
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
              Awaiting a client lead&apos;s confirmation.
            </p>
          )}
        </div>
      ) : null}

      {rev && project.capstone?.requested && !project.capstone.submitted ? (
        <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950">
          <div className="text-sm font-semibold text-violet-800 dark:text-violet-200">
            Capstone endorsement requested
          </div>
          <p className="mt-1 text-sm text-violet-700 dark:text-violet-300">
            The delivery team has asked for a short written endorsement of the whole engagement.
          </p>
          {revLead ? (
            <Link
              href={`/projects/${id}/capstone`}
              className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Write the endorsement
            </Link>
          ) : (
            <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
              Awaiting a client lead&apos;s endorsement.
            </p>
          )}
        </div>
      ) : null}

      {/* --- Overview + performance (both sides) --- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionHeading>Project Overview</SectionHeading>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Info label="Client" value={project.clientCompanyName} />
            {del ? <Info label="Client Email" value={project.clientEmail} /> : null}
            <Info label="Services" value={project.services} />
            <Info label="Start Date" value={formatDate(project.startDate)} />
            <Info label="Expected Completion" value={formatDate(project.expectedCompletionDate)} />
            <Info label="Actual Completion" value={formatDate(project.actualCompletionDate)} />
            {del ? <Info label="Team Size" value={project.teamSize?.toString() ?? "—"} /> : null}
            {del ? <Info label="Engagement Model" value={project.engagementModel} /> : null}
            {del ? <Info label="Internal Reference" value={project.internalRef} /> : null}
          </dl>
          {project.description ? (
            <p className="mt-4 whitespace-pre-line border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
              {project.description}
            </p>
          ) : null}

          {delLead ? (
            <form
              action={setProjectStatus.bind(null, project.id)}
              className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"
            >
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Project Status</span>
              <div className="w-48">
                <Select name="status" defaultValue={project.status}>
                  {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Update
              </button>
            </form>
          ) : null}
        </Card>

        <Card className="p-5">
          <SectionHeading>Performance Summary</SectionHeading>
          <ul className="space-y-2.5 text-sm">
            <SummaryRow label="Average Milestone Rating" value={formatRating(perf.avgRating)} />
            <SummaryRow label="Number of Milestones" value={perf.totalMilestones} />
            <SummaryRow label="Milestones Reviewed" value={perf.milestonesReviewed} />
            <SummaryRow label="Milestones In Progress" value={perf.activeMilestones} />
            <SummaryRow label="Review Response Rate" value={formatPercent(perf.responseRate)} />
            <SummaryRow label="Latest Client Rating" value={formatRating(perf.latestRating)} />
            <li className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Client Satisfaction</span>
              <HealthBadge health={perf.health} />
            </li>
            {perf.satisfactionDeclined ? (
              <li className="rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                ⚠ Rating trend is declining vs. the previous milestone
              </li>
            ) : null}
          </ul>
        </Card>
      </div>

      {/* --- Milestones --- */}
      <div className="mt-6">
        <SectionHeading>Milestones</SectionHeading>
        {project.milestones.length === 0 ? (
          <EmptyState
            title="No milestones yet"
            description={
              del
                ? "Add the first milestone to start tracking this project's delivery performance."
                : "Milestones will appear here once the delivery team adds them."
            }
            actionHref={del && !isWhole ? `/projects/${project.id}/milestones/new` : undefined}
            actionLabel={del && !isWhole ? "Add Milestone" : undefined}
          />
        ) : del ? (
          <ProjectMilestoneTable projectId={project.id} milestones={project.milestones} />
        ) : (
          <div className="space-y-3">
            {project.milestones.map((m) => {
              const isReviewer = m.reviewedByUserId === user.id;
              const canEdit =
                isReviewer &&
                m.status === "reviewed" &&
                (withinCorrectionWindow(m.ratingSubmittedAt) || m.editRequestedByVendor);
              return (
                <Card key={m.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                      {m.title}
                      <MilestoneStatusBadge status={m.status} />
                      <FlagBadge flag={getMilestoneFlag(m)} />
                    </span>
                    <span className="text-xs text-slate-400">
                      {m.startDate ? `${formatDate(m.startDate)} – ` : ""}
                      Due {formatDate(m.dueDate)}
                    </span>
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
                    <MilestoneReviewForm
                      action={submitMilestoneRating.bind(null, id, m.id)}
                      submitLabel="Submit review"
                      intro="Please rate this milestone on each of the following."
                    />
                  ) : null}

                  {canEdit ? (
                    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                      {m.editRequestedByVendor ? (
                        <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          The delivery team has asked you to revisit this rating. Changing it is your call.
                        </p>
                      ) : (
                        <p className="mb-2 text-xs text-slate-400">
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

                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Attachments</div>
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
        )}
      </div>

      {project.capstone?.submitted ? (
        <div className="mt-6">
          <SectionHeading>Capstone Endorsement</SectionHeading>
          <Card className="p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="purple">{CAPSTONE_TIER_LABELS[project.capstone.tier] ?? project.capstone.tier}</Badge>
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
              <p className="text-sm italic text-slate-600 dark:text-slate-300">
                &ldquo;{project.capstone.testimonial}&rdquo;
              </p>
            ) : null}
            <div className="mt-2 text-xs text-slate-400">
              Submitted {formatDateTime(project.capstone.submittedAt)}
            </div>
          </Card>
        </div>
      ) : null}

    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-700 dark:text-slate-200">{value || "—"}</dd>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-100">{value}</span>
    </li>
  );
}
