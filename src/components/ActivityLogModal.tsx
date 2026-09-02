"use client";

import { useEffect, useState } from "react";
import { ACTIVITY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { ActivityWithMilestoneName } from "@/lib/types";

// The project's activity log lives behind this button instead of taking up a
// section on the page. Opens a scrollable dialog with the full history.
export default function ActivityLogModal({
  activities,
}: {
  activities: ActivityWithMilestoneName[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <span aria-hidden>🕑</span> Activity
        {activities.length > 0 ? (
          <span className="ml-0.5 rounded-full bg-slate-200 px-1.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {activities.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Activity history"
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Activity history</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              {activities.length === 0 ? (
                <p className="text-sm text-slate-400">No activity yet.</p>
              ) : (
                <ol className="space-y-3">
                  {activities.map((a) => (
                    <li key={a.id} className="text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {ACTIVITY_LABELS[a.type] ?? a.type}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">{formatDateTime(a.createdAt)}</span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {a.message}
                        {a.milestone ? <span className="text-slate-400"> · {a.milestone.title}</span> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
