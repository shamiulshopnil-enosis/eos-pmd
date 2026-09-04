"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Field, TextArea } from "@/components/form";
import { ActionForm } from "@/components/ActionForm";

type Assignee = { name: string | null; email: string };

function RejectSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" severity="danger" loading={pending} icon="pi pi-times-circle" label="Reject milestone" />
  );
}

/**
 * Client-side control for rejecting a milestone that is with the client for
 * review. Collapsed to a single link; expands to a reason box and an optional
 * "email the assignee(s)" note. Posts plain FormData to `action`
 * (rejectMilestone) — fields: `reason`, `notifyAssignees`, `message`.
 */
export default function MilestoneRejectForm({
  action,
  assignees,
}: {
  action: (formData: FormData) => void | Promise<void>;
  assignees: Assignee[];
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState("");
  const [messageDirty, setMessageDirty] = useState(false);

  const names = assignees.map((a) => a.name ?? a.email).join(", ");
  // Until the vendor edits the note, it tracks the reason.
  const effectiveMessage = messageDirty ? message : reason;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-sm font-medium text-rag-bad hover:underline"
      >
        Reject this milestone instead
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-ledger border border-rule bg-[var(--rag-bad-bg)] p-4">
      <div className="mb-2 text-sm font-semibold text-ink">Reject this milestone</div>
      <p className="mb-3 text-xs text-ink-muted">
        It goes back to the delivery team as <span className="font-medium">Rejected</span>. They can revise it and
        send it again. No rating is recorded.
      </p>
      <ActionForm
        action={action}
        success={
          notify && assignees.length > 0
            ? "Milestone rejected. The assignees have been emailed."
            : "Milestone rejected."
        }
        className="space-y-3"
      >
        <Field
          label="Reason for rejection"
          required
          hint="The delivery team sees this. At least 10 characters."
        >
          <TextArea
            name="reason"
            required
            minLength={10}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What was wrong with the delivery? What needs to change?"
          />
        </Field>

        {assignees.length > 0 ? (
          <div className="rounded-ledger border border-rule bg-panel p-3">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                inputId="notifyAssignees"
                checked={notify}
                onChange={(e) => setNotify(!!e.checked)}
              />
              <span className="text-ink">
                Email the assignee{assignees.length > 1 ? "s" : ""}
                <span className="text-ink-muted">: {names}</span>
                <span className="text-ink-muted"> and the delivery lead</span>
              </span>
            </label>
            <input type="hidden" name="notifyAssignees" value={notify ? "on" : ""} />
            {notify ? (
              <div className="mt-3">
                <TextArea
                  name="message"
                  rows={2}
                  value={effectiveMessage}
                  onChange={(e) => {
                    setMessageDirty(true);
                    setMessage(e.target.value);
                  }}
                  placeholder="Optional note to the assignees. The reason above is included automatically."
                />
                <p className="mt-1 text-xs text-ink-muted">
                  This prototype logs the email to the server console rather than sending it.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <input type="hidden" name="notifyAssignees" value="" />
        )}

        <div className="flex items-center gap-2 pt-1">
          <RejectSubmit />
          <Button type="button" text severity="secondary" label="Cancel" onClick={() => setOpen(false)} />
        </div>
      </ActionForm>
    </div>
  );
}
