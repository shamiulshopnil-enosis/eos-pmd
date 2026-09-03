"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Badge } from "primereact/badge";
import { ACTIVITY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { ActivityWithMilestoneName } from "@/lib/types";

// The project's activity log. Uncontrolled by default (renders its own
// "Activity" button); pass `open` + `onOpenChange` to drive it from elsewhere
// (e.g. a "More actions" menu item), in which case no trigger button renders.
export default function ActivityLogModal({
  activities,
  open: controlledOpen,
  onOpenChange,
}: {
  activities: ActivityWithMilestoneName[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (v: boolean) => (isControlled ? onOpenChange?.(v) : setUncontrolledOpen(v));

  return (
    <>
      {!isControlled ? (
        <Button type="button" outlined severity="secondary" className="eos-btn" icon="pi pi-history" onClick={() => setOpen(true)}>
          <span className="ml-1.5">Activity</span>
          {activities.length > 0 ? <Badge value={activities.length} severity="secondary" className="ml-1.5" /> : null}
        </Button>
      ) : null}

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
