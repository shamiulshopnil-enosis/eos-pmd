"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Badge } from "primereact/badge";
import { ACTIVITY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { ActivityWithMilestoneName } from "@/lib/types";

// The project's activity log lives behind this button. Opens a PrimeReact
// <Dialog> with the full history.
export default function ActivityLogModal({
  activities,
}: {
  activities: ActivityWithMilestoneName[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" outlined severity="secondary" className="eos-btn" icon="pi pi-history" onClick={() => setOpen(true)}>
        <span className="ml-1.5">Activity</span>
        {activities.length > 0 ? <Badge value={activities.length} severity="secondary" className="ml-1.5" /> : null}
      </Button>

      <Dialog
        header="Activity history"
        visible={open}
        onHide={() => setOpen(false)}
        className="eos-dialog w-full max-w-2xl"
        dismissableMask
      >
        {activities.length === 0 ? (
          <p className="text-sm text-ink-muted">No activity yet.</p>
        ) : (
          <ol className="divide-y divide-rule">
            {activities.map((a) => (
              <li key={a.id} className="py-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">{ACTIVITY_LABELS[a.type] ?? a.type}</span>
                  <span className="shrink-0 font-mono text-xs text-ink-muted">{formatDateTime(a.createdAt)}</span>
                </div>
                <div className="text-ink-muted">
                  {a.message}
                  {a.milestone ? <span> · {a.milestone.title}</span> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Dialog>
    </>
  );
}
