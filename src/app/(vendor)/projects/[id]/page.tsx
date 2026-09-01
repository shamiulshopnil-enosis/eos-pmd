import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectDetail } from "@/lib/data";
import { computeProjectPerformance, getReleaseFlag, isEvaluationComplete } from "@/lib/derived";
import { formatDate, formatDateTime, formatPercent, formatRating } from "@/lib/format";
import { PROJECT_STATUS_LABELS, ACTIVITY_LABELS, RATING_CATEGORIES } from "@/lib/constants";
import { setProjectStatus } from "@/lib/actions";
import {
  Badge,
  Card,
  EmptyState,
  FlagBadge,
  HealthBadge,
  PageHeader,
  ProjectStatusBadge,
  ReleaseStatusBadge,
  SectionHeading,
  StarRating,
} from "@/components/ui";
import { Select } from "@/components/form";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = await getProjectDetail(id);

  if (!project) notFound();

  const perf = computeProjectPerformance(project);
  const evaluatedReleases = project.releases.filter((r) => isEvaluationComplete(r.feedbackRequest));

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {project.name}
            <ProjectStatusBadge status={project.status} />
            <Badge tone={project.visibility === "PUBLIC" ? "blue" : "slate"}>
              {project.visibility === "PUBLIC" ? "Public" : "Private"}
            </Badge>
          </span>
        }
        description={`${project.clientCompanyName}${project.clientContactName ? ` · ${project.clientContactName}` : ""}`}
        back={{ href: "/projects", label: "Back to Projects" }}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${project.id}/edit`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Edit Project
            </Link>
            <Link
              href={`/projects/${project.id}/releases/new`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              + Add Release
            </Link>
            {project.visibility === "PUBLIC" ? (
              <Link
                href={`/projects/${project.id}/public-preview`}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                View Public Page
              </Link>
            ) : (
              <Link
                href={`/projects/${project.id}/publish`}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Publish Project
              </Link>
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
        </Card>

        <Card className="p-5">
          <SectionHeading>Performance Summary</SectionHeading>
          <ul className="space-y-2.5 text-sm">
            <SummaryRow label="Average Release Rating" value={formatRating(perf.avgRating)} />
            <SummaryRow label="Number of Releases" value={perf.totalReleases} />
            <SummaryRow label="Releases Completed" value={perf.releasesCompleted} />
            <SummaryRow label="Releases In Progress" value={perf.activeReleases} />
            <SummaryRow label="Feedback Response Rate" value={formatPercent(perf.responseRate)} />
            <SummaryRow label="Latest Client Rating" value={formatRating(perf.latestRating)} />
            <li className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Client Satisfaction</span>
              <HealthBadge health={perf.health} />
            </li>
            {perf.satisfactionDeclined ? (
              <li className="rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                ⚠ Rating trend is declining vs. the previous release
              </li>
            ) : null}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <SectionHeading>Releases</SectionHeading>
        {project.releases.length === 0 ? (
          <EmptyState
            title="No releases added yet"
            description="Add the first release to start tracking this project's delivery performance."
            actionHref={`/projects/${project.id}/releases/new`}
            actionLabel="Add Release"
          />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Release</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Planned Delivery</th>
                  <th className="px-4 py-3 font-medium">Actual Delivery</th>
                  <th className="px-4 py-3 font-medium">Feedback</th>
                  <th className="px-4 py-3 font-medium text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {project.releases.map((release) => (
                  <tr key={release.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${project.id}/releases/${release.id}`} className="font-medium text-blue-600 hover:underline">
                        {release.name}
                      </Link>
                      {release.versionLabel ? <span className="ml-2 text-xs text-slate-400">{release.versionLabel}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ReleaseStatusBadge status={release.status} />
                        <FlagBadge flag={getReleaseFlag(release)} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(release.plannedDeliveryDate)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(release.actualDeliveryDate)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {release.feedbackRequest?.status === "COMPLETED"
                        ? "Completed"
                        : release.feedbackRequest?.status === "PENDING"
                          ? "Pending"
                          : "Not requested"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEvaluationComplete(release.feedbackRequest) ? (
                        <StarRating value={release.feedbackRequest.overallSatisfaction} />
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <SectionHeading>Client Feedback History</SectionHeading>
          {evaluatedReleases.length === 0 ? (
            <EmptyState title="No client ratings yet" description="Request feedback after delivering a release to start measuring client satisfaction." />
          ) : (
            <div className="space-y-3">
              {evaluatedReleases.map((release) => {
                const fr = release.feedbackRequest!;
                return (
                  <Card key={release.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{release.name}</span>
                      <StarRating value={fr.overallSatisfaction} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 sm:grid-cols-3 dark:text-slate-400">
                      {RATING_CATEGORIES.filter((c) => c.key !== "overallSatisfaction").map((c) => {
                        const value = fr[c.key as keyof typeof fr] as number | null;
                        if (value == null) return null;
                        return (
                          <span key={c.key}>
                            {c.label}: <strong className="text-slate-700 dark:text-slate-200">{value}/5</strong>
                          </span>
                        );
                      })}
                    </div>
                    {fr.comments ? <p className="mt-2 text-sm italic text-slate-600 dark:text-slate-300">“{fr.comments}”</p> : null}
                    <div className="mt-2 text-xs text-slate-400">
                      {fr.reviewerEmail} · {formatDateTime(fr.completedAt)}
                    </div>
                  </Card>
                );
              })}
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
                      {a.release ? <span className="text-slate-400"> · {a.release.name}</span> : null}
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
