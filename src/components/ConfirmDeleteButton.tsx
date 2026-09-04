"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { toastError, toastSuccess } from "@/components/toast";

function isRedirect(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    ((e as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (e as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}

/**
 * A red, standalone "Delete …" trigger that opens a confirm dialog before
 * running the server action — the same guard `ProjectActionsMenu` gives
 * "Delete project", generalised for a button that isn't tucked in an
 * overflow menu (e.g. the milestone page's header action row).
 */
export function ConfirmDeleteButton({
  label,
  icon = "pi pi-trash",
  action,
  success,
  confirmTitle,
  confirmBody,
  confirmLabel = "Delete",
}: {
  label: string;
  icon?: string;
  action: () => void | Promise<void>;
  /** Shown on success. Omit when the action redirects away (the navigation
   *  itself is the confirmation — see "Delete project"). */
  success?: string;
  confirmTitle: string;
  confirmBody: string;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      await action();
      if (success) toastSuccess(success);
      setOpen(false);
    } catch (e) {
      if (isRedirect(e)) throw e;
      toastError("Something went wrong. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        severity="danger"
        icon={icon}
        label={label}
        onClick={() => setOpen(true)}
        className="eos-btn"
      />
      <Dialog
        visible={open}
        onHide={() => !running && setOpen(false)}
        header={confirmTitle}
        className="eos-dialog w-full max-w-md"
        dismissableMask={!running}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              text
              severity="secondary"
              label="Cancel"
              disabled={running}
              onClick={() => setOpen(false)}
            />
            <Button type="button" severity="danger" label={confirmLabel} loading={running} onClick={run} />
          </div>
        }
      >
        <p className="text-sm text-ink-muted">{confirmBody}</p>
      </Dialog>
    </>
  );
}
