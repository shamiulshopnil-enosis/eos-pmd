import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectDetail } from "@/lib/data";
import { isVendorOwner, isVendorTeamMember } from "@/lib/permissions";
import { computeProjectPerformance, getMilestoneFlag, isMilestoneReviewed } from "@/lib/derived";
import { formatDate, formatDateTime, formatPercent, formatRating } from "@/lib/format";
import {
  PROJECT_STATUS_LABELS,
  ACTIVITY_LABELS,
  CAPSTONE_TIER_LABELS,
  MILESTONE_RATING_LABEL,
} from "@/lib/constants";
import { requestCapstone, requestCompletion, setProjectStatus, submitForApproval } from "@/lib/actions";
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
  StarRating,
} from "@/components/ui";
import { Select } from "@/components/form";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("vendor");

  const project = await getProjectDetail(id);
  if (!project || !isVendorTeamMember(user, project)) notFound();

  const perf = computeProjectPerformance(project);
  const reviewedMilestones = project.milestones.filter(isMilestoneReviewed);
  const isWhole = project.projectType === "whole";
  const isOwner = isVendorOwner(user, project);

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
        description={`${project.clientCompanyName}${project.clientContactName ? ` · ${project.clientContactName}` : ""}`}
        back={{ href: "/projects", label: "Back to Projects" }}
        action={
          <div className="flex flex-wrap gap-2">
            {isOwner ? (
              <>
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Edit Project
                </Link>
                <Link
                  href={`/projects/${project.id}/team`}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Manage Team
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
            {isWhole ? null : (
              <Link
                href={`/projects/${project.id}/milestones/new`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                + Add Milestone
              </Link>
            )}
            {!isOwner ? null : project.visibility === "PUBLIC" ? (
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
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionHeading>Project Overview</SectionHeading>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Info label="Client" value={project.clientCompanyName} />
            <Info label="Client Email" value={project.clientEmail} />
            <Info label="Services" value={project.services} />
            <Info label="Start Date" value={formatDate(project.startDate)} />
            <Info label="Expected Completion" value={formatDate(project.expectedCompletionDate)} />
            <Info label="Actual Completion" value={formatDate(project.actualCompletionDate)} />
            <Info label="Team Size" value={project.teamSize?.toString() ?? "—"} />
            <Info label="Engagement Model" value={project.engagementModel} />
            <Info label="Internal Reference" value={project.internalRef} />
          </dl>
          {project.description ? (
            <p className="mt-4 whitespace-pre-line border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
              {project.description}
            </p>
          ) : null}

          {isOwner ? (
            <form action={setProjectStatus.bind(null, project.id)} className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
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
              <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
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

      <div className="mt-6">
        <SectionHeading>Milestones</SectionHeading>
        {project.milestones.length === 0 ? (
          <EmptyState
            title="No milestones added yet"
            description="Add the first milestone to start tracking this project's delivery performance."
            actionHref={isWhole ? undefined : `/projects/${project.id}/milestones/new`}
            actionLabel={isWhole ? undefined : "Add Milestone"}
          />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Milestone</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Target Date</th>
                  <th className="px-4 py-3 font-medium">Reviewed</th>
                  <th className="px-4 py-3 font-medium text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {project.milestones.map((milestone) => (
                  <tr key={milestone.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${project.id}/milestones/${milestone.id}`} className="font-medium text-blue-600 hover:underline">
                        {milestone.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <MilestoneStatusBadge status={milestone.status} />
                        <FlagBadge flag={getMilestoneFlag(milestone)} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(milestone.targetDate)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(milestone.reviewedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {isMilestoneReviewed(milestone) ? (
                        <StarRating value={milestone.rating} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <SectionHeading>Client Review History</SectionHeading>
          {reviewedMilestones.length === 0 ? (
            <EmptyState title="No client ratings yet" description="Send a milestone for client review to start measuring client satisfaction." />
          ) : (
            <div className="space-y-3">
              {reviewedMilestones.map((milestone) => (
                <Card key={milestone.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{milestone.title}</span>
                    <StarRating value={milestone.rating} />
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{MILESTONE_RATING_LABEL}</div>
                  {milestone.comment ? (
                    <p className="mt-2 text-sm italic text-slate-600 dark:text-slate-300">&ldquo;{milestone.comment}&rdquo;</p>
                  ) : null}
                  <div className="mt-2 text-xs text-slate-400">Reviewed {formatDateTime(milestone.reviewedAt)}</div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHeading>Activity History</SectionHeading>
          <Card className="p-4">
            {project.activities.length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet.</p>
            ) : (
              <ol className="space-y-3">
                {project.activities.map((a) => (
                  <li key={a.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{ACTIVITY_LABELS[a.type] ?? a.type}</span>
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
