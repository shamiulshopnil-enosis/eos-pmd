import { removeMilestoneAttachment, uploadMilestoneAttachments } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import type { Milestone } from "@/lib/types";

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Attachment list + upload form for a milestone. Rendered on both the vendor and
 * client milestone views. Either side may upload while the project is active; a
 * file can be removed by whoever uploaded it, or by a vendor owner.
 */
export default function MilestoneAttachments({
  projectId,
  milestone,
  currentUserId,
  isVendorOwner,
  canUpload,
}: {
  projectId: string;
  milestone: Milestone;
  currentUserId: string;
  isVendorOwner: boolean;
  canUpload: boolean;
}) {
  const { attachments } = milestone;

  return (
    <div>
      {attachments.length === 0 ? (
        <p className="text-sm text-slate-400">No files attached.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {attachments.map((a) => {
            const canRemove = isVendorOwner || a.uploadedByUserId === currentUserId;
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <a
                    href={`/files/milestones/${milestone.id}/${a.id}`}
                    className="block truncate font-medium text-blue-600 hover:underline"
                  >
                    {a.filename}
                  </a>
                  <div className="text-xs text-slate-400">
                    {humanSize(a.size)}
                    {a.uploadedByName || a.uploadedByEmail
                      ? ` · ${a.uploadedByName ?? a.uploadedByEmail}`
                      : ""}{" "}
                    · {formatDateTime(a.uploadedAt)}
                  </div>
                </div>
                {canRemove ? (
                  <form action={removeMilestoneAttachment.bind(null, projectId, milestone.id, a.id)}>
                    <button
                      type="submit"
                      className="shrink-0 text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                    >
                      Remove
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canUpload ? (
        <form
          action={uploadMilestoneAttachments.bind(null, projectId, milestone.id)}
          className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800"
        >
          <input
            type="file"
            name="files"
            multiple
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Upload
          </button>
          <span className="w-full text-xs text-slate-400">Up to 10 files, 15 MB each.</span>
        </form>
      ) : null}
    </div>
  );
}
