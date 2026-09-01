import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitEvaluation } from "@/lib/actions";
import { RATING_CATEGORIES, VENDOR_NAME } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { RatingInput } from "@/components/RatingInput";
import { Field, SubmitButton, TextArea, TextInput } from "@/components/form";

export default async function ClientFeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const request = await prisma.feedbackRequest.findUnique({
    where: { token },
    include: { release: { include: { project: true } } },
  });

  if (!request) notFound();
  if (request.status === "COMPLETED") redirect(`/feedback/${token}/thanks`);

  const { release } = request;
  const action = submitEvaluation.bind(null, token);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          EOS
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {VENDOR_NAME} would like your feedback
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {release.project.name} — <span className="font-medium">{release.name}</span>
        </p>
        <p className="text-xs text-slate-400">
          Delivered {formatDate(release.actualDeliveryDate ?? release.plannedDeliveryDate)}
        </p>
      </div>

      {release.clientFacingNotes ? (
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {release.clientFacingNotes}
        </div>
      ) : release.description ? (
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {release.description}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form action={action} className="space-y-6">
          <div className="space-y-5">
            {RATING_CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {cat.label}
                  {cat.required ? <span className="text-rose-500"> *</span> : <span className="text-slate-400"> (optional)</span>}
                </span>
                <RatingInput name={cat.key} required={cat.required} />
              </div>
            ))}
          </div>

          <Field label="Comments about this release" hint="Optional">
            <TextArea name="comments" rows={3} placeholder="How did this release go?" />
          </Field>

          <Field label="Your Email" required>
            <TextInput type="email" name="reviewerEmail" required defaultValue={request.clientEmail} />
          </Field>

          <SubmitButton>Submit Feedback</SubmitButton>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        This link is unique to you and this release. Your rating cannot be changed by the vendor once submitted.
      </p>
    </div>
  );
}
