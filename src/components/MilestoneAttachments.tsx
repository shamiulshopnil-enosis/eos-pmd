"use client";

import { Button } from "primereact/button";
import { removeMilestoneAttachment, uploadMilestoneAttachments } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import type { Milestone } from "@/lib/types";
import { Icon } from "@/components/icon";
import { FileInput } from "@/components/form";
import { ActionForm } from "@/components/ActionForm";

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Attachment list + upload form for a milestone. Either side may upload while
 * the project is active; a file can be removed by whoever uploaded it, or by a
 * vendor owner. Buttons are PrimeReact <Button>; the file field stays a native
 * input so the server action reads it from FormData.
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
        <p className="text-sm text-ink-muted">No files attached.</p>
      ) : (
        <ul className="divide-y divide-rule text-sm">
          {attachments.map((a) => {
            const canRemove = isVendorOwner || a.uploadedByUserId === currentUserId;
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <a
                    href={`/files/milestones/${milestone.id}/${a.id}`}
                    className="flex items-center gap-1.5 truncate font-medium text-link hover:text-link-strong hover:underline"
                  >
                    <Icon name="attach_file" className="shrink-0 text-[13px]" />
                    <span className="truncate">{a.filename}</span>
                  </a>
                  <div className="mt-0.5 font-mono text-xs text-ink-muted">
                    {humanSize(a.size)}
                    {a.uploadedByName || a.uploadedByEmail ? ` · ${a.uploadedByName ?? a.uploadedByEmail}` : ""} ·{" "}
                    {formatDateTime(a.uploadedAt)}
                  </div>
                </div>
                {canRemove ? (
                  <ActionForm
                    action={removeMilestoneAttachment.bind(null, projectId, milestone.id, a.id)}
                    success="File removed."
                  >
                    <Button type="submit" text severity="danger" size="small" icon="pi pi-trash" label="Remove" />
                  </ActionForm>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canUpload ? (
        <ActionForm
          action={uploadMilestoneAttachments.bind(null, projectId, milestone.id)}
          success="Files uploaded."
          className="mt-3 flex flex-wrap items-center gap-3 border-t border-rule pt-3"
        >
          <FileInput name="files" multiple className="max-w-sm" />
          <Button type="submit" size="small" icon="pi pi-upload" label="Upload" />
          <span className="w-full text-xs text-ink-muted">Up to 10 files, 15 MB each.</span>
        </ActionForm>
      ) : null}
    </div>
  );
}
