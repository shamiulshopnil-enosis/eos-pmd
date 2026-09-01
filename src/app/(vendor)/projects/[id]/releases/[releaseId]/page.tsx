import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getReleaseFlag } from "@/lib/derived";
import { formatDate, formatDateTime } from "@/lib/format";
import { RATING_CATEGORIES, RELEASE_STATUS_LABELS } from "@/lib/constants";
import { requestFeedback, resendFeedback, setReleaseStatus } from "@/lib/actions";
import { Card, FlagBadge, PageHeader, ReleaseStatusBadge, SectionHeading, StarRating } from "@/components/ui";
import { Field, Select, SubmitButton, TextInput } from "@/components/form";

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string; releaseId: string }>;
}) {
  const { id, releaseId } = await params;

  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: { feedbackRequest: true, project: true },
  });

  if (!release || release.projectId !== id) notFound();

  const flag = getReleaseFlag(release);
  const fr = release.feedbackRequest;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {release.name}
            <ReleaseStatusBadge status={release.status} />
            <FlagBadge flag={flag} />
          </span>
        }
        description={`Project — ${release.project.name}`}
        back={{ href: `/projects/${release.projectId}`, label: "Back to Project" }}
        action={
          <Link
            href={`/projects/${release.projectId}/releases/${release.id}/edit`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Edit Release
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionHeading>Release Details</SectionHeading>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Info label="Version" value={release.versionLabel} />
            <Info label="Start Date" value={formatDate(release.startDate)} />
            <Info label="Planned Delivery" value={formatDate(release.plannedDeliveryDate)} />
            <Info label="Actual Delivery" value={formatDate(release.actualDeliveryDate)} />
            <Info label="Team Size" value={release.teamSize?.toString()} />
            <Info label="Demo URL" value={release.demoUrl} />
          </dl>

          {release.description ? <TextBlock label="Description" value={release.description} /> : null}
          {release.objectives ? <TextBlock label="Objectives" value={release.objectives} /> : null}
          {release.deliverables ? <TextBlock label="Deliverables" value={release.deliverables} /> : null}
          {release.clientFacingNotes ? <TextBlock label="Client-facing Notes" value={release.clientFacingNotes} /> : null}
          {release.internalNotes ? (
            <TextBlock label="Internal Notes (private — never shown to client)" value={release.internalNotes} tone="internal" />
          ) : null}

          <form action={setReleaseStatus.bind(null, release.projectId, release.id)} className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Release Status</span>
            <div className="w-56">
              <Select name="status" defaultValue={release.status}>
                {Object.entries(RELEASE_STATUS_LABELS).map(([value, label]) => (
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

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeading>Client Feedback</SectionHeading>

            {!fr ? (
              <form action={requestFeedback.bind(null, release.projectId, release.id)} className="space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Send a secure, single-use evaluation link to the client for this release.
                </p>
                <Field label="Client Email" required>
                  <TextInput type="email" name="clientEmail" required defaultValue={release.project.clientEmail} />
                </Field>
                <SubmitButton>Request Client Feedback</SubmitButton>
              </form>
            ) : fr.status === "PENDING" ? (
              <div className="space-y-3 text-sm">
                <p className="text-slate-600 dark:text-slate-300">
                  Pending response from <strong>{fr.clientEmail}</strong>
                </p>
                <p className="text-xs text-slate-400">
                  Sent {formatDateTime(fr.sentAt)}
                  {fr.remindersSent > 0 ? ` · ${fr.remindersSent} reminder${fr.remindersSent === 1 ? "" : "s"} sent` : ""}
                </p>
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 text-xs break-all dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-1 text-slate-400">Secure evaluation link (simulates the email invitation):</div>
                  <Link href={`/feedback/${fr.token}`} className="text-blue-600 hover:underline">
                    /feedback/{fr.token}
                  </Link>
                </div>
                <form action={resendFeedback.bind(null, release.projectId, release.id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Resend Feedback Request
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Overall Satisfaction</span>
                  <StarRating value={fr.overallSatisfaction} />
                </div>
                <ul className="space-y-1 text-sm">
                  {RATING_CATEGORIES.filter((c) => c.key !== "overallSatisfaction").map((c) => {
                    const value = fr[c.key as keyof typeof fr] as number | null;
                    if (value == null) return null;
                    return (
                      <li key={c.key} className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">{c.label}</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{value}/5</span>
                      </li>
                    );
                  })}
                </ul>
                {fr.comments ? (
                  <blockquote className="rounded-lg bg-slate-50 p-3 text-sm italic text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    “{fr.comments}”
                  </blockquote>
                ) : null}
                <div className="text-xs text-slate-400">
                  {fr.reviewerEmail} · submitted {formatDateTime(fr.completedAt)}
                  {fr.verified ? " · Verified" : ""}
                </div>
              </div>
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

function TextBlock({ label, value, tone }: { label: string; value: string; tone?: "internal" }) {
  return (
    <div className={`mt-4 whitespace-pre-line border-t border-slate-100 pt-4 text-sm dark:border-slate-800 ${tone === "internal" ? "text-amber-700 dark:text-amber-300" : "text-slate-600 dark:text-slate-300"}`}>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      {value}
    </div>
  );
}
