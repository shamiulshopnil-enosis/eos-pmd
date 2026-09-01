import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VENDOR_NAME } from "@/lib/constants";
import { StarRating } from "@/components/ui";

export default async function ThanksPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await prisma.feedbackRequest.findUnique({
    where: { token },
    include: { release: { include: { project: true } } },
  });
  if (!request) notFound();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-950">
        ✅
      </div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Thank you for your feedback</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Your evaluation of <span className="font-medium">{request.release.name}</span> for {request.release.project.name}{" "}
        has been recorded and shared with {VENDOR_NAME}.
      </p>
      {request.overallSatisfaction != null ? (
        <div className="mt-4">
          <StarRating value={request.overallSatisfaction} size="lg" />
        </div>
      ) : null}
      <p className="mt-6 text-xs text-slate-400">You may now close this page.</p>
    </div>
  );
}
